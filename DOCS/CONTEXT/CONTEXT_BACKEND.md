# CONTEXT: Backend API

> Attach with `PROJECT_OVERVIEW.md`.

---

## Overview

Hono.js on Cloudflare Workers. Location: `apps/api/`.

## Structure

- `src/index.ts` - app factory, middleware ordering, and top-level handlers
- `src/routes/` - route registration, health endpoint, and future auth/org/project routes
- `src/middleware/` - auth, rbac, audit, rateLimit, security
- `src/services/` - guardrails, diff, summary computation
- `src/db/` - migrations and typed queries
- `src/lib/` - crypto, ULID, errors, validation, request-context

## Worker Bindings

Current local baseline:

- `FRONTEND_URL`
- `ENVIRONMENT`

Production provisioning baseline:

- `DB` (D1)
- `STORAGE` (R2)
- `JWT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ENCRYPTION_KEY`

## Route Pattern

Every route should follow: validate with Zod -> RBAC middleware -> business logic -> audit event -> JSON response. Error format stays `{ error, message, details }`.

## Current Runtime Contract

- `GET /api/health` returns `{ environment, status, service, timestamp }`
- `GET /api/auth/github` and `GET /api/auth/callback` drive the GitHub OAuth browser redirect flow
- `GET /api/auth/me` returns the active session payload or `401` when no valid dashboard session exists
- `POST /api/auth/logout` clears `po_session` and returns `{ success: true }`
- Local CORS allows `http://localhost:3000`, `http://127.0.0.1:3000`, and the configured `FRONTEND_URL`
- Untrusted origins do not receive allow headers
- Unknown API routes return `{ error, message, details }` with a request ID in `details`
- API responses include `X-Request-Id`, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`
- Production Worker URL: `https://promptops-api-production.promptops-ameer.workers.dev`
- Production `FRONTEND_URL`: `https://prompt-ops-web.vercel.app`

## Planned Endpoints

**Auth:** `GET /github`, `GET /callback`, `GET /me`, `POST /logout`

**Orgs:** create, list, detail, membership changes, audit-events

**Projects:** create, list, detail, update, delete, `POST /seed-demo`

**Prompts:** create, list, detail+versions, version creation, release, archive, diff

**Datasets:** create, list, detail+items, update, delete, item CRUD, JSONL import

**Evals:** config create/list/detail/update, run create/status/items/complete

**SDK Runs:** `POST /runs`, project runs list, project stats

**Keys:** api-key CRUD and provider-key CRUD

## Key Patterns

- Audit convention: `entity.action` (example: `prompt.created`, `eval_run.started`)
- Rate limiting: in-memory, 100 req/min per API key on SDK endpoints
- JSONL import: parse line-by-line, validate, batch insert (20/transaction), return imported/failed counts

## Task Progress

- [x] Hono app setup (entrypoint, health route, local CORS baseline)
- [x] API workspace boundary scaffold and shared contract import baseline
- [x] Shared backend DTOs, enums, and route metadata exported from `@promptops/shared`
- [x] Planned API request/response schemas cataloged in the shared validation layer
- [x] Local backend runtime validated on `localhost:8787`
- [x] Backend smoke tests added for the health endpoint and CORS contract
- [x] Production Worker deployed with `DB`, `STORAGE`, and production env bindings
- [x] App factory + route registration shell
- [x] Request context contract + middleware ordering baseline
- [x] Error handling (custom classes, global handler)
- [x] Auth routes
- [x] JWT session middleware
- [ ] API key auth middleware
- [ ] RBAC middleware
- [x] Audit helper
- [x] Rate limit middleware
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

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-08 - Task 10.3 - Added `/api/auth/me` and `/api/auth/logout` with shared contract responses, 401 semantics for missing sessions, and idempotent cookie clearing on logout.
- 2026-03-08 - Task 10.2 - Added signed 7-day session JWTs, secure cookie helpers, and JWT-backed request resolution for dashboard-authenticated routes.
- 2026-03-08 - Task 10.1 - Implemented GitHub authorize/callback routes with CSRF state validation, token exchange, GitHub profile/email fetches, and user upsert redirects.
- 2026-03-08 - Task 9.3 - Added request-context, auth guard, RBAC resolution, audit queue flush, and API-key rate-limit middleware scaffolding with focused API tests.
- 2026-03-08 - Task 9.2 - Added shared backend error classes, validation helpers, and global error/not-found formatters for the canonical API failure envelope.
- 2026-03-08 - Task 9.1 - Refactored the API app shell around route registration, trusted-origin CORS, security headers, request IDs, and deployment-safe health handling.
- 2026-03-08 - Task 8.2 - Added the shared Zod API boundary schemas and route catalog the backend will validate against as routes are implemented.
- 2026-03-08 - Task 8.1 - Moved canonical backend-facing enums and DTOs into `@promptops/shared` so route and query layers stop defining divergent contract types.
- 2026-03-08 - Task 7.2 - Added D1 index coverage for the planned prompt, dataset, eval, run logging, and audit query paths used by backend endpoints.
- 2026-03-08 - Task 7.1 - Added the backend D1 domain migrations for prompts, datasets, eval entities, runs/keys, and audit events.
- 2026-03-07 - Task 6.3 - Added typed tenancy query helpers plus unit tests in `apps/api/src/db` for user upsert, membership resolution, and project access lookups.
- 2026-03-06 - Task 5.1 - Provisioned the production Worker bindings and deployed the backend on Cloudflare with D1/R2 attached.
- 2026-03-06 - Task 4.2 - Validated backend startup on port 8787 and documented the local health/CORS runtime contract.
- 2026-03-06 - Task 3.2 - Added backend smoke coverage for the health endpoint and documented the future integration-test targets.
- 2026-03-02 - Task 2.1 - Scaffolded `apps/api` workspace boundary files and initialized the Hono entrypoint using shared contract constants.
