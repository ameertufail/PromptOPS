PRAGMA foreign_keys = ON;

-- ============================================================================
-- Migration 008: Security Fixes
-- Adds missing FK constraints, UNIQUE indexes, lookup indexes, and expands
-- the datasets.type CHECK constraint.  Fully idempotent (safe to re-run).
-- ============================================================================

-- ── 1. Recreate eval_configs with ON DELETE RESTRICT on dataset_id ─────────

CREATE TABLE IF NOT EXISTS _eval_configs_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,
  rules TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO _eval_configs_new (id, project_id, name, dataset_id, rules, created_by, created_at)
  SELECT id, project_id, name, dataset_id, rules, created_by, created_at
  FROM eval_configs;

DROP TABLE IF EXISTS eval_configs;
ALTER TABLE _eval_configs_new RENAME TO eval_configs;

-- Re-create the index that was on the original table (from 007)
CREATE INDEX IF NOT EXISTS idx_eval_configs_project
  ON eval_configs(project_id);

-- ── 2. Recreate eval_runs with CASCADE on config, RESTRICT on version refs ─

CREATE TABLE IF NOT EXISTS _eval_runs_new (
  id TEXT PRIMARY KEY,
  eval_config_id TEXT NOT NULL REFERENCES eval_configs(id) ON DELETE CASCADE,
  base_version_id TEXT NOT NULL REFERENCES prompt_versions(id) ON DELETE RESTRICT,
  candidate_version_id TEXT NOT NULL REFERENCES prompt_versions(id) ON DELETE RESTRICT,
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

INSERT OR IGNORE INTO _eval_runs_new (id, eval_config_id, base_version_id, candidate_version_id, status, progress_current, progress_total, summary, error_message, created_by, created_at, finished_at)
  SELECT id, eval_config_id, base_version_id, candidate_version_id, status, progress_current, progress_total, summary, error_message, created_by, created_at, finished_at
  FROM eval_runs;

DROP TABLE IF EXISTS eval_runs;
ALTER TABLE _eval_runs_new RENAME TO eval_runs;

-- Re-create indexes from 007
CREATE INDEX IF NOT EXISTS idx_eval_runs_config
  ON eval_runs(eval_config_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_status
  ON eval_runs(status);
CREATE INDEX IF NOT EXISTS idx_eval_runs_config_created
  ON eval_runs(eval_config_id, created_at);

-- ── 3. Recreate audit_events with ON DELETE CASCADE on org_id ──────────────

CREATE TABLE IF NOT EXISTS _audit_events_new (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO _audit_events_new (id, org_id, actor_user_id, action, entity_type, entity_id, metadata, created_at)
  SELECT id, org_id, actor_user_id, action, entity_type, entity_id, metadata, created_at
  FROM audit_events;

DROP TABLE IF EXISTS audit_events;
ALTER TABLE _audit_events_new RENAME TO audit_events;

-- Re-create indexes from 007
CREATE INDEX IF NOT EXISTS idx_audit_events_org
  ON audit_events(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity
  ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created
  ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_org_created
  ON audit_events(org_id, created_at);

-- ── 4. Recreate datasets with GOLDEN added to type CHECK ───────────────────

CREATE TABLE IF NOT EXISTS _datasets_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'GENERATION'
    CHECK (type IN ('GENERATION', 'EXTRACTION', 'CLASSIFICATION', 'GOLDEN')),
  item_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO _datasets_new (id, project_id, name, description, type, item_count, created_by, created_at)
  SELECT id, project_id, name, description, type, item_count, created_by, created_at
  FROM datasets;

DROP TABLE IF EXISTS datasets;
ALTER TABLE _datasets_new RENAME TO datasets;

-- Re-create index from 007
CREATE INDEX IF NOT EXISTS idx_datasets_project
  ON datasets(project_id);

-- ── 5. UNIQUE index on users.email (also serves as lookup index) ───────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users(email);

-- ── 6. UNIQUE index on eval_run_items(eval_run_id, dataset_item_id) ────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_eval_run_items_run_item_unique
  ON eval_run_items(eval_run_id, dataset_item_id);

-- ── 7. Index on provider_keys(project_id) ──────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_provider_keys_project
  ON provider_keys(project_id);

-- ── Track migration ────────────────────────────────────────────────────────

INSERT OR IGNORE INTO _migrations (name) VALUES ('008_security_fixes.sql');
