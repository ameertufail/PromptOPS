# PromptOps Studio - Project Overview

> ALWAYS attach this file in every session. Then attach the relevant `CONTEXT_*.md`.

---

## What Is This?

An open-source LLMOps platform. Developers version prompts, evaluate them against datasets, enforce guardrails, and monitor production quality.

## Core Decisions

- **BYOK (Bring Your Own Key):** We never proxy LLM inference. Users bring their own API keys. Calls go browser -> provider directly.
- **$0 Infrastructure:** Vercel free (frontend), Cloudflare Workers free (API), D1 free (DB), R2 free (storage), GitHub OAuth free (auth).
- **Client-side eval execution:** Eval runner runs in the browser. The backend only stores results.
- **Open source (MIT) + hosted version** becomes the paid product later.

## Execution Model Lock (Phase 1 Task 1.1)

- Browser-orchestrated eval execution is the primary and default model for MVP 0/1/2.
- Backend scope for evals is limited to run lifecycle APIs, idempotent result persistence, summaries, auth, and audit.
- Thin Worker passthrough for provider CORS edge cases is an explicit fallback only, never the default path.
- Any proposal that makes server-side orchestration the default must be treated as post-MVP scope and require explicit architecture sign-off.

## Architecture Guardrails & Security Baseline (Phase 1 Task 1.2)

- BYOK remains browser-first: provider inference calls run from client orchestration, with Worker passthrough allowed only as an explicit fallback for provider CORS edge cases.
- Provider keys are encrypted at rest with AES-256-GCM using `ENCRYPTION_KEY`; decrypted values are never persisted or logged.
- SDK API keys are stored as SHA-256 hashes only; plaintext is shown once at creation and never retrievable afterwards.
- Dashboard auth uses backend-issued JWT sessions in the `po_session` cookie with `HttpOnly`, `SameSite=Lax`, `Secure` in production, and a 7-day max expiry.
- RBAC is enforced server-side on every protected route using org/project membership resolution with deny-by-default behavior.
- Production secrets are allowed only in platform secret stores (Wrangler/Vercel/GitHub), never in committed files, logs, or placeholder production configs.

### Phase 1 Security Baseline Checklist

- [x] BYOK execution boundary locked
- [x] Key storage and secret-masking rules locked
- [x] JWT/cookie session policy locked
- [x] RBAC deny-by-default policy locked
- [x] Production secret handling policy locked

## Delivery Governance & Handoff Protocol (Phase 1 Task 1.3)

### Branch Strategy

- `main` is protected and must stay deployable.
- Use short-lived task branches named `task/<phase>-<task>-<slug>` (example: `task/1-3-delivery-governance`).
- Keep one implementation task per branch; open a new branch/task when scope expands.
- Use squash merge so each merged task has one reviewable changeset tied to the task ID.

### Review Checklist (Required Before Merge)

- Scope matches the task instruction and all listed `Read Context` files were reviewed.
- Validation evidence is included for touched behavior (tests, lint, typecheck, or explicit rationale when not applicable).
- Phase 1.1 and 1.2 guardrails remain intact (browser-first eval model, BYOK/security constraints).
- Documentation writebacks are complete across the plan and context trackers.
- PR descriptions include changed files, verification outcomes, and follow-up items.

### Definition of Done

- Task acceptance criteria are met and reflected in updated docs/checklists.
- Implementation and documentation are consistent (no stale `Pending` summaries for completed tasks).
- Required quality checks pass locally or in CI for changed scope.
- Deferred work is captured as a new task, not hidden as untracked TODOs.

### Handoff Protocol

- Every final handoff update must include: what changed, verification run/results, tracker updates, and follow-ups.
- If blocked, handoff must include the blocker, impact, and the exact next step needed to unblock.
- Missing documentation writeback evidence is merge-blocking.

### Phase 1 Delivery Governance Checklist

- [x] Branch strategy documented
- [x] Review checklist documented
- [x] Definition of done documented
- [x] Handoff protocol documented
- [x] Documentation writeback protocol documented

## MVP Acceptance Criteria (Locked)

**MVP 0 is accepted only when all are true:**

- GitHub login and session flow works end-to-end.
- Org/project tenancy and RBAC boundaries are enforced.
- Prompt CRUD, immutable versioning, diffing, and release/archive basics are usable.
- Core actions create audit events and the deployed app is usable by a new developer without manual DB edits.

**MVP 1 is accepted only when all are true:**

- Dataset CRUD plus JSONL import work with clear validation failures.
- Eval config can be created and edited with checks/guardrails/judge settings.
- Browser orchestrator can execute evals against dataset items with retries/resume and stream progress.
- Reports show pass/fail, verdict distribution, regressions, and judge/check/guardrail outputs per item.

**MVP 2 is accepted only when all are true:**

- API key lifecycle plus SDK run logging are production-usable.
- Dashboards and run explorer surface latency/volume/guardrail trends and filters.
- Onboarding flow and demo data deliver first value quickly.
- Open-source launch assets are complete (README, contributing docs, license, local setup guide).

## Scope Non-Goals (MVP 0-2)

- No default server-side eval orchestration or default inference proxy architecture.
- No model fine-tuning/training pipeline management.
- No autonomous agent workflow builder.
- No enterprise-only features (SSO/SAML/SCIM/advanced billing) in MVP 0/1/2.
- No native mobile app before web MVPs are complete.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn/ui -> Vercel
- **Backend:** Cloudflare Workers + Hono.js -> Cloudflare
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2
- **Auth:** GitHub OAuth + JWT
- **Monorepo:** Turborepo + pnpm workspaces

## Repo Structure

- `apps/web/` - Next.js frontend
- `apps/api/` - Cloudflare Workers backend
- `packages/shared/` - Shared types, Zod schemas, template renderer, checks, guardrails
- `packages/sdk/` - PromptOps SDK (Node/TS)

## Core Entities

`users -> org_members -> orgs -> projects -> (prompts -> prompt_versions, datasets -> dataset_items, eval_configs -> eval_runs -> eval_run_items, runs, api_keys, provider_keys, audit_events)`

## RBAC: OWNER > ADMIN > MEMBER > VIEWER

---

## Progress Tracker

> UPDATE THIS after every completed task. This is how future sessions know where you left off.

**Currently working on:** [Task 12.0 - Initialize shadcn/ui foundation and theme contract]
**Last completed:** [Task 11.3 - Implement RBAC resolver and audit event logging integration]
**Next up:** Task 12.0 - Initialize shadcn/ui foundation and theme contract

### Phase 1 - Scope, Decisions, and Execution Rules

- [x] 1.1 Lock the execution model and success criteria
- [x] 1.2 Freeze architecture guardrails and security principles
- [x] 1.3 Define delivery governance and handoff protocol

### Phase 2 - Monorepo and Workspace Scaffolding

- [x] 2.1 Initialize the monorepo structure and package boundaries
- [x] 2.2 Configure workspace package management and root scripts
- [x] 2.3 Add baseline repository documentation for contributors

### Phase 3 - Tooling, Quality Gates, and CI Baseline

- [x] 3.1 Establish linting, formatting, and type-safety standards across all packages
- [x] 3.2 Set up test strategy skeleton for unit and integration layers
- [x] 3.3 Implement CI workflow and required checks policy

### Phase 4 - Local Development and Environment Contracts

- [x] 4.1 Define local environment variable contracts for frontend and backend
- [x] 4.2 Validate local runtime startup for both apps and shared dependencies
- [x] 4.3 Document local troubleshooting and common failure recovery

### Phase 5 - Cloud Provisioning and Infrastructure Bootstrap

- [x] 5.1 Provision Cloudflare resources and map bindings
- [x] 5.2 Configure production secrets and OAuth provider setup
- [x] 5.3 Provision Vercel project and environment mapping

### MVP 0 - Foundation

- [x] 0.1 Repo + Dev Environment
- [ ] 0.2 Auth + Multi-tenancy
- [ ] 0.3 Prompt Versioning
- [ ] 0.4 UI Shell + Deploy

### MVP 1 - Core Eval Platform

- [ ] 1.1 Dataset Manager
- [ ] 1.2 Eval Config Builder
- [ ] 1.3 Eval Runner
- [ ] 1.4 Eval Report Page
- [ ] 1.5 Guardrails Polish

### MVP 2 - Production Polish

- [ ] 2.1 SDK + Run Logging
- [ ] 2.2 Dashboards
- [ ] 2.3 Demo Polish
- [ ] 2.4 Open Source Launch

---

## How to Use Context Files

Always attach `PROJECT_OVERVIEW.md` plus the relevant domain file(s):

| Working on                     | Attach                  |
| ------------------------------ | ----------------------- |
| Login, OAuth, permissions      | `+ CONTEXT_AUTH`        |
| DB schema, queries, migrations | `+ CONTEXT_DATABASE`    |
| API routes, middleware         | `+ CONTEXT_BACKEND`     |
| Next.js pages, routing         | `+ CONTEXT_FRONTEND`    |
| Styling, components            | `+ CONTEXT_UI_DESIGN`   |
| Eval runner, checks, judge     | `+ CONTEXT_EVAL_ENGINE` |
| SDK package, run logging       | `+ CONTEXT_SDK`         |
| Deploy, CI/CD                  | `+ CONTEXT_DEPLOYMENT`  |

After completing a task, tell Codex: "Mark [task] as complete in the context files."

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-09 - Task 11.3 - Tightened org/project RBAC resolution with owner-management guardrails and structured audit metadata for sensitive tenancy actions.
- 2026-03-09 - Task 11.2 - Added org-scoped project CRUD routes with strict permission enforcement and mutation audit logging.
- 2026-03-09 - Task 11.1 - Added org create/list/detail/member-management and audit-events endpoints with owner safeguards and test coverage.
- 2026-03-08 - Task 10.3 - Added `/api/auth/me` and `/api/auth/logout` with shared contract responses, 401 semantics for missing sessions, and idempotent cookie clearing on logout.
- 2026-03-08 - Task 10.2 - Added signed 7-day HS256 session tokens, secure HttpOnly cookie helpers, and JWT-backed request resolution for dashboard-authenticated routes.
- 2026-03-08 - Task 10.1 - Implemented GitHub authorize/callback routes with CSRF state cookies, provider token exchange, profile/email fetch, user upsert, and frontend redirect outcomes.
- 2026-03-08 - Task 9.3 - Added request-context, auth guard, RBAC resolution, audit queue flush, and API-key rate-limit middleware scaffolding with focused API tests.
- 2026-03-08 - Task 9.2 - Added shared backend error classes, validation helpers, and global error/not-found formatters for the canonical API failure envelope.
- 2026-03-08 - Task 9.1 - Refactored the API app shell around route registration, trusted-origin CORS, security headers, request IDs, and deployment-safe health handling.
- 2026-03-08 - Task 8.1 - Added the canonical shared contract surface for enums, entity DTOs, route metadata, and runtime validation exports in `@promptops/shared`.
- 2026-03-08 - Task 7.3 - Applied the remote D1 migration chain and verified production `_migrations` now includes 001 through 007.
- 2026-03-08 - Task 7.3 - Added full-chain D1 migration validation/apply tooling and verified replay-safe `_migrations` tracking before remote promotion.
- 2026-03-08 - Task 7.2 - Added the required D1 indexes and hot-path query optimizations for planned prompt, eval, SDK run, and audit access patterns.
- 2026-03-08 - Task 7.1 - Completed the D1 domain schema for prompts, datasets, eval entities, runs/keys, and audit events.
- 2026-03-07 - Task 6.3 - Added typed tenancy query helpers and tests so the backend can upsert users and resolve org/project access consistently.
- 2026-03-07 - Task 6.2 - Validated the core tenancy migration locally with deterministic clean-state and replay checks.
- 2026-03-07 - Task 6.1 - Added the first D1 migration for the tenancy tables and wired `_migrations` bookkeeping into the schema bootstrap.
- 2026-03-06 - Task 5.3 - Connected Vercel, mapped the deployed Worker/frontend URLs into public env vars, and documented the current production endpoints.
- 2026-03-06 - Task 5.2 - Registered local/production GitHub OAuth apps and stored the production GitHub, JWT, and encryption secrets in Cloudflare.
- 2026-03-06 - Task 5.1 - Provisioned the Cloudflare Worker resources and bound the production D1 and R2 resources in Wrangler.
- 2026-03-06 - Task 4.3 - Added a local development troubleshooting guide covering dependency, OAuth callback, secret, D1 migration, and CORS recovery steps.
- 2026-03-06 - Task 4.2 - Validated local web and API startup on ports 3000/8787, confirmed `/api/health` output, and documented the local CORS contract.
- 2026-03-06 - Task 3.3 - Added a GitHub Actions CI workflow and documented `CI / validate` as the required branch-protection check.
- 2026-03-06 - Task 3.2 - Added a Vitest-based smoke-test baseline and documented the immediate unit and integration coverage targets.
- 2026-03-06 - Task 3.1 - Established shared ESLint, Prettier, and TypeScript quality gates across all workspaces.
- 2026-03-06 - Task 2.3 - Added root onboarding docs with a quick-start guide, folder map, and contribution workflow.
- 2026-03-02 - Task 4.1 - Added env example files, seeded local env files for web/api, and added gitignore rules for secret files.
- 2026-03-02 - Task 2.2 - Standardized root workspace install/dev/build/lint/typecheck/test scripts and synchronized package-level script entries for consistent monorepo execution.
- 2026-03-02 - Task 2.1 - Initialized apps/packages monorepo boundaries with shared contract entrypoints, starter app skeletons, and ownership guardrails.
- 2026-03-02 - Task 1.3 - Added branch strategy, PR review checklist, definition of done, and mandatory handoff/writeback governance.
- 2026-03-02 - Task 1.2 - Frozen architecture guardrails and security baseline for BYOK, key storage, JWT sessions, RBAC enforcement, and production secrets.
- 2026-03-02 - Task 1.1 - Locked browser-first eval execution, defined MVP 0/1/2 acceptance criteria, and documented scope non-goals.
