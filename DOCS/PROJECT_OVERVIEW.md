# PromptOps Studio — Project Overview

> ALWAYS attach this file in every session. Then attach the relevant CONTEXT_*.md.

---

## What Is This?

An open-source LLMOps platform. Developers version prompts, evaluate them against datasets, enforce guardrails, and monitor production quality.

## Core Decisions

- **BYOK (Bring Your Own Key):** We never proxy LLM inference. Users bring their own API keys. Calls go browser → provider directly.
- **$0 Infrastructure:** Vercel free (frontend), Cloudflare Workers free (API), D1 free (DB), R2 free (storage), GitHub OAuth free (auth).
- **Client-side eval execution:** Eval runner runs in browser. Backend only stores results.
- **Open source (MIT) + hosted version** becomes paid product later.

## Execution Model Lock (Phase 1 Task 1.1)

- Browser-orchestrated eval execution is the primary and default model for MVP 0/1/2.
- Backend scope for evals is limited to run lifecycle APIs, idempotent result persistence, summaries, auth, and audit.
- Thin Worker passthrough for provider CORS edge cases is an explicit fallback only, never the default path.
- Any proposal that makes server-side orchestration the default must be treated as post-MVP scope and require explicit architecture sign-off.

## Architecture Guardrails & Security Baseline (Phase 1 Task 1.2)

- BYOK remains browser-first: provider inference calls run from client orchestration, with Worker passthrough allowed only as an explicit fallback for provider CORS edge cases.
- Provider keys are encrypted at rest with AES-256-GCM using `ENCRYPTION_KEY`; decrypted values are never persisted or logged.
- SDK API keys are stored as SHA-256 hashes only; plaintext is shown once at creation and never retrievable afterwards.
- Dashboard auth uses backend-issued JWT sessions in `po_session` cookie with `HttpOnly`, `SameSite=Lax`, `Secure` in production, and 7-day max expiry.
- RBAC is enforced server-side on every protected route using org/project membership resolution with deny-by-default behavior.
- Production secrets are allowed only in platform secret stores (Wrangler/Vercel/GitHub), never in committed files, logs, or placeholder production configs.

### Phase 1 Security Baseline Checklist
- [x] BYOK execution boundary locked
- [x] Key storage and secret-masking rules locked
- [x] JWT/cookie session policy locked
- [x] RBAC deny-by-default policy locked
- [x] Production secret handling policy locked

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
- API key lifecycle + SDK run logging are production-usable.
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

- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn/ui → Vercel
- **Backend:** Cloudflare Workers + Hono.js → Cloudflare
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2
- **Auth:** GitHub OAuth + JWT
- **Monorepo:** Turborepo + pnpm workspaces

## Repo Structure

- `apps/web/` — Next.js frontend
- `apps/api/` — Cloudflare Workers backend
- `packages/shared/` — Shared types, Zod schemas, template renderer, checks, guardrails
- `packages/sdk/` — PromptOps SDK (Node/TS)

## Core Entities

users → org_members → orgs → projects → (prompts → prompt_versions, datasets → dataset_items, eval_configs → eval_runs → eval_run_items, runs, api_keys, provider_keys, audit_events)

## RBAC: OWNER > ADMIN > MEMBER > VIEWER

---

## Progress Tracker

> UPDATE THIS after every completed task. This is how future sessions know where you left off.

**Currently working on:** [Task 1.3 - Define delivery governance and handoff protocol]
**Last completed:** [Task 1.2 - Architecture guardrails and security baseline lock]
**Next up:** Task 1.3 - Define delivery governance and handoff protocol

### Phase 1 — Scope, Decisions, and Execution Rules
- [x] 1.1 Lock the execution model and success criteria
- [x] 1.2 Freeze architecture guardrails and security principles
- [ ] 1.3 Define delivery governance and handoff protocol

### MVP 0 — Foundation
- [ ] 0.1 Repo + Dev Environment
- [ ] 0.2 Auth + Multi-tenancy
- [ ] 0.3 Prompt Versioning
- [ ] 0.4 UI Shell + Deploy

### MVP 1 — Core Eval Platform
- [ ] 1.1 Dataset Manager
- [ ] 1.2 Eval Config Builder
- [ ] 1.3 Eval Runner
- [ ] 1.4 Eval Report Page
- [ ] 1.5 Guardrails Polish

### MVP 2 — Production Polish
- [ ] 2.1 SDK + Run Logging
- [ ] 2.2 Dashboards
- [ ] 2.3 Demo Polish
- [ ] 2.4 Open Source Launch

---

## How to Use Context Files

Always attach PROJECT_OVERVIEW.md + the relevant domain file(s):

| Working on | Attach |
|-----------|--------|
| Login, OAuth, permissions | + CONTEXT_AUTH |
| DB schema, queries, migrations | + CONTEXT_DATABASE |
| API routes, middleware | + CONTEXT_BACKEND |
| Next.js pages, routing | + CONTEXT_FRONTEND |
| Styling, components | + CONTEXT_UI_DESIGN |
| Eval runner, checks, judge | + CONTEXT_EVAL_ENGINE |
| SDK package, run logging | + CONTEXT_SDK |
| Deploy, CI/CD | + CONTEXT_DEPLOYMENT |

After completing a task, tell Claude: "Mark [task] as complete in the context files."


## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-02 - Task 1.2 - Frozen architecture guardrails and security baseline for BYOK, key storage, JWT sessions, RBAC enforcement, and production secrets.
- 2026-03-02 - Task 1.1 - Locked browser-first eval execution, defined MVP 0/1/2 acceptance criteria, and documented scope non-goals.
- 2026-03-02 - Task 4.1 - Added env example files, seeded local env files for web/api, and added gitignore rules for secret files.


