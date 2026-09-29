import { validateContact } from "../backend/validation.mjs";
import { json, readJson, unavailable } from "./http.ts";
import type { ContactEnv } from "./types.ts";
import { providerName, FREE_WINDOW, FREE_ATTEMPTS } from "./provider.ts";

export const DAY = 86400000;
export const HEARTBEAT_MAX_AGE = 5 * 60000;

function configuration(env: ContactEnv) {
  const days = Number(env.RETENTION_DAYS || 7);
  const origin = new URL(env.PUBLIC_ORIGIN || "http://localhost:8088");
  if (
    env.CONTACT_ENABLED !== "true" ||
    !env.CONTACT_DB ||
    !env.RATE_LIMIT_SALT ||
    env.RATE_LIMIT_SALT.length < 32 ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 30 ||
    !env.PUBLIC_ORIGIN ||
    !["formcarry", "cloudflare"].includes(providerName(env)) ||
    origin.origin !== env.PUBLIC_ORIGIN ||
    !["http:", "https:"].includes(origin.protocol)
  )
    throw Error("Contact configuration unavailable");
  return { days, origin: origin.origin };
}

async function workerReady(db: D1Database, now: number, provider: string) {
  const row = await db
    .prepare(
      "SELECT last_tick, provider, blocked_until FROM worker_state WHERE id=1",
    )
    .first<{ last_tick: number; provider: string; blocked_until: number }>();
  return (
    row &&
    row.provider === provider &&
    row.blocked_until <= now &&
    row.last_tick <= now &&
    now - row.last_tick <= HEARTBEAT_MAX_AGE
  );
}

async function freeCapacity(db: D1Database, now: number) {
  const used = await db
    .prepare(
      `SELECT
    (SELECT COUNT(*) FROM delivery_attempts WHERE created>?) +
    (SELECT COUNT(*) FROM inquiries WHERE status!='failed') AS used`,
    )
    .bind(now - FREE_WINDOW)
    .first<number>("used");
  return (used ?? FREE_ATTEMPTS) < FREE_ATTEMPTS;
}

export async function config(
  request: Request,
  env: ContactEnv,
  now = Date.now(),
) {
  if (request.method !== "GET")
    return json({ message: "Use GET." }, 405, { Allow: "GET" });
  try {
    const { days } = configuration(env);
    if (!(await workerReady(env.CONTACT_DB, now, providerName(env))))
      return unavailable();
    if (
      providerName(env) === "formcarry" &&
      !(await freeCapacity(env.CONTACT_DB, now))
    )
      return unavailable();
    return json({ mode: "email", retentionDays: days });
  } catch {
    return unavailable();
  }
}

async function consumeLimit(
  db: D1Database,
  key: string,
  expires: number,
  max: number,
) {
  return db
    .prepare(
      `INSERT INTO rate_limits (key,hits,expires) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits < ? RETURNING hits`,
    )
    .bind(key, expires, max)
    .first();
}

async function addressKey(ip: string, salt: string, hour: number) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${ip}:${hour}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function contact(
  request: Request,
  env: ContactEnv,
  now = Date.now(),
) {
  if (request.method !== "POST")
    return json({ message: "Use POST." }, 405, { Allow: "POST" });
  try {
    const { days, origin } = configuration(env);
    if (
      request.headers.get("Origin") !== origin ||
      new URL(request.url).origin !== origin
    )
      return json(
        { message: "This form must be submitted from the portfolio website." },
        403,
      );
    if (
      request.headers
        .get("Content-Type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      return json({ message: "Send JSON content." }, 415);
    // Cloudflare supplies this header. Never trust visitor X-Forwarded-For.
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip) return unavailable();
    const db = env.CONTACT_DB;
    const day = Math.floor(now / DAY);
    // Bound daily work even when sources are distributed. Saturated limits do no writes.
    if (!(await consumeLimit(db, `global:${day}`, (day + 1) * DAY, 1000)))
      return json(
        {
          message:
            "Today's contact limit has been reached. Please use LinkedIn.",
        },
        429,
        { "Retry-After": String(Math.ceil(((day + 1) * DAY - now) / 1000)) },
      );
    const hour = Math.floor(now / 3600000);
    if (
      !(await consumeLimit(
        db,
        await addressKey(ip, env.RATE_LIMIT_SALT!, hour),
        (hour + 1) * 3600000,
        5,
      ))
    )
      return json(
        {
          message:
            "Too many attempts. Please try again in an hour or use LinkedIn.",
        },
        429,
        { "Retry-After": "3600" },
      );
    if (!(await workerReady(db, now, providerName(env)))) return unavailable();
    const body = await readJson(request);
    if (body.error) return body.error;
    const result = validateContact(body.data, now);
    if (result.errors)
      return json(
        {
          message: result.errors.form || "Please check the highlighted fields.",
          errors: result.errors,
        },
        400,
      );
    const id = crypto.randomUUID();
    // A single write statement makes capacity enforcement and persistence atomic.
    const inserted = await db
      .prepare(
        `INSERT INTO inquiries (id,payload,created,expires_at,next_attempt)
      SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM inquiries) < 1000
      AND (? != 'formcarry' OR
        (SELECT COUNT(*) FROM delivery_attempts WHERE created>?) +
        (SELECT COUNT(*) FROM inquiries WHERE status!='failed') < ?)
      RETURNING id`,
      )
      .bind(
        id,
        JSON.stringify(result.data),
        now,
        now + days * DAY,
        now,
        providerName(env),
        now - FREE_WINDOW,
        FREE_ATTEMPTS,
      )
      .first();
    if (!inserted)
      return json(
        {
          message: "The contact form is temporarily full. Please use LinkedIn.",
        },
        503,
      );
    return json(
      {
        id,
        mode: "email",
        message:
          "Your inquiry has been queued for email delivery. This is not a delivery confirmation.",
      },
      202,
    );
  } catch {
    // Do not log form content, addresses, secret values, or database exceptions.
    return unavailable();
  }
}
