import { contactSchema } from "../backend/validation.mjs";
import type { DeliveryEnv, Inquiry, OwnerEmail } from "./types.ts";

const LEASE_MS = 10 * 60000;
const MAX_ATTEMPTS = 8;
const address = contactSchema.shape.email;

export function ownerEmail(row: Inquiry, env: DeliveryEnv): OwnerEmail {
  const data = JSON.parse(row.payload) as Record<string, string>;
  return {
    from: address.parse(env.MAIL_FROM),
    to: address.parse(env.MAIL_TO),
    replyTo: address.parse(data.email),
    subject: `[Portfolio] ${data.kind === "hiring" ? "Hiring opportunity" : "Project collaboration"}`,
    text:
      `Inquiry reference: ${row.id}\n\n` +
      Object.entries(data)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n\n"),
    headers: { "X-Portfolio-Inquiry-ID": row.id },
  };
}

export async function deliverOne(env: DeliveryEnv, now = Date.now()) {
  const db = env.CONTACT_DB;
  // Run retention even when sending is disabled.
  await db.batch([
    db.prepare("DELETE FROM inquiries WHERE expires_at <= ?").bind(now),
    db.prepare("DELETE FROM rate_limits WHERE expires <= ?").bind(now),
    db
      .prepare(
        `UPDATE inquiries SET status='failed', lease_token=NULL,
      last_error='attempts_exhausted' WHERE status='sending' AND lease_until<=? AND attempts>=?`,
      )
      .bind(now, MAX_ATTEMPTS),
  ]);
  if (
    env.DELIVERY_ENABLED !== "true" ||
    !env.EMAIL ||
    !address.safeParse(env.MAIL_FROM).success ||
    !address.safeParse(env.MAIL_TO).success
  ) {
    await db.prepare("DELETE FROM worker_state WHERE id=1").run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO worker_state (id,last_tick) VALUES (1,?)
    ON CONFLICT(id) DO UPDATE SET last_tick=excluded.last_tick`,
    )
    .bind(now)
    .run();
  const token = crypto.randomUUID();
  // Claim exactly one message per tick to keep CPU and D1 work small on Workers Free.
  // An expired lease recovers crashes; the token fences stale acknowledgements.
  const row = await db
    .prepare(
      `UPDATE inquiries SET status='sending', attempts=attempts+1,
    lease_token=?, lease_until=? WHERE id=(SELECT id FROM inquiries
      WHERE expires_at>? AND attempts<? AND
      ((status='pending' AND next_attempt<=?) OR (status='sending' AND lease_until<=?))
      ORDER BY next_attempt LIMIT 1) RETURNING *`,
    )
    .bind(token, now + LEASE_MS, now, MAX_ATTEMPTS, now, now)
    .first<Inquiry>();
  if (!row) return;
  try {
    await env.EMAIL.send(ownerEmail(row, env));
  } catch {
    await db
      .prepare(
        `UPDATE inquiries SET status=?, next_attempt=?, lease_until=0,
      lease_token=NULL, last_error='provider_rejected_or_unavailable' WHERE id=? AND lease_token=?`,
      )
      .bind(
        row.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        now + Math.min(3600000, 60000 * 2 ** row.attempts),
        row.id,
        token,
      )
      .run();
    return;
  }
  // Acceptance is not inbox delivery. Delete only after send() resolves.
  // If this write fails, keep the lease: retry later may duplicate the email.
  await db
    .prepare("DELETE FROM inquiries WHERE id=? AND lease_token=?")
    .bind(row.id, token)
    .run();
}
