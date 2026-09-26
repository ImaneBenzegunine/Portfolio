// Operator-only maintenance. No HTTP routes expose the queue or backups.
import { DatabaseSync } from "node:sqlite";
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  renameSync,
  chmodSync,
} from "node:fs";
import { openStore } from "./store.mjs";
const path = process.env.DB_PATH || "/data/contact.sqlite";
const [command, arg] = process.argv.slice(2);
process.umask(0o077);
if (command === "restore") {
  const incoming = readFileSync(0, "utf8").trim();
  const bytes = Buffer.from(incoming, "base64");
  if (bytes.subarray(0, 16).toString() !== "SQLite format 3\0")
    throw Error("Not a SQLite backup.");
  const temp = path + ".restore";
  writeFileSync(temp, bytes, { mode: 0o600 });
  const verify = new DatabaseSync(temp);
  if (verify.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
    throw Error("Backup failed integrity check.");
  verify
    .prepare(
      "SELECT id,payload,mode,created,attempts,next_attempt FROM inquiries LIMIT 0",
    )
    .all();
  verify.prepare("SELECT key,hits,expires FROM rate_limits LIMIT 0").all();
  verify.close();
  renameSync(temp, path);
  chmodSync(path, 0o600);
  console.log("Backup restored.");
} else {
  const store = openStore(path, Number(process.env.RETENTION_DAYS || 7));
  if (command === "backup") {
    const temp = "/tmp/portfolio-backup.sqlite";
    try {
      unlinkSync(temp);
    } catch {
      /* no prior snapshot */
    }
    store.db.prepare("VACUUM INTO ?").run(temp);
    process.stdout.write(readFileSync(temp).toString("base64"));
    unlinkSync(temp);
  } else if (command === "stats")
    console.log(
      JSON.stringify(
        store.db
          .prepare("SELECT mode,COUNT(*) AS count FROM inquiries GROUP BY mode")
          .all(),
      ),
    );
  else if (command === "inspect") {
    if (!arg) throw Error("Supply one inquiry ID.");
    console.log(
      JSON.stringify(
        store.db.prepare("SELECT * FROM inquiries WHERE id=?").get(arg) || null,
      ),
    );
  } else if (command === "delete") {
    if (!arg) throw Error("Supply one inquiry ID.");
    console.log(
      JSON.stringify(
        store.db.prepare("DELETE FROM inquiries WHERE id=?").run(arg),
      ),
    );
  } else if (command === "prune") {
    store.prune();
    console.log("Expired rows deleted.");
  } else if (command === "retry") {
    if (!arg) throw Error("Supply one inquiry ID.");
    store.db
      .prepare(
        "UPDATE inquiries SET attempts=0,next_attempt=? WHERE id=? AND mode='smtp'",
      )
      .run(Date.now(), arg);
    console.log("Retry scheduled.");
  } else
    throw Error(
      "Use backup, restore, stats, inspect ID, delete ID, retry ID, or prune.",
    );
  store.close();
}
