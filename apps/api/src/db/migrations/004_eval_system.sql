PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS eval_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  rules TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id TEXT PRIMARY KEY,
  eval_config_id TEXT NOT NULL REFERENCES eval_configs(id),
  base_version_id TEXT NOT NULL REFERENCES prompt_versions(id),
  candidate_version_id TEXT NOT NULL REFERENCES prompt_versions(id),
  status TEXT NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  error_message TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS eval_run_items (
  id TEXT PRIMARY KEY,
  eval_run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  dataset_item_id TEXT NOT NULL REFERENCES dataset_items(id),
  base_output TEXT,
  candidate_output TEXT,
  base_metrics TEXT,
  candidate_metrics TEXT,
  delta TEXT,
  verdict TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (verdict IN ('IMPROVED', 'REGRESSED', 'SAME', 'UNKNOWN')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO _migrations (name)
VALUES ('004_eval_system.sql');
