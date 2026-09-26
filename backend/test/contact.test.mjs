import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateContact } from "../validation.mjs";
import { openStore } from "../store.mjs";
import { createApp } from "../app.mjs";
import { deliverPending } from "../delivery.mjs";
const synthetic = {
  name: "Synthetic Tester",
  email: "synthetic@example.invalid",
  message: "Synthetic inquiry for automated testing only.",
  kind: "hiring",
  phone: "",
  website: "",
  startedAt: Date.now() - 5000,
};
test("server validation rejects hostile and invalid inputs; untrusted text stays plain", () => {
  assert.ok(validateContact({ ...synthetic, email: "bad" }).errors.email);
  assert.ok(
    validateContact({ ...synthetic, message: "x".repeat(5001) }).errors.message,
  );
  assert.ok(
    validateContact({ ...synthetic, name: "bad\nBcc: other@example.com" })
      .errors.name,
  );
  assert.ok(
    validateContact({ ...synthetic, projectLink: "javascript:alert(1)" }).errors
      .projectLink,
  );
  assert.ok(validateContact({ ...synthetic, website: "spam" }).errors.website);
  assert.ok(
    validateContact({ ...synthetic, startedAt: Date.now() }).errors.form,
  );
  assert.equal(
    validateContact({ ...synthetic, message: '<script>alert("test")</script>' })
      .data.message,
    '<script>alert("test")</script>',
  );
  assert.equal(
    validateContact({ ...synthetic, projectType: "ignored" }).data.projectType,
    "",
  );
});
test("persistent rate limiting, expiry, and queue survive reopening", () => {
  const dir = mkdtempSync(join(tmpdir(), "portfolio-test-"));
  const path = join(dir, "test.sqlite");
  let store = openStore(path);
  const id = store.add(synthetic, "local");
  for (let i = 0; i < 5; i++)
    assert.equal(store.limit("test-ip", "salt", 1000), true);
  assert.equal(store.limit("test-ip", "salt", 1000), false);
  store.close();
  store = openStore(path);
  assert.equal(store.count(), 1);
  assert.equal(store.limit("test-ip", "salt", 1000), false);
  assert.equal(store.limit("test-ip", "salt", 3600001), true);
  store.db.prepare("UPDATE inquiries SET created=0 WHERE id=?").run(id);
  store.prune();
  assert.equal(store.count(), 0);
  store.close();
  rmSync(dir, { recursive: true });
});
test("SMTP retries failures and deletes payload only after provider acceptance", async () => {
  const store = openStore(":memory:");
  const id = store.add(synthetic, "smtp");
  await deliverPending(
    store,
    {
      sendMail: async () => {
        throw Error("synthetic failure");
      },
    },
    { from: "test@example.invalid", to: "owner@example.invalid" },
  );
  assert.equal(store.count(), 1);
  assert.equal(
    store.db.prepare("SELECT attempts FROM inquiries").get().attempts,
    1,
  );
  store.db.prepare("UPDATE inquiries SET next_attempt=0").run();
  let mail;
  await deliverPending(
    store,
    {
      sendMail: async (value) => {
        mail = value;
        return { accepted: ["owner@example.invalid"] };
      },
    },
    { from: "test@example.invalid", to: "owner@example.invalid" },
  );
  assert.equal(store.count(), 0);
  assert.equal(mail.html, undefined);
  assert.ok(mail.messageId.includes(id));
  assert.equal(mail.replyTo, synthetic.email);
  store.close();
});
test("HTTP rejects cross-origin, malformed and over-limit requests; local acceptance is truthful", async () => {
  const store = openStore(":memory:");
  const app = createApp({
    store,
    mode: "local",
    origin: "http://localhost:8080",
    salt: "synthetic-salt",
    retentionDays: 7,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(url + "/api/health")).status, 200);
    assert.equal(
      (
        await fetch(url + "/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(synthetic),
        })
      ).status,
      403,
    );
    const headers = {
      "Content-Type": "application/json",
      Origin: "http://localhost:8080",
    };
    const response = await fetch(url + "/api/contact", {
      method: "POST",
      headers,
      body: JSON.stringify(synthetic),
    });
    assert.equal(response.status, 202);
    assert.match((await response.json()).message, /No email was sent/);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(
      (
        await fetch(url + "/api/contact", {
          method: "POST",
          headers,
          body: "{",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(url + "/api/contact", {
          method: "POST",
          headers,
          body: JSON.stringify({ ...synthetic, message: "x".repeat(20000) }),
        })
      ).status,
      413,
    );
    for (let i = 0; i < 2; i++)
      await fetch(url + "/api/contact", {
        method: "POST",
        headers,
        body: JSON.stringify(synthetic),
      });
    assert.equal(
      (
        await fetch(url + "/api/contact", {
          method: "POST",
          headers,
          body: JSON.stringify(synthetic),
        })
      ).status,
      429,
    );
    assert.equal((await fetch(url + "/data/contact.sqlite")).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  }
});
