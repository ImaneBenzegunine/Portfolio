ALTER TABLE worker_state ADD COLUMN provider TEXT NOT NULL DEFAULT 'cloudflare';
ALTER TABLE worker_state ADD COLUMN blocked_until INTEGER NOT NULL DEFAULT 0;
CREATE TABLE delivery_attempts (id TEXT PRIMARY KEY, created INTEGER NOT NULL);
CREATE INDEX delivery_attempts_created ON delivery_attempts(created);
