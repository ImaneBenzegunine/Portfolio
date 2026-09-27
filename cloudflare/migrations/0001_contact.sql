CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt INTEGER NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  last_error TEXT
);
CREATE INDEX inquiries_due ON inquiries(status, next_attempt);
CREATE INDEX inquiries_expiry ON inquiries(expires_at);
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX rate_limits_expiry ON rate_limits(expires);
CREATE TABLE worker_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_tick INTEGER NOT NULL
);
