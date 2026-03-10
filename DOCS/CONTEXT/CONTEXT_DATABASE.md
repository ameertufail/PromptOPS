# CONTEXT: Database & Data Model

> Attach with `PROJECT_OVERVIEW.md`.

---

## Database: Cloudflare D1 (SQLite)

Free tier: 5M reads/day, 100K writes/day, 5GB. Database code lives under `apps/api/src/db/`.

Current provisioned production database: `promptops-db`, bound in Wrangler as `DB`.

## D1 Rules

- SQLite syntax, not PostgreSQL
- `TEXT PRIMARY KEY` with ULIDs (no auto-increment)
- Dates stored as ISO-8601 `TEXT`
- JSON stored as `TEXT` and queried with `json_extract()`
- Atomic batches via `db.batch([...])`
- No triggers or stored procedures

## All Tables

- `users`
- `orgs`
- `org_members`
- `projects`
- `prompts`
- `prompt_versions`
- `datasets`
- `dataset_items`
- `eval_configs`
- `eval_runs`
- `eval_run_items`
- `runs`
- `api_keys`
- `provider_keys`
- `audit_events`

## Key JSON Fields

- `model_config` - model, temperature, max tokens, top-p, penalties
- `eval_configs.rules` - checks, guardrails, judge, thresholds, comparison settings
- eval item metrics - latency, check results, guardrail results, judge score, reasons, failures
- `runs.metrics` - latency, token count, cost estimate, guardrail results

## Indexes

Required indexes include:

- `org_members(user_id)`
- `projects(org_id)`
- `prompts(project_id)`
- `prompt_versions(prompt_id)`
- `datasets(project_id)`
- `dataset_items(dataset_id)`
- `eval_configs(project_id)`
- `eval_runs(eval_config_id)`
- `eval_runs(status)`
- `eval_run_items(eval_run_id)`
- `eval_run_items(verdict)`
- `runs(project_id)`
- `runs(prompt_version_id)`
- `runs(created_at)`
- `api_keys(key_hash)`
- `audit_events(org_id)`
- `audit_events(entity_type, entity_id)`
- `audit_events(created_at)`

## Performance Rules

- Batch inserts (20/transaction)
- Denormalized counts where read paths justify them
- Cursor-based pagination
- Avoid large `json_extract()` filters on hot list endpoints
- Keep JSON payloads under 1MB

## Migration Strategy

- Numbered SQL files
- Validate locally with `--local`
- Use `pnpm --filter @promptops/api db:validate:all` to replay the full migration chain against clean and already-migrated local D1 state before any remote apply
- `pnpm --filter @promptops/api db:validate:core` remains available when only the tenancy baseline needs isolated validation
- Promote with `--remote`
- Track applied files in `_migrations`

## Testing Expectations

- Migration idempotency must be verified locally before production use
- Typed query helpers need unit coverage once implemented
- Integration tests must cover tenant lookups, membership resolution, and project-scoped reads before release

## Task Progress

- [x] Database testing targets documented for migrations and typed query helpers
- [x] Production D1 database provisioned and bound in Wrangler
- [x] Shared status/role/provider enums aligned to the D1 schema contract
- [x] Migration 001: users, orgs, org_members, projects
- [x] Migration 002: prompts, prompt_versions
- [x] Migration 003: datasets, dataset_items
- [x] Migration 004: eval_configs, eval_runs, eval_run_items
- [x] Migration 005: runs, api_keys, provider_keys
- [x] Migration 006: audit_events
- [x] Migration 007: all indexes
- [x] Typed query helpers
- [x] Test migrations locally
- [x] Apply to production D1

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-09 - Task 11.3 - Added Phase 11 tenancy query coverage for RBAC role resolution, owner-count enforcement, and paginated audit-event reads.
- 2026-03-09 - Task 11.2 - Added project tenancy helpers for org+slug lookup, scoped listing, update, and delete flows used by the new project routes.
- 2026-03-09 - Task 11.1 - Added organization lookup, membership management, user-by-email, member listing, and audit-event query helpers with unit coverage.
- 2026-03-08 - Task 8.1 - Aligned the shared enums and entity DTO field shapes with the D1 schema so API/web contracts match the database model.
- 2026-03-08 - Task 7.3 - Applied the full migration chain to the production D1 database and verified all numbered files in remote `_migrations`.
- 2026-03-08 - Task 7.3 - Added full-chain D1 migration tooling and validated replay-safe `_migrations` tracking plus the local-to-remote promotion workflow.
- 2026-03-08 - Task 7.2 - Added the required D1 indexes plus hot-path composite indexes for dataset, eval item, runs, and audit pagination/filter queries.
- 2026-03-08 - Task 7.1 - Added migrations 002-006 to complete the prompts, datasets, eval, runs/keys, and audit domain tables.
- 2026-03-07 - Task 6.3 - Added typed tenancy query helpers and unit tests for user upsert, membership resolution, and project-scoped access reads.
- 2026-03-07 - Task 6.2 - Added a local D1 replay validator and confirmed repeated core-tenancy migration runs stay deterministic.
- 2026-03-07 - Task 6.1 - Added the core tenancy migration for users, orgs, org_members, and projects with `_migrations` tracking.
- 2026-03-06 - Task 5.1 - Provisioned the production D1 database and recorded the `DB` binding in Wrangler.
- 2026-03-06 - Task 3.2 - Documented the migration/query-helper test strategy and the integration coverage expectations for database-backed flows.
