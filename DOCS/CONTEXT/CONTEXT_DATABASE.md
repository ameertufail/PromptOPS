# CONTEXT: Database & Data Model

> Attach with `PROJECT_OVERVIEW.md`.

---

## Database: Cloudflare D1 (SQLite)

Free tier: 5M reads/day, 100K writes/day, 5GB. Database code lives under `apps/api/src/db/`.

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
- Promote with `--remote`
- Track applied files in `_migrations`

## Testing Expectations

- Migration idempotency must be verified locally before production use
- Typed query helpers need unit coverage once implemented
- Integration tests must cover tenant lookups, membership resolution, and project-scoped reads before release

## Task Progress

- [x] Database testing targets documented for migrations and typed query helpers
- [ ] Migration 001: users, orgs, org_members, projects
- [ ] Migration 002: prompts, prompt_versions
- [ ] Migration 003: datasets, dataset_items
- [ ] Migration 004: eval_configs, eval_runs, eval_run_items
- [ ] Migration 005: runs, api_keys, provider_keys
- [ ] Migration 006: audit_events
- [ ] Migration 007: all indexes
- [ ] Typed query helpers
- [ ] Test migrations locally
- [ ] Apply to production D1

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-06 - Task 3.2 - Documented the migration/query-helper test strategy and the integration coverage expectations for database-backed flows.
