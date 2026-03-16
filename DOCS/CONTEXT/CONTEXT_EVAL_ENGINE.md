# CONTEXT: Eval Engine, Checks, Judge & Guardrails

> Attach with `PROJECT_OVERVIEW.md` when working on the eval runner, deterministic checks, LLM-as-judge, guardrails, verdict logic, or template rendering.

---

## Architecture: Client-Side Execution

The eval engine runs entirely in the browser. This is a locked architecture choice, not a temporary scaffold.

## Execution Model Lock (Phase 1 Task 1.1)

Browser-orchestrated evals are the primary and default execution model for MVP 0/1/2.

- Frontend owns prompt rendering, provider calls (BYOK), checks, guardrails, judge scoring, and progress orchestration.
- Backend owns run lifecycle endpoints, idempotent item result storage, summaries, auth, and audit records.
- Thin Worker passthrough is allowed only as a fallback for provider CORS restrictions and must not become the default route.
- Any change to server-orchestrated evals as the default path is out of MVP scope without explicit architecture approval.

## Flow Per Eval Run

1. User clicks "Run Eval" in the UI.
2. Frontend calls `POST /api/eval-runs` to create a run record (`RUNNING`).
3. Backend returns the eval config, rules, dataset items, and both prompt versions.
4. Frontend processes items with controlled concurrency:
   - Render base and candidate templates
   - Call the provider directly from the browser
   - Run deterministic checks and guardrails
   - Optionally call the judge
   - Calculate the verdict
   - Persist the item result to the backend
5. Frontend calls `PATCH /api/eval-runs/:id/complete` and the backend computes the summary.

## Shared Utilities

Located in `packages/shared/`.

### Template Rendering

- Mustache-style variable replacement
- Missing required variables should throw
- `extractVariables()` parses placeholders from the template

### Deterministic Checks

- JSON validity
- JSON schema validation
- Regex match
- Exact match
- Aggregated `runChecks()` wrapper

### Guardrails

- PII detection (email, phone, SSN, credit card, IP)
- Prompt injection heuristics against the input payload

### Verdict Calculation

Priority order:

1. Candidate passes checks/guardrails while base does not -> `IMPROVED`
2. Base passes checks/guardrails while candidate does not -> `REGRESSED`
3. If both are comparable, use judge-score delta
4. Otherwise -> `SAME`

## Browser-Side Utilities

Located in `apps/web/src/lib/`.

- LLM client abstraction
- OpenAI and Anthropic adapters
- Judge scoring helper
- Eval orchestrator with retries, resume, and progress updates

## Resumability

Before processing, the engine checks which items already have results. Completed items are skipped so interrupted runs can resume from the point of failure.

## Error Handling

- LLM call fails -> retry once after 2 seconds
- Retry fails -> mark the item as `ERROR` and continue
- 5+ consecutive errors -> pause and surface an error in the UI
- Persist item-level errors in the stored metrics

## Eval Summary (Backend Computed)

When a run completes, the backend computes and stores:

- `totalItems`
- `basePassRate`
- `candidatePassRate`
- `baseAvgScore`
- `candidateAvgScore`
- `improved/regressed/same` counts
- top regressions sorted by score delta

## Phase 1 Scope Lock Checklist

- [x] Browser-orchestrated eval execution confirmed as the primary path
- [x] Backend eval scope constrained to lifecycle APIs, persistence, and summary computation
- [x] Server-side orchestration and default provider proxying documented as non-goals for MVP 0/1/2

## Eval Engine Progress

**Shared Package (`packages/shared`):**

- [x] Workspace smoke-test baseline in place for shared contracts
- [x] Template renderer (`renderTemplate` + `extractVariables`)
- [x] JSON validity check
- [x] JSON schema validation check (Ajv)
- [x] Regex match check
- [x] Exact match check
- [x] `runChecks()` wrapper
- [x] PII detection
- [x] Prompt injection detection
- [x] Verdict calculation
- [x] Unit tests for all checks and guardrails

**Browser-Side (`apps/web`):**

- [x] LLM client abstraction
- [x] OpenAI client implementation
- [x] Anthropic client implementation
- [x] Client factory
- [x] Judge scoring function
- [x] Eval engine orchestrator
- [x] Error handling
- [x] Integration with the eval run UI

**Backend:**

- [x] Create eval run endpoint
- [x] Store eval run item endpoint
- [x] Complete eval run endpoint
- [x] Summary computation service

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-16 - Task 21.1 - Integrated browser eval engine with run execution UI, report page, progress tracking, and resume/abort controls.
- 2026-03-16 - Task 20.3 - Added eval run create/item/complete/list backend endpoints with idempotent item ingestion and summary computation service.
- 2026-03-16 - Task 20.2 - Built browser-side eval orchestrator with controlled concurrency, retry/resume, checks/guardrails/judge pipeline, and auto-pause on consecutive errors.
- 2026-03-16 - Task 20.1 - Built LLM client abstraction with OpenAI, Anthropic, Groq adapters, client factory, and judge scoring helper for BYOK browser-side execution.
- 2026-03-16 - Task 19.3 - Added PII detection, prompt injection heuristics, verdict calculation with priority logic, and 32 unit tests in shared eval utilities.
- 2026-03-16 - Task 19.2 - Added JSON valid, JSON schema (Ajv), regex match, exact match checks plus runChecks() aggregator with 22 unit tests.
- 2026-03-16 - Task 19.1 - Added extractVariables() and renderTemplate() with mustache-style variable support and TemplateMissingVariableError with 12 unit tests.
- 2026-03-16 - Task 18.3 - Added explainability hints and descriptions for judge scoring, thresholds, and comparison settings across all eval config UI surfaces.
- 2026-03-16 - Task 18.2 - Built 5-step eval config wizard with checks, guardrails, judge, and threshold configuration steps in the frontend.
- 2026-03-16 - Task 17.2 - Enforced rules schema defaults and cross-field Zod validation for checks, guardrails, judge, and thresholds in eval config CRUD.
- 2026-03-16 - Task 17.1 - Added eval config CRUD backend endpoints with project-scoped access control and dataset reference validation.
- 2026-03-06 - Task 3.2 - Added a shared-package smoke-test baseline and documented the immediate eval-utility unit-test targets.
- 2026-03-02 - Task 1.1 - Confirmed browser-first eval execution and added scope-lock/non-goal guardrails for eval architecture.
