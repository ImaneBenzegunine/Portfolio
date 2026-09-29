import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { contact, config, DAY } from "../contact.ts";
import { deliverOne } from "../delivery.ts";
import { onRequest as unknownRoute } from "../../functions/api/[[path]].ts";
import type { ContactEnv, DeliveryEnv, Inquiry, OwnerEmail } from "../types.ts";

const now = Date.UTC(2026, 8, 27, 12, 10);
const origin = "https://portfolio-test.pages.dev";
const payload = {
  name: "Synthetic Tester",
  email: "visitor@example.invalid",
  kind: "hiring",
  message: "Synthetic inquiry for automated testing only.",
  website: "",
  startedAt: now - 5000,
};
let mf: Miniflare;
let db: D1Database;
let env: ContactEnv;
let delivery: DeliveryEnv;
let sent: OwnerEmail[];

before(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "contact-test",
          modules: true,
          script: "export default { fetch() { return new Response('test'); } }",
          compatibilityDate: "2026-09-27",
          d1Databases: ["CONTACT_DB"],
        },
      ],
    }),
  );
  db = (await mf.getD1Database("CONTACT_DB")) as unknown as D1Database;
  let sql = await readFile(
    new URL("../migrations/0001_contact.sql", import.meta.url),
    "utf8",
  );
  sql += await readFile(
    new URL("../migrations/0002_formcarry.sql", import.meta.url),
    "utf8",
  );
  await db.batch(
    sql
      .split(";")
      .filter((s) => s.trim())
      .map((s) => db.prepare(s)),
  );
});
after(async () => {
  await mf?.dispose();
});
beforeEach(async () => {
  await db.batch(
    ["inquiries", "rate_limits", "worker_state", "delivery_attempts"].map(
      (table) => db.prepare(`DELETE FROM ${table}`),
    ),
  );
  await db
    .prepare("INSERT INTO worker_state (id,last_tick) VALUES (1,?)")
    .bind(now)
    .run();
  env = {
    CONTACT_DB: db,
    DELIVERY_PROVIDER: "cloudflare",
    CONTACT_ENABLED: "true",
    PUBLIC_ORIGIN: origin,
    RATE_LIMIT_SALT: "synthetic-salt-only-32-characters-minimum",
    RETENTION_DAYS: "7",
  };
  sent = [];
  delivery = {
    CONTACT_DB: db,
    DELIVERY_PROVIDER: "cloudflare",
    DELIVERY_ENABLED: "true",
    MAIL_FROM: "sender@example.invalid",
    MAIL_TO: "owner@example.invalid",
    EMAIL: {
      send: async (mail: OwnerEmail) => {
        sent.push(mail);
        return { messageId: "synthetic-provider-id" };
      },
    } as DeliveryEnv["EMAIL"],
  };
});

function request(
  body: unknown = payload,
  ip = "192.0.2.1",
  headers: Record<string, string> = {},
) {
  return new Request(origin + "/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "CF-Connecting-IP": ip,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const rows = async () =>
  (await db.prepare("SELECT * FROM inquiries").all<Inquiry>()).results;
async function enqueue() {
  const response = await contact(request(), env, now);
  assert.equal(response.status, 202);
  return ((await response.json()) as { id: string }).id;
}

test("config discloses only mode and retention; disabled and stale workers fail closed", async () => {
  const response = await config(new Request(origin + "/api/config"), env, now);
  assert.deepEqual(await response.json(), { mode: "email", retentionDays: 7 });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    (
      await config(
        new Request(origin),
        { ...env, CONTACT_ENABLED: "false" },
        now,
      )
    ).status,
    503,
  );
  assert.equal(
    (await config(new Request(origin), env, now + 6 * 60000)).status,
    503,
  );
  assert.equal((await contact(request(), env, now + 6 * 60000)).status, 503);
  assert.equal((await rows()).length, 0);
  const wrongMethod = await config(
    new Request(origin, { method: "POST" }),
    env,
    now,
  );
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("allow"), "GET");
});

test("method, origin, JSON, missing edge identity and unknown API paths", async () => {
  const method = await contact(new Request(origin), env, now);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "POST");
  assert.equal(
    (
      await contact(
        request(payload, "1", { Origin: "https://evil.invalid" }),
        env,
        now,
      )
    ).status,
    403,
  );
  assert.equal(
    (await contact(request(payload, "1", { Origin: "" }), env, now)).status,
    403,
  );
  const preview = new Request(
    "https://preview.pages.dev/api/contact",
    request(),
  );
  assert.equal((await contact(preview, env, now)).status, 403);
  assert.equal(
    (
      await contact(
        request(payload, "1", { "Content-Type": "text/plain" }),
        env,
        now,
      )
    ).status,
    415,
  );
  assert.equal((await contact(request(payload, ""), env, now)).status, 503);
  assert.equal((await contact(request("{"), env, now)).status, 400);
  assert.equal((await unknownRoute({} as never)).status, 404);
});

test("reuses field errors, honeypot, timing, strict schema and URL validation", async () => {
  const invalid = [
    [{ email: "bad" }, "email"],
    [{ message: "short" }, "message"],
    [{ name: "bad\nBcc: injected" }, "name"],
    [{ website: "bot" }, "website"],
    [{ startedAt: now }, "form"],
    [{ startedAt: now - DAY - 1 }, "form"],
    [{ projectLink: "javascript:alert(1)" }, "projectLink"],
    [{ extra: "field" }, "form"],
  ] as const;
  for (const [index, [change, field]] of invalid.entries()) {
    const response = await contact(
      request({ ...payload, ...change }, `192.0.2.${index}`),
      env,
      now,
    );
    assert.equal(response.status, 400);
    const body = (await response.json()) as { errors: Record<string, string> };
    assert.ok(body.errors[field]);
  }
  assert.equal((await rows()).length, 0);
});

test("16 KiB byte limit catches declared and streamed multibyte payloads", async () => {
  assert.equal(
    (await contact(request("{}", "1", { "Content-Length": "16385" }), env, now))
      .status,
    413,
  );
  const bytes = new TextEncoder().encode(
    JSON.stringify({ ...payload, message: "é".repeat(9000) }),
  );
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 10000));
      controller.enqueue(bytes.slice(10000));
      controller.close();
    },
  });
  const req = new Request(origin + "/api/contact", {
    method: "POST",
    headers: request().headers,
    body: stream,
    duplex: "half",
  } as RequestInit);
  assert.equal((await contact(req, env, now)).status, 413);
  assert.equal((await rows()).length, 0);
});

test("202 follows durable insertion; database failure never acknowledges acceptance", async () => {
  const response = await contact(
    request({ ...payload, projectType: "ignored" }),
    env,
    now,
  );
  assert.equal(response.status, 202);
  assert.match(
    ((await response.json()) as { message: string }).message,
    /queued.*not a delivery confirmation/,
  );
  const [row] = await rows();
  assert.equal(row.expires_at, now + 7 * DAY);
  assert.equal(JSON.parse(row.payload).projectType, "");
  assert.equal(JSON.parse(row.payload).website, undefined);
  const failedDb = new Proxy(db, {
    get(target, key) {
      if (key === "prepare")
        return (sql: string) => {
          if (sql.startsWith("INSERT INTO inquiries"))
            throw Error("synthetic write failure");
          return target.prepare(sql);
        };
      return Reflect.get(target, key);
    },
  });
  assert.equal(
    (await contact(request(), { ...env, CONTACT_DB: failedDb }, now)).status,
    503,
  );
  assert.equal((await rows()).length, 1);
});

test("atomic source limit accepts at most five concurrent submissions; global budget stops writes", async () => {
  const responses = await Promise.all(
    Array.from({ length: 12 }, () => contact(request(), env, now)),
  );
  assert.equal(responses.filter((r) => r.status === 202).length, 5);
  assert.equal(responses.filter((r) => r.status === 429).length, 7);
  const limits = (
    await db
      .prepare("SELECT key,hits FROM rate_limits")
      .all<{ key: string; hits: number }>()
  ).results;
  assert.ok(limits.every((row) => !row.key.includes("192.0.2.1")));
  assert.equal(limits.find((row) => !row.key.startsWith("global:"))?.hits, 5);
  await db
    .prepare("UPDATE rate_limits SET hits=1000 WHERE key LIKE 'global:%'")
    .run();
  assert.equal(
    (await contact(request(payload, "192.0.2.99"), env, now)).status,
    429,
  );
  assert.equal(
    await db
      .prepare("SELECT hits FROM rate_limits WHERE key LIKE 'global:%'")
      .first("hits"),
    1000,
  );
});

test("queue capacity is atomic and returns 503 without accepting excess inquiries", async () => {
  await db
    .prepare(
      `WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<999)
    INSERT INTO inquiries (id,payload,created,expires_at,next_attempt)
    SELECT CAST(x AS TEXT),'{}',?,?,? FROM n`,
    )
    .bind(now, now + DAY, now)
    .run();
  const responses = await Promise.all([
    contact(request(), env, now),
    contact(request(payload, "192.0.2.2"), env, now),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [202, 503]);
  assert.equal((await rows()).length, 1000);
});

test("successful delivery uses fixed private recipient, visitor Reply-To and plain text", async () => {
  const id = await enqueue();
  await deliverOne(delivery, now);
  assert.equal((await rows()).length, 0);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "owner@example.invalid");
  assert.equal(sent[0].replyTo, payload.email);
  assert.equal(sent[0].headers["X-Portfolio-Inquiry-ID"], id);
  assert.match(sent[0].text, /Synthetic inquiry/);
  assert.equal("html" in sent[0], false);
});

test("failed delivery backs off, remains inspectable and pauses after eight attempts", async () => {
  await enqueue();
  let calls = 0;
  delivery.EMAIL.send = async () => {
    calls++;
    throw Error("PRIVATE provider error");
  };
  let tick = now;
  for (let attempt = 1; attempt <= 8; attempt++) {
    await deliverOne(delivery, tick);
    const [row] = await rows();
    assert.equal(row.attempts, attempt);
    assert.equal(row.status, attempt === 8 ? "failed" : "pending");
    assert.equal(row.last_error, "provider_rejected_or_unavailable");
    await deliverOne(delivery, tick + 1);
    assert.equal(calls, attempt);
    tick = row.next_attempt;
  }
  await deliverOne(delivery, tick + 3600000);
  assert.equal(calls, 8);
  assert.equal((await rows()).length, 1);
});

test("transient failure recovers; expiry removes failed and unsent data and old rate limits", async () => {
  await enqueue();
  const goodSend = delivery.EMAIL.send;
  delivery.EMAIL.send = async () => {
    throw Error("temporary");
  };
  await deliverOne(delivery, now);
  const [row] = await rows();
  delivery.EMAIL.send = goodSend;
  await deliverOne(delivery, row.next_attempt);
  assert.equal(sent.length, 1);
  assert.equal((await rows()).length, 0);
  await db
    .prepare(
      "INSERT INTO inquiries(id,payload,created,expires_at,next_attempt,status) VALUES ('expired','{}',0,?,0,'failed')",
    )
    .bind(now)
    .run();
  await deliverOne({ ...delivery, DELIVERY_ENABLED: "false" }, now + 2 * DAY);
  assert.equal((await rows()).length, 0);
  assert.equal(
    await db.prepare("SELECT COUNT(*) AS n FROM rate_limits").first("n"),
    0,
  );
  assert.equal(
    (await config(new Request(origin), env, now + 2 * DAY)).status,
    503,
  );
});

test("overlapping ticks cannot send the same leased inquiry", async () => {
  await enqueue();
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  delivery.EMAIL.send = async () => {
    entered();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return { messageId: "synthetic" };
  };
  const first = deliverOne(delivery, now);
  await started;
  await deliverOne(delivery, now + 1);
  assert.equal((await rows())[0].attempts, 1);
  release();
  await first;
  assert.equal((await rows()).length, 0);
});

test("crashed claims recover after their lease; exhausted crashed claims remain inspectable", async () => {
  const id = await enqueue();
  await db
    .prepare(
      "UPDATE inquiries SET status='sending',attempts=1,lease_until=?,lease_token='crashed' WHERE id=?",
    )
    .bind(now + 600000, id)
    .run();
  await deliverOne(delivery, now + 1);
  assert.equal(sent.length, 0);
  await deliverOne(delivery, now + 600001);
  assert.equal(sent.length, 1);
  await db
    .prepare(
      "INSERT INTO inquiries(id,payload,created,expires_at,next_attempt,status,attempts,lease_until) VALUES ('exhausted','{}',?,?,0,'sending',8,0)",
    )
    .bind(now, now + DAY)
    .run();
  await deliverOne(delivery, now + 600002);
  assert.equal((await rows())[0].status, "failed");
  assert.equal(sent.length, 1);
});

test("an acknowledgement write failure retains the accepted email for lease recovery", async () => {
  await enqueue();
  const failedDb = new Proxy(db, {
    get(target, key) {
      if (key === "prepare")
        return (sql: string) => {
          if (sql.startsWith("DELETE FROM inquiries WHERE id="))
            throw Error("synthetic acknowledgement failure");
          return target.prepare(sql);
        };
      if (key === "batch") return target.batch.bind(target);
      return Reflect.get(target, key);
    },
  });
  await assert.rejects(
    deliverOne({ ...delivery, CONTACT_DB: failedDb }, now),
    /acknowledgement/,
  );
  const [row] = await rows();
  assert.equal(row.status, "sending");
  assert.equal(row.attempts, 1);
  assert.equal(sent.length, 1);
  await deliverOne(delivery, now + 1);
  assert.equal(sent.length, 1);
  await deliverOne(delivery, row.lease_until + 1);
  assert.equal(sent.length, 2);
  assert.equal(
    sent[0].headers["X-Portfolio-Inquiry-ID"],
    sent[1].headers["X-Portfolio-Inquiry-ID"],
  );
  assert.equal((await rows()).length, 0);
});

test("a stale send completion cannot delete a newer claim", async () => {
  const id = await enqueue();
  delivery.EMAIL.send = async () => {
    // Simulate lease expiry and another Worker claiming while a send was stalled.
    await db
      .prepare("UPDATE inquiries SET lease_token='newer-claim' WHERE id=?")
      .bind(id)
      .run();
    return { messageId: "synthetic-provider-id" };
  };
  await deliverOne(delivery, now);
  assert.equal((await rows())[0].lease_token, "newer-claim");
});

async function formcarrySetup() {
  env.DELIVERY_PROVIDER = "formcarry";
  delivery = {
    CONTACT_DB: db,
    DELIVERY_ENABLED: "true",
    DELIVERY_PROVIDER: "formcarry",
    FORMCARRY_FORM_ID: "synthetic-form",
  };
  await db.prepare("UPDATE worker_state SET provider='formcarry'").run();
}
test("Formcarry JSON contract maps validated fields and email Reply-To; acceptance is not delivery", async () => {
  await formcarrySetup();
  const id = await enqueue();
  let calls = 0;
  await deliverOne(delivery, now, async (url, init) => {
    calls++;
    assert.equal(url, "https://formcarry.com/s/synthetic-form");
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("accept"), "application/json");
    const data = JSON.parse(String(init?.body));
    assert.equal(data.email, payload.email);
    assert.equal(data.name, payload.name);
    assert.equal(data.message, payload.message);
    assert.equal(data.inquiryId, id);
    assert.equal(data._gotcha, "");
    assert.equal(data.startedAt, undefined);
    assert.equal(data.to, undefined);
    return Response.json({ code: 200 });
  });
  assert.equal(calls, 1);
  assert.equal((await rows()).length, 0);
  assert.equal(
    await db.prepare("SELECT COUNT(*) n FROM delivery_attempts").first("n"),
    1,
  );
});
for (const outcome of [
  "quota-http",
  "quota-json",
  "server-error",
  "bad-json",
  "network",
]) {
  test(`Formcarry ${outcome} retains inquiry, disables contact, never blindly retries`, async () => {
    await formcarrySetup();
    await enqueue();
    let calls = 0;
    const fetcher = async () => {
      calls++;
      if (outcome === "network") throw Error("synthetic timeout");
      if (outcome === "bad-json") return new Response("unknown");
      return Response.json(
        { code: outcome === "server-error" ? 500 : 429 },
        { status: outcome === "quota-http" ? 429 : 200 },
      );
    };
    await deliverOne(delivery, now, fetcher);
    assert.equal((await rows())[0].status, "failed");
    assert.equal((await config(new Request(origin), env, now)).status, 503);
    assert.equal((await contact(request(), env, now)).status, 503);
    await deliverOne(delivery, now + DAY, fetcher);
    assert.equal(calls, 1);
  });
}
test("Formcarry acknowledgement failure and expired lease cannot duplicate an accepted submission", async () => {
  await formcarrySetup();
  await enqueue();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return Response.json({ code: 200 });
  };
  const failedDb = new Proxy(db, {
    get(target, key) {
      if (key === "prepare")
        return (sql: string) => {
          if (sql.startsWith("DELETE FROM inquiries WHERE id="))
            throw Error("ack failure");
          return target.prepare(sql);
        };
      if (key === "batch") return target.batch.bind(target);
      return Reflect.get(target, key);
    },
  });
  await assert.rejects(
    deliverOne({ ...delivery, CONTACT_DB: failedDb }, now, fetcher),
  );
  await deliverOne(delivery, now + 600001, fetcher);
  assert.equal(calls, 1);
  assert.equal(
    (await rows())[0].last_error,
    "formcarry_outcome_requires_review",
  );
});
test("Formcarry free allowance includes queued messages and attempts, atomically", async () => {
  await formcarrySetup();
  await db
    .prepare(
      `WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<49)
    INSERT INTO delivery_attempts(id,created) SELECT CAST(x AS TEXT),? FROM n`,
    )
    .bind(now)
    .run();
  const responses = await Promise.all([
    contact(request(), env, now),
    contact(request(payload, "192.0.2.2"), env, now),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [202, 503]);
  assert.equal((await config(new Request(origin), env, now)).status, 503);
});
