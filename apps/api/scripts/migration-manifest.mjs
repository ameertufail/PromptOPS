export const databaseName = "promptops-db";

export const migrationFiles = [
  "src/db/migrations/001_core_tenancy.sql",
  "src/db/migrations/002_prompts_and_versions.sql",
  "src/db/migrations/003_datasets.sql",
  "src/db/migrations/004_eval_system.sql",
  "src/db/migrations/005_runs_and_keys.sql",
  "src/db/migrations/006_audit_events.sql",
  "src/db/migrations/007_indexes.sql"
];

export const migrationNames = migrationFiles.map((file) => {
  const parts = file.split("/");
  return parts[parts.length - 1] ?? file;
});

export const expectedTables = [
  "_migrations",
  "api_keys",
  "audit_events",
  "dataset_items",
  "datasets",
  "eval_configs",
  "eval_run_items",
  "eval_runs",
  "org_members",
  "orgs",
  "projects",
  "prompt_versions",
  "prompts",
  "provider_keys",
  "runs",
  "users"
];

export const expectedIndexes = [
  "idx_api_keys_hash",
  "idx_api_keys_project",
  "idx_audit_events_created",
  "idx_audit_events_entity",
  "idx_audit_events_org",
  "idx_audit_events_org_created",
  "idx_dataset_items_dataset",
  "idx_dataset_items_dataset_sort_order",
  "idx_datasets_project",
  "idx_eval_configs_project",
  "idx_eval_run_items_run",
  "idx_eval_run_items_run_verdict_created",
  "idx_eval_run_items_verdict",
  "idx_eval_runs_config",
  "idx_eval_runs_config_created",
  "idx_eval_runs_status",
  "idx_org_members_user",
  "idx_projects_org",
  "idx_prompt_versions_prompt",
  "idx_prompts_project",
  "idx_runs_created",
  "idx_runs_project",
  "idx_runs_project_created",
  "idx_runs_project_prompt_created",
  "idx_runs_version"
];

export const hotPathQueryPlans = [
  {
    expectedIndex: "idx_dataset_items_dataset_sort_order",
    name: "dataset item pagination",
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id
      FROM dataset_items
      WHERE dataset_id = 'dataset_1'
      ORDER BY sort_order ASC, id ASC
      LIMIT 50;
    `
  },
  {
    expectedIndex: "idx_eval_runs_config_created",
    name: "eval run listing by config",
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id
      FROM eval_runs
      WHERE eval_config_id = 'config_1'
      ORDER BY created_at DESC
      LIMIT 50;
    `
  },
  {
    expectedIndex: "idx_eval_run_items_run_verdict_created",
    name: "eval run item filtering by verdict",
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id
      FROM eval_run_items
      WHERE eval_run_id = 'run_1' AND verdict = 'REGRESSED'
      ORDER BY created_at DESC
      LIMIT 50;
    `
  },
  {
    expectedIndex: "idx_runs_project_created",
    name: "project run listing by date range",
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id
      FROM runs
      WHERE project_id = 'project_1'
        AND created_at >= '2026-03-01T00:00:00.000Z'
        AND created_at <= '2026-03-31T23:59:59.999Z'
      ORDER BY created_at DESC
      LIMIT 50;
    `
  },
  {
    expectedIndex: "idx_runs_project_prompt_created",
    name: "project run listing by prompt version and date range",
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id
      FROM runs
      WHERE project_id = 'project_1'
        AND prompt_version_id = 'version_1'
        AND created_at >= '2026-03-01T00:00:00.000Z'
        AND created_at <= '2026-03-31T23:59:59.999Z'
      ORDER BY created_at DESC
      LIMIT 50;
    `
  },
  {
    expectedIndex: "idx_api_keys_hash",
    name: "API key hash lookup",
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id
      FROM api_keys
      WHERE key_hash = 'hash_1'
      LIMIT 1;
    `
  },
  {
    expectedIndex: "idx_audit_events_org_created",
    name: "audit event listing by org",
    sql: `
      EXPLAIN QUERY PLAN
      SELECT id
      FROM audit_events
      WHERE org_id = 'org_1'
      ORDER BY created_at DESC
      LIMIT 50;
    `
  }
];
