PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON org_members(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_org
  ON projects(org_id);

CREATE INDEX IF NOT EXISTS idx_prompts_project
  ON prompts(project_id);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt
  ON prompt_versions(prompt_id);

CREATE INDEX IF NOT EXISTS idx_datasets_project
  ON datasets(project_id);

CREATE INDEX IF NOT EXISTS idx_dataset_items_dataset
  ON dataset_items(dataset_id);

CREATE INDEX IF NOT EXISTS idx_dataset_items_dataset_sort_order
  ON dataset_items(dataset_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_eval_configs_project
  ON eval_configs(project_id);

CREATE INDEX IF NOT EXISTS idx_eval_runs_config
  ON eval_runs(eval_config_id);

CREATE INDEX IF NOT EXISTS idx_eval_runs_status
  ON eval_runs(status);

CREATE INDEX IF NOT EXISTS idx_eval_runs_config_created
  ON eval_runs(eval_config_id, created_at);

CREATE INDEX IF NOT EXISTS idx_eval_run_items_run
  ON eval_run_items(eval_run_id);

CREATE INDEX IF NOT EXISTS idx_eval_run_items_verdict
  ON eval_run_items(verdict);

CREATE INDEX IF NOT EXISTS idx_eval_run_items_run_verdict_created
  ON eval_run_items(eval_run_id, verdict, created_at);

CREATE INDEX IF NOT EXISTS idx_runs_project
  ON runs(project_id);

CREATE INDEX IF NOT EXISTS idx_runs_version
  ON runs(prompt_version_id);

CREATE INDEX IF NOT EXISTS idx_runs_created
  ON runs(created_at);

CREATE INDEX IF NOT EXISTS idx_runs_project_created
  ON runs(project_id, created_at);

CREATE INDEX IF NOT EXISTS idx_runs_project_prompt_created
  ON runs(project_id, prompt_version_id, created_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_project
  ON api_keys(project_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash
  ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_audit_events_org
  ON audit_events(org_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity
  ON audit_events(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_created
  ON audit_events(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_events_org_created
  ON audit_events(org_id, created_at);

INSERT OR IGNORE INTO _migrations (name)
VALUES ('007_indexes.sql');
