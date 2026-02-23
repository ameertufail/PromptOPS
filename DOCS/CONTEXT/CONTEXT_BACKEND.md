# CONTEXT: Backend API

> Attach with: PROJECT_OVERVIEW.md

---

## Overview

Hono.js on Cloudflare Workers. Location: `apps/api/`.

## Structure

- `src/index.ts` — Entry, route registration, CORS, logging
- `src/routes/` — auth, orgs, projects, prompts, datasets, evals, runs, keys, demo
- `src/middleware/` — auth, rbac, audit, rateLimit
- `src/services/` — guardrails, diff, summary computation
- `src/db/` — migrations/ and queries.ts
- `src/lib/` — crypto, ulid, errors, validation

## Worker Bindings

DB (D1), STORAGE (R2), secrets: JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ENCRYPTION_KEY

## Route Pattern

Every route: validate with Zod → RBAC middleware → business logic → audit event → JSON response. Error format: `{ error, message, details }`.

## All Endpoints

**Auth:** GET github, GET callback, GET me, POST logout

**Orgs:** POST create, GET list, GET detail, POST/PATCH/DELETE members, GET audit-events

**Projects:** POST create [MEMBER+], GET list [VIEWER+], GET detail [VIEWER+], PATCH update [ADMIN+], DELETE [OWNER], POST seed-demo [MEMBER+]

**Prompts:** POST create [MEMBER+], GET list [VIEWER+], GET detail+versions [VIEWER+], POST version [MEMBER+], PATCH release [ADMIN+], PATCH archive [MEMBER+], GET diff [VIEWER+]

**Datasets:** POST create [MEMBER+], GET list [VIEWER+], GET detail+items [VIEWER+], PATCH update [MEMBER+], DELETE [ADMIN+], POST item [MEMBER+], POST bulk JSONL [MEMBER+], PATCH/DELETE item [MEMBER+]

**Evals:** POST config [MEMBER+], GET configs [VIEWER+], GET/PATCH config [MEMBER+], POST run [MEMBER+], GET run status [VIEWER+], POST run item [MEMBER+], PATCH run complete [MEMBER+], GET run items [VIEWER+]

**SDK Runs (API key auth):** POST /runs, GET project runs [VIEWER+], GET project stats [VIEWER+]

**Keys:** POST/GET/DELETE api-keys [ADMIN+], POST/GET/DELETE provider-keys [ADMIN+]

## Key Patterns

- Audit convention: `entity.action` (e.g., prompt.created, eval_run.started)
- Rate limiting: in-memory, 100 req/min per API key on SDK endpoint
- JSONL import: parse line-by-line, validate, batch insert (20/tx), return imported/failed counts

---

## Task Progress

- [ ] Hono app setup (index.ts, CORS, bindings)
- [ ] Auth routes
- [ ] Auth middleware (JWT + API key)
- [ ] RBAC middleware
- [ ] Audit helper
- [ ] Rate limit middleware
- [ ] Error handling (custom classes, global handler)
- [ ] Org routes
- [ ] Project routes
- [ ] Prompt routes + versions
- [ ] Diff endpoint
- [ ] Release/archive endpoints
- [ ] Dataset routes
- [ ] Dataset item routes
- [ ] JSONL bulk import
- [ ] Eval config routes
- [ ] Eval run routes (create, status, items, complete)
- [ ] Summary computation service
- [ ] Run logging endpoint
- [ ] Run stats endpoint
- [ ] API key routes
- [ ] Provider key routes
- [ ] Demo seed endpoint
