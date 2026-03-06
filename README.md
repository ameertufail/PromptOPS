# PromptOps Studio

PromptOps Studio is a browser-first LLMOps platform for versioning prompts, running evals, and logging production runs without proxying model traffic through the backend.

## Current Baseline

- Monorepo scaffolding is in place for `apps/web`, `apps/api`, `packages/shared`, and `packages/sdk`.
- Local development currently validates the Next.js frontend, the Cloudflare Worker API, and the shared workspace tooling baseline.
- The API scaffold exposes `GET /api/health`; feature routes land in later phases.

## Prerequisites

- Node.js 20+
- pnpm 10.2.0 via Corepack
- Wrangler CLI access for backend development

## Quick Start

```bash
pnpm install:deps
pnpm dev
```

Before starting the apps, copy or confirm the local env files:

- `apps/web/.env.local`
- `apps/api/.dev.vars`

The seeded local templates already point the web app to `http://localhost:8787` and the backend to `http://localhost:3000` as the trusted frontend origin.

## Local Runtime Contract

| Surface      | Command                                | Expected URL            | Notes                                                   |
| ------------ | -------------------------------------- | ----------------------- | ------------------------------------------------------- |
| Web app      | `pnpm --filter @promptops/web dev`     | `http://localhost:3000` | Next.js App Router frontend                             |
| API app      | `pnpm --filter @promptops/api dev`     | `http://localhost:8787` | Cloudflare Worker via Wrangler                          |
| Health check | `GET http://localhost:8787/api/health` | `200 OK`                | Returns `status`, `service`, `environment`, `timestamp` |

Local CORS is limited to `http://localhost:3000` and `http://127.0.0.1:3000`, plus the configured `FRONTEND_URL` value in [`apps/api/wrangler.toml`](apps/api/wrangler.toml).

## Folder Map

- `apps/web` - Next.js frontend shell and future dashboard/auth UI
- `apps/api` - Cloudflare Worker API, health endpoint, and future auth/data routes
- `packages/shared` - Cross-workspace contracts and utilities
- `packages/sdk` - External SDK client package
- `DOCS` - Product plan, context trackers, and local development guidance
- `MONOREPO_BOUNDARIES.md` - Ownership and import rules

## Workspace Commands

- `pnpm dev` - run all workspace dev servers in parallel
- `pnpm build` - type-safe build checks for all workspaces
- `pnpm lint` - run ESLint in every workspace
- `pnpm format:check` - verify Prettier formatting
- `pnpm typecheck` - run TypeScript checks in every workspace
- `pnpm test` - run Vitest smoke and unit tests across the workspace

## Contributor Docs

- [`CONTRIBUTING.md`](CONTRIBUTING.md) - branch strategy, validation rules, and documentation writeback requirements
- [`TESTING.md`](TESTING.md) - unit/integration test strategy and current coverage baseline
- [`DOCS/LOCAL_DEVELOPMENT.md`](DOCS/LOCAL_DEVELOPMENT.md) - local startup, verification steps, and troubleshooting
- [`DOCS/PROJECT_OVERVIEW.md`](DOCS/PROJECT_OVERVIEW.md) - project status and phase tracker
