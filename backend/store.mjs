import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { createHmac, randomUUID } from "node:crypto";
export function openStore(path, retentionDays = 7) {
  if (path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, payload TEXT NOT NULL, mode TEXT NOT NULL, created INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL);",
  );
  if (path !== ":memory:") chmodSync(path, 0o600);
  return {
    db,
    add(data, mode) {
      const id = randomUUID();
      const now = Date.now();
      db.prepare(
        "INSERT INTO inquiries (id,payload,mode,created,next_attempt) VALUES (?,?,?,?,?)",
      ).run(id, JSON.stringify(data), mode, now, now);
      return id;
    },
    pending(now = Date.now()) {
      return db
        .prepare(
          "SELECT * FROM inquiries WHERE mode='smtp' AND next_attempt <= ? AND attempts < 8 ORDER BY created LIMIT 10",
        )
        .all(now);
    },
    sent(id) {
      db.prepare("DELETE FROM inquiries WHERE id=?").run(id);
    },
    retry(id, attempts) {
      db.prepare(
        "UPDATE inquiries SET attempts=?, next_attempt=? WHERE id=?",
      ).run(
        attempts,
        Date.now() + Math.min(3600000, 30000 * 2 ** attempts),
        id,
      );
    },
    limit(ip, salt, now = Date.now()) {
      const window = Math.floor(now / 3600000);
      const key = createHmac("sha256", salt)
        .update(`${ip}:${window}`)
        .digest("hex");
      const count = db
        .prepare(
          "INSERT INTO rate_limits (key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits",
        )
        .get(key, (window + 1) * 3600000);
      return Number(count.hits) <= 5;
    },
    prune(now = Date.now()) {
      db.prepare("DELETE FROM inquiries WHERE created < ?").run(
        now - retentionDays * 86400000,
      );
      db.prepare("DELETE FROM rate_limits WHERE expires <= ?").run(now);
    },
    count() {
      return db.prepare("SELECT COUNT(*) AS count FROM inquiries").get().count;
    },
    close() {
      db.close();
    },
  };
}
