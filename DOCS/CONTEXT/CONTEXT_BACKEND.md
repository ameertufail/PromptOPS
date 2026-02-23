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

## All Endpoints (Canonical Paths)

**Auth**
- `GET /api/auth/github`
- `GET /api/auth/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

**Orgs**
- `POST /api/orgs`
- `GET /api/orgs`
- `GET /api/orgs/:orgId`
- `POST /api/orgs/:orgId/members`
- `PATCH /api/orgs/:orgId/members/:userId`
- `DELETE /api/orgs/:orgId/members/:userId`
- `GET /api/orgs/:orgId/audit-events`

**Projects**
- `POST /api/orgs/:orgId/projects` [MEMBER+]
- `GET /api/orgs/:orgId/projects` [VIEWER+]
- `GET /api/projects/:projectId` [VIEWER+]
- `PATCH /api/projects/:projectId` [ADMIN+]
- `DELETE /api/projects/:projectId` [OWNER]
- `POST /api/projects/:projectId/seed-demo` [MEMBER+]

**Prompts**
- `POST /api/projects/:projectId/prompts` [MEMBER+]
- `GET /api/projects/:projectId/prompts` [VIEWER+]
- `GET /api/prompts/:promptId` [VIEWER+]
- `POST /api/prompts/:promptId/versions` [MEMBER+]
- `PATCH /api/prompt-versions/:versionId/release` [ADMIN+]
- `PATCH /api/prompt-versions/:versionId/archive` [MEMBER+]
- `GET /api/prompts/:promptId/diff?baseVersionId=&candidateVersionId=` [VIEWER+]

**Datasets**
- `POST /api/projects/:projectId/datasets` [MEMBER+]
- `GET /api/projects/:projectId/datasets` [VIEWER+]
- `GET /api/datasets/:datasetId` [VIEWER+]
- `PATCH /api/datasets/:datasetId` [MEMBER+]
- `DELETE /api/datasets/:datasetId` [ADMIN+]
- `POST /api/datasets/:datasetId/items` [MEMBER+]
- `POST /api/datasets/:datasetId/items/bulk-jsonl` [MEMBER+]
- `PATCH /api/dataset-items/:itemId` [MEMBER+]
- `DELETE /api/dataset-items/:itemId` [MEMBER+]

**Evals**
- `POST /api/projects/:projectId/eval-configs` [MEMBER+]
- `GET /api/projects/:projectId/eval-configs` [VIEWER+]
- `GET /api/eval-configs/:configId` [VIEWER+]
- `PATCH /api/eval-configs/:configId` [MEMBER+]
- `POST /api/eval-runs` [MEMBER+]
- `GET /api/eval-runs/:runId` [VIEWER+]
- `POST /api/eval-runs/:runId/items` [MEMBER+]
- `PATCH /api/eval-runs/:runId/complete` [MEMBER+]
- `GET /api/eval-runs/:runId/items` [VIEWER+]

**SDK Runs (API key auth)**
- `POST /api/runs`
- `GET /api/projects/:projectId/runs` [VIEWER+]
- `GET /api/projects/:projectId/runs/stats` [VIEWER+]

**Keys**
- `POST /api/projects/:projectId/api-keys` [ADMIN+]
- `GET /api/projects/:projectId/api-keys` [ADMIN+]
- `DELETE /api/api-keys/:keyId` [ADMIN+]
- `POST /api/projects/:projectId/provider-keys` [ADMIN+]
- `GET /api/projects/:projectId/provider-keys` [ADMIN+]
- `DELETE /api/provider-keys/:keyId` [ADMIN+]

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
