# CONTEXT: Database & Data Model

> Attach with: PROJECT_OVERVIEW.md

---

## Database: Cloudflare D1 (SQLite)

Free tier: 5M reads/day, 100K writes/day, 5GB. Location: `apps/api/src/db/`.

## D1 Rules

- SQLite syntax (not PostgreSQL)
- TEXT PRIMARY KEY with ULIDs (no auto-increment)
- Dates as TEXT (ISO 8601, `datetime('now')`)
- JSON as TEXT columns (query with `json_extract()`)
- Atomic ops via `db.batch([...statements])`
- No triggers/stored procedures

## All Tables (15)

**users** â€” id, github_id (unique), email, name, avatar_url, created_at

**orgs** â€” id, name, slug (unique), created_at

**org_members** â€” org_id+user_id (PK), role (OWNER/ADMIN/MEMBER/VIEWER), created_at

**projects** â€” id, org_id, name, slug, description, created_at. Unique(org_id, slug)

**prompts** â€” id, project_id, name, description, created_by, created_at

**prompt_versions** â€” id, prompt_id, version_number, content (template), variables_schema (JSON), model_config (JSON), status (DRAFT/RELEASED/ARCHIVED), created_by, created_at. Unique(prompt_id, version_number). Immutable.

**datasets** â€” id, project_id, name, description, type (GENERATION/EXTRACTION/CLASSIFICATION), item_count (denormalized), created_by, created_at

**dataset_items** â€” id, dataset_id, input (JSON), expected_output (JSON, nullable), rubric (nullable), tags (JSON array, nullable), sort_order, created_at

**eval_configs** â€” id, project_id, name, dataset_id, rules (JSON â€” checks, guardrails, judge, thresholds, comparison settings), created_by, created_at

**eval_runs** â€” id, eval_config_id, base_version_id, candidate_version_id, status (QUEUED/RUNNING/COMPLETED/FAILED), progress_current, progress_total, summary (JSON), error_message, created_by, created_at, finished_at

**eval_run_items** â€” id, eval_run_id, dataset_item_id, base_output, candidate_output, base_metrics (JSON), candidate_metrics (JSON), delta (JSON), verdict (IMPROVED/REGRESSED/SAME/UNKNOWN), created_at

**runs** â€” id, project_id, prompt_version_id (nullable), input (JSON), output, metrics (JSON), source (SDK/UI/EVAL), created_at

**api_keys** â€” id, project_id, name, key_hash, key_prefix, last_used_at, created_by, created_at

**provider_keys** â€” id, project_id, provider, encrypted_key, key_hint, created_by, created_at. Unique(project_id, provider)

**audit_events** â€” id, org_id, actor_user_id, action, entity_type, entity_id, metadata (JSON), created_at

## Key JSON Fields

**model_config:** model, temperature, max_tokens, top_p, frequency/presence_penalty

**eval_configs.rules:** checks (json_valid, json_schema, regex_match, exact_match), guardrails (pii_detection, prompt_injection_check), judge (enabled, provider, model, rubric, scale, temperature), thresholds (min_judge_score, all_checks_pass, no_guardrail_failures), comparison (delta_threshold, sample_size)

**metrics (eval items):** latencyMs, checks results, guardrails results, judgeScore, judgeReasons, judgeFails

**runs.metrics:** latencyMs, tokenCount, costEstimate, guardrail results

## Indexes

On: org_members(user_id), projects(org_id), prompts(project_id), prompt_versions(prompt_id), datasets(project_id), dataset_items(dataset_id), eval_configs(project_id), eval_runs(eval_config_id), eval_runs(status), eval_run_items(eval_run_id), eval_run_items(verdict), runs(project_id), runs(prompt_version_id), runs(created_at), api_keys(key_hash), audit_events(org_id), audit_events(entity_type+entity_id), audit_events(created_at)

## Performance Rules

Batch inserts (20/transaction). Denormalized counts. Cursor-based pagination. Avoid json_extract in WHERE on large tables. Keep JSON under 1MB.

## Migration Strategy

Numbered SQL files. Test with `--local`, apply with `--remote`. Track in `_migrations` table.

---

## Task Progress

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
- (no completed tasks yet)


