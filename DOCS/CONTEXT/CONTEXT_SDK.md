# CONTEXT: SDK & Run Logging

> Attach with PROJECT_OVERVIEW.md when working on: PromptOps SDK package, run logging API, API key auth for SDK, example apps

---

## What the SDK Does

A tiny Node.js/TypeScript package that lets any app log LLM "runs" to PromptOps Studio. It's the bridge between production apps and the observability dashboards.

Flow: User's app calls SDK → SDK sends POST /api/runs with API key → Backend stores in runs table → Visible in dashboard.

## SDK Package

Located at `packages/sdk/`. Contains:
- Client class (PromptOpsClient) — main entry point
- Retry logic with exponential backoff + jitter
- Type definitions
- Example app

## SDK Features

**logRun method:** Accepts promptVersionId (optional), input (object), output (string), latencyMs, tokenCount, costEstimate, metadata (any extra context like environment, userId). Returns { id, status: "logged" } or null on failure. Fire-and-forget safe — errors are caught and console.warned, never thrown to crash the user's app. Retries up to 3 times on 5xx with exponential backoff (500ms, 1s, 2s + jitter).

**instrumentedGenerate wrapper:** Takes an async function (the LLM call) + input params. Auto-measures latency. Calls logRun in background (fire-and-forget). Returns the LLM output — logging never blocks the user's code.

**Configuration:** apiKey (required, must start with `po_sk_`), baseUrl (optional, defaults to production), timeout (optional, default 5000ms).

## SDK Authentication

Uses API key (not JWT). Key sent as `Authorization: Bearer po_sk_...`. Backend hashes key, looks up in api_keys table, gets project_id, logs run under that project. Rate limited: 100 requests/minute per key.

## Backend Run Logging Endpoint

POST /api/runs — API key auth only. Validates input with Zod. Optionally runs PII guardrail on the output (regex-based, stored in metrics). Inserts into runs table with source = "SDK". Returns { id, status: "logged" }.

## Backend Stats Endpoint

GET /api/projects/:projectId/runs/stats — Returns aggregated data for dashboard: total runs in period, avg/max latency, PII detection count, runs per day (for charts). Filterable by date range. Uses D1 json_extract for querying metrics fields.

## SDK Distribution

For MVP: installable from GitHub (`npm install github:username/promptops-studio#packages/sdk`). Future: publish to npm as `@promptops/sdk`.

## Example App

A simple script in `packages/sdk/examples/` that: initializes PromptOpsClient, simulates an LLM call, logs the run, prints confirmation. Serves as both documentation and a quick integration test.

---

## SDK Progress

**SDK Package:**
- [ ] Package scaffold (package.json, tsconfig, entry point)
- [ ] Type definitions (SDKConfig, LogRunParams, LogRunResponse)
- [ ] Retry utility (exponential backoff + jitter)
- [ ] PromptOpsClient class
- [ ] logRun method (with retry, fire-and-forget error handling)
- [ ] instrumentedGenerate wrapper
- [ ] Input validation (apiKey format check)
- [ ] Example app (basic-logging)
- [ ] SDK README with installation + usage docs

**Backend:**
- [ ] API key creation endpoint (generate, hash, store, return plaintext once)
- [ ] API key list endpoint (prefix only, never full key)
- [ ] API key revoke endpoint
- [ ] API key auth middleware (hash lookup, rate limit, update last_used_at)
- [ ] Run logging endpoint (POST /api/runs)
- [ ] Run list endpoint (paginated, filterable)
- [ ] Run stats aggregation endpoint

**Frontend:**
- [ ] API key management UI in settings page
- [ ] Runs explorer page
- [ ] Dashboard stats cards + charts
