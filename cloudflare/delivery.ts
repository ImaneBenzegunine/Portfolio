import { contactSchema } from "../backend/validation.mjs";
import type { DeliveryEnv, Inquiry, OwnerEmail } from "./types.ts";
import {
  deliveryConfigured,
  providerName,
  ProviderError,
  sendFormcarry,
  FREE_WINDOW,
  FREE_ATTEMPTS,
} from "./provider.ts";

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

export async function deliverOne(
  env: DeliveryEnv,
  now = Date.now(),
  fetcher = fetch,
) {
  const db = env.CONTACT_DB;
  // Run retention even when sending is disabled.
  await db.batch([
    db.prepare("DELETE FROM inquiries WHERE expires_at <= ?").bind(now),
    db.prepare("DELETE FROM rate_limits WHERE expires <= ?").bind(now),
    db
      .prepare("DELETE FROM delivery_attempts WHERE created <= ?")
      .bind(now - FREE_WINDOW),
    db
      .prepare(
        `UPDATE inquiries SET status='failed', lease_token=NULL,
      last_error='attempts_exhausted' WHERE status='sending' AND lease_until<=? AND attempts>=?`,
      )
      .bind(now, MAX_ATTEMPTS),
  ]);
  if (!deliveryConfigured(env)) {
    await db.prepare("UPDATE worker_state SET last_tick=0 WHERE id=1").run();
    return;
  }
  const provider = providerName(env);
  const control = await db
    .prepare("SELECT provider, blocked_until FROM worker_state WHERE id=1")
    .first<{ provider: string; blocked_until: number }>();
  if (control?.provider === provider && control.blocked_until > now) return;
  await db
    .prepare(
      `INSERT INTO worker_state (id,last_tick,provider) VALUES (1,?,?)
    ON CONFLICT(id) DO UPDATE SET last_tick=excluded.last_tick,
      blocked_until=CASE WHEN worker_state.provider=excluded.provider THEN worker_state.blocked_until ELSE 0 END,
      provider=excluded.provider`,
    )
    .bind(now, provider)
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
  if (provider === "formcarry") {
    const prior = await db
      .prepare("SELECT id FROM delivery_attempts WHERE id=?")
      .bind(row.id)
      .first();
    if (prior) {
      await db
        .prepare(
          "UPDATE inquiries SET status='failed',lease_token=NULL,last_error='formcarry_outcome_requires_review' WHERE id=? AND lease_token=?",
        )
        .bind(row.id, token)
        .run();
      await db
        .prepare(
          "UPDATE worker_state SET last_tick=0,blocked_until=? WHERE id=1",
        )
        .bind(now + FREE_WINDOW)
        .run();
      return;
    }
    const reserved = await db
      .prepare(
        `INSERT INTO delivery_attempts (id,created)
      SELECT ?,? WHERE (SELECT COUNT(*) FROM delivery_attempts WHERE created>?) < ? RETURNING id`,
      )
      .bind(row.id, now, now - FREE_WINDOW, FREE_ATTEMPTS)
      .first();
    if (!reserved) {
      await db
        .prepare(
          `UPDATE inquiries SET status='pending', attempts=attempts-1,
        lease_token=NULL, lease_until=0, last_error='free_allowance_exhausted'
        WHERE id=? AND lease_token=?`,
        )
        .bind(row.id, token)
        .run();
      await db.prepare("UPDATE worker_state SET last_tick=0 WHERE id=1").run();
      return;
    }
  }
  try {
    if (provider === "formcarry") await sendFormcarry(row, env, fetcher);
    else await env.EMAIL!.send(ownerEmail(row, env));
  } catch (error) {
    const permanent =
      provider === "formcarry" ||
      (error instanceof ProviderError && error.permanent);
    if (
      provider === "formcarry" ||
      (error instanceof ProviderError && error.pauseMs > 0)
    )
      await db
        .prepare(
          "UPDATE worker_state SET last_tick=0,blocked_until=? WHERE id=1",
        )
        .bind(
          now + (error instanceof ProviderError ? error.pauseMs : FREE_WINDOW),
        )
        .run();
    await db
      .prepare(
        `UPDATE inquiries SET status=?, next_attempt=?, lease_until=0,
      lease_token=NULL, last_error='provider_rejected_or_unavailable' WHERE id=? AND lease_token=?`,
      )
      .bind(
        permanent || row.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        now + Math.min(3600000, 60000 * 2 ** row.attempts),
        row.id,
        token,
      )
      .run();
    return;
  }
  // Acceptance is not inbox delivery. Delete only after send() resolves.
  // Formcarry reservations prevent replay even if this acknowledgement fails.
  // Native email retains at-least-once retry behavior.
  await db
    .prepare("DELETE FROM inquiries WHERE id=? AND lease_token=?")
    .bind(row.id, token)
    .run();
}
