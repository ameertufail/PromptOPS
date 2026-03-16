# CONTEXT: SDK & Run Logging

> Attach with PROJECT_OVERVIEW.md when working on: PromptOps SDK package, run logging API, API key auth for SDK, example apps

---

## What the SDK Does

A tiny Node.js/TypeScript package that lets any app log LLM "runs" to PromptOps Studio. It's the bridge between production apps and the observability dashboards.

Flow: User's app calls SDK -> SDK sends POST /api/runs with API key -> Backend stores in runs table -> Visible in dashboard.

## SDK Package

Located at `packages/sdk/`. Contains:

- Client class (PromptOpsClient) - main entry point
- Retry logic with exponential backoff + jitter
- Type definitions
- Example app

## SDK Features

**logRun method:** Accepts promptVersionId (optional), input (object), output (string), latencyMs, tokenCount, costEstimate, metadata (any extra context like environment, userId). Returns { id, status: "logged" } or null on failure. Fire-and-forget safe - errors are caught and console.warned, never thrown to crash the user's app. Retries up to 3 times on 5xx with exponential backoff (500ms, 1s, 2s + jitter).

**instrumentedGenerate wrapper:** Takes an async function (the LLM call) + input params. Auto-measures latency. Calls logRun in background (fire-and-forget). Returns the LLM output - logging never blocks the user's code.

**Configuration:** apiKey (required, must start with `po_sk_`), baseUrl (optional, defaults to production), timeout (optional, default 5000ms).

## SDK Authentication

Uses API key (not JWT). Key sent as `Authorization: Bearer po_sk_...`. Backend hashes key, looks up in api_keys table, gets project_id, logs run under that project. Rate limited: 100 requests/minute per key.

## Backend Run Logging Endpoint

POST /api/runs - API key auth only. Validates input with Zod. Optionally runs PII guardrail on the output (regex-based, stored in metrics). Inserts into runs table with source = "SDK". Returns { id, status: "logged" }.

## Backend Stats Endpoint

GET /api/projects/:projectId/runs/stats - Returns aggregated data for dashboard: total runs in period, avg/max latency, PII detection count, runs per day (for charts). Filterable by date range. Uses the Phase 7 `runs` project/date indexes and only light `json_extract` reads for metrics-derived fields.

## SDK Distribution

For MVP: installable from GitHub (`npm install github:username/promptops-studio#packages/sdk`). Future: publish to npm as `@promptops/sdk`.

## Example App

A simple script in `packages/sdk/examples/` that: initializes PromptOpsClient, simulates an LLM call, logs the run, prints confirmation. Serves as both documentation and a quick integration test.

---

## SDK Progress

**SDK Package:**

- [x] Package scaffold (package.json, tsconfig, entry point)
- [x] Type definitions (SDKConfig, LogRunParams, LogRunResponse)
- [x] Retry utility (exponential backoff + jitter)
- [x] PromptOpsClient class
- [x] logRun method (with retry, fire-and-forget error handling)
- [x] instrumentedGenerate wrapper
- [x] Input validation (apiKey format check)
- [x] Example app (basic-logging)
- [x] SDK README with installation + usage docs

**Backend:**

- [x] API key creation endpoint (generate, hash, store, return plaintext once)
- [x] API key list endpoint (prefix only, never full key)
- [x] API key revoke endpoint
- [x] API key auth middleware (hash lookup, rate limit, update last_used_at)
- [x] Run logging endpoint (POST /api/runs)
- [x] Run list endpoint (paginated, filterable)
- [x] Run stats aggregation endpoint

**Frontend:**

- [x] API key management UI in settings page
- [x] Runs explorer page
- [x] Dashboard stats cards + charts

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-16 - Task 22.3 - Finalized SDK README with installation, API reference, configuration, auth, and error handling documentation.
- 2026-03-16 - Task 21.3 - Built full PromptOpsClient with logRun (3x retry + backoff), instrumentedGenerate wrapper, input validation, 13 unit tests, and example app.
- 2026-03-16 - Task 21.2 - Added API key create/list/revoke endpoints, SHA-256 hash auth middleware, run logging POST /api/runs, run list/stats endpoints, and per-key rate limiting.
- 2026-03-08 - Task 9.3 - Added API-key rate-limit middleware scaffolding and request-context contracts the future `/api/runs` SDK endpoint will plug into.
- 2026-03-08 - Task 7.2 - Documented the Phase 7 `runs` index baseline that the SDK logging list and stats endpoints will rely on.
