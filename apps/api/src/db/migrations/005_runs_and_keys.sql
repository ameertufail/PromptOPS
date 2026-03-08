PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt_version_id TEXT REFERENCES prompt_versions(id),
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  metrics TEXT,
  source TEXT NOT NULL DEFAULT 'SDK'
    CHECK (source IN ('SDK', 'UI', 'EVAL')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  last_used_at TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS provider_keys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL
    CHECK (provider IN ('OPENAI', 'ANTHROPIC', 'GROQ', 'TOGETHER', 'CUSTOM')),
  encrypted_key TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, provider)
);

INSERT OR IGNORE INTO _migrations (name)
VALUES ('005_runs_and_keys.sql');
