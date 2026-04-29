# PromptOPS

PromptOps Studio is a lightweight LLMOps platform for prompt versioning, evaluation, and monitoring with a BYOK (Bring Your Own Key) architecture.

Full context: `DOCS/main.md`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS v4, shadcn/ui, Motion |
| Backend | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Language | TypeScript (strict) |
| Package Manager | pnpm 10.2.0 (via Corepack) |
| Build System | Turborepo |
| Testing | Vitest |
| Auth | GitHub OAuth + JWT sessions |
| Eval | BYOK — LLM calls run in the browser using the user's own API keys |

## Monorepo Structure

```
apps/web          → Next.js frontend (Vercel)
apps/api          → Hono API on Cloudflare Workers
packages/shared   → Canonical contracts: types, constants, schemas, eval helpers
packages/sdk      → External TypeScript SDK for run logging
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install:deps` | Install all dependencies via Corepack |
| `pnpm dev` | Start all apps in parallel (web :3000, api :8787) |
| `pnpm build` | Build all workspaces |
| `pnpm test` | Run Vitest across all workspaces |
| `pnpm lint` | Lint all workspaces (strict, zero warnings) |
| `pnpm lint:fix` | Auto-fix lint errors |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm typecheck` | TypeScript type checking across all workspaces |
| `pnpm fix` | Run lint:fix + format + typecheck in sequence |

Filter by workspace: `pnpm --filter @promptops/web dev` or `pnpm --filter @promptops/api dev`

## Code Conventions

### Formatting (Prettier)

- Double quotes (singleQuote: false)
- Semicolons required
- No trailing comma (trailingComma: "none")

### IDs

All entity IDs use **ULID** format (time-sortable, globally unique). Generated via `apps/api/src/lib/ulid.ts`.

### Error Handling

Backend errors use a typed class hierarchy extending `AppError`:

- `ValidationError` (400) — invalid input, Zod parse failures
- `AuthenticationError` (401) — missing/invalid session or API key
- `AuthorizationError` (403) — insufficient RBAC role
- `NotFoundError` (404) — entity not found
- `ConflictError` (409) — duplicate slug, version conflict
- `RateLimitError` (429) — API key rate limit exceeded
- `InternalServerError` (500) — unexpected failures

All errors return the `ApiErrorResponse` envelope: `{ error: ApiErrorCode, message: string, details?: JsonValue }`

### API Middleware Chain (order matters)

1. `requestContext` — assigns X-Request-Id
2. `apiSecurityHeadersMiddleware` — HSTS, CSP headers
3. `apiCorsMiddleware` — origin validation, credentials
4. `resolveRequestIdentity` — session JWT or API key auth
5. `auditMiddleware` — collects and flushes audit events

### RBAC Roles

Role hierarchy: `VIEWER (1) < MEMBER (2) < ADMIN (3) < OWNER (4)`

Route-level access enforced via `resolveOrgAccess()`, `resolveProjectAccess()`, and `requireMinimumRole()`.

## Import Boundaries

`@promptops/shared` is the **single contract boundary** between all workspaces.

- `apps/web` → may import from `@promptops/shared`
- `apps/api` → may import from `@promptops/shared`
- `packages/sdk` → may import from `@promptops/shared`
- `packages/shared` → must **never import** from `apps/*` or other packages
- Do not deep-import into `packages/*/src/*` from other workspaces — use package entrypoints only

## Testing

- **Framework:** Vitest (root config at `vitest.config.ts`)
- **Convention:** Test files use `.test.ts` or `.spec.ts` suffix, co-located with source
- **Run all:** `pnpm test`
- **Run one workspace:** `pnpm --filter @promptops/api test`
- New behavior must ship with at least one test that protects it

## Environment Setup

Three env files are required for local development:

| File | Location | Key Variables |
|------|----------|--------------|
| `.env.local` | `apps/web/` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` |
| `.dev.vars` | `apps/api/` | `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ENCRYPTION_KEY` |
| `wrangler.toml` | `apps/api/` | `FRONTEND_URL`, `ENVIRONMENT` |

Copy from `.dev.vars.example` if `.dev.vars` is missing. See `DOCS/LOCAL_DEVELOPMENT.md` for full setup.

## Context Files

Read the relevant context file **before working on** a domain. Each file contains complete architecture docs for that area.

| Domain | Context File |
|--------|-------------|
| Frontend | `DOCS/CONTEXT/CONTEXT_FRONTEND.md` |
| Backend | `DOCS/CONTEXT/CONTEXT_BACKEND.md` |
| Auth | `DOCS/CONTEXT/CONTEXT_AUTH.md` |
| Database | `DOCS/CONTEXT/CONTEXT_DATABASE.md` |
| Eval Engine | `DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md` |
| UI Design | `DOCS/CONTEXT/CONTEXT_UI_DESIGN.md` |
| SDK | `DOCS/CONTEXT/CONTEXT_SDK.md` |
| Deployment | `DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md` |

## Critical Rules

1. **Never commit secrets.** Files `.env.local`, `.dev.vars`, and any file containing API keys or credentials are in `.gitignore`. Do not commit them.
2. **Shared is the source of truth.** All cross-workspace types, constants, and schemas live in `packages/shared`. Do not duplicate them.
3. **BYOK architecture.** LLM inference runs in the user's browser with their own API keys. The backend never proxies LLM calls (except as an explicit CORS fallback).
4. **Validate at boundaries.** Use Zod schemas from `@promptops/shared` for all API input validation. Do not add redundant validation inside services.
5. **Commits and PRs.** Write concise commit messages. PRs should have a summary and test plan. Do not push to main without CI passing.
6. **No unused code.** Do not leave dead code, commented-out blocks, or unused imports. ESLint enforces `no-unused-vars` with `_` prefix exception.
7. **Run `pnpm fix` before committing.** This catches lint errors, formatting issues, and type errors in one pass.
