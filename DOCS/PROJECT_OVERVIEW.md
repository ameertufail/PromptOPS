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


## Documentation Health Rules

Use these rules to keep context continuity across sessions:

- **Single source of truth:** `PROJECT_OVERVIEW.md` owns global decisions and status.
- **Canonical API prefixes:** all backend endpoints are documented with the `/api/...` prefix.
- **Status synchronization:** when a task is done, update both this tracker and the relevant `CONTEXT_*.md` checklist in the same commit.
- **No contradictory architecture notes:** if a fallback pattern is added (for example, CORS/provider compatibility), document why it still preserves BYOK and security assumptions.

---

## Progress Tracker

> UPDATE THIS after every completed task. This is how future sessions know where you left off.

**Currently working on:** [NOT STARTED]
**Last completed:** [NOTHING YET]
**Next up:** Iteration 0.1 — Repo + Dev Environment

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
