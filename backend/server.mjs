import nodemailer from "nodemailer";
import { openStore } from "./store.mjs";
import { createApp } from "./app.mjs";
import { deliverPending } from "./delivery.mjs";
process.umask(0o077);
const env = process.env;
const mode = env.CONTACT_MODE || "local";
if (!["local", "smtp"].includes(mode))
  throw Error("CONTACT_MODE must be local or smtp.");
const retentionDays = Number(env.RETENTION_DAYS || 7);
if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 30)
  throw Error("RETENTION_DAYS must be 1–30.");
const origin = new URL(env.PUBLIC_ORIGIN || "http://localhost:8088").origin;
const salt = env.RATE_LIMIT_SALT || "local-only-change-before-publishing";
if (
  mode === "smtp" &&
  (salt.length < 32 || salt === "local-only-change-before-publishing")
)
  throw Error("Set a random RATE_LIMIT_SALT before using SMTP.");
let transport;
if (mode === "smtp") {
  for (const key of [
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
    "MAIL_FROM",
    "MAIL_TO",
  ])
    if (!env[key]) throw Error(`Missing ${key}.`);
  transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === "true",
    requireTLS: env.SMTP_SECURE !== "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10000,
    socketTimeout: 20000,
    logger: false,
    debug: false,
  });
}
const store = openStore(env.DB_PATH || "/data/contact.sqlite", retentionDays);
store.prune();
const app = createApp({ store, mode, origin, salt, retentionDays });
let working = false;
async function tick() {
  if (working) return;
  working = true;
  try {
    store.prune();
    if (transport)
      await deliverPending(store, transport, {
        from: env.MAIL_FROM,
        to: env.MAIL_TO,
      });
  } catch {
    console.error("Queue maintenance failed; inspect service health.");
  } finally {
    working = false;
  }
}
const timer = setInterval(tick, 30000);
timer.unref();
const server = app.listen(3001, "0.0.0.0", () =>
  console.log(`Contact API ready (${mode} mode).`),
);
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    server.close(async () => {
      while (working) await new Promise((r) => setTimeout(r, 50));
      transport?.close();
      store.close();
      process.exit(0);
    });
  });
