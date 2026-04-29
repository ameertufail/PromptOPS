# Local Development Guide

## Prerequisites

- Node.js 20+
- pnpm 10.2.0 via Corepack
- Wrangler CLI

## Environment Files

- `apps/web/.env.local`
  - `NEXT_PUBLIC_API_URL=http://localhost:8787`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `apps/api/.dev.vars`
  - `JWT_SECRET`
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `ENCRYPTION_KEY`
- `apps/api/wrangler.toml`
  - `FRONTEND_URL=http://localhost:3000`
  - `ENVIRONMENT=development`

## Install

```bash
pnpm install:deps
```

## Start The Apps

Run both apps together:

```bash
pnpm dev
```

Run them independently:

```bash
pnpm --filter @promptops/api dev
pnpm --filter @promptops/web dev
```

## Code Quality Commands

Run all linting, formatting, and type checking in one command:

```bash
pnpm fix
```

This runs the following in sequence:

1. `pnpm lint:fix` — auto-fixes ESLint errors across all packages (unused imports, formatting rules, etc.)
2. `pnpm format` — formats all files with Prettier
3. `pnpm typecheck` — reports TypeScript type errors (these cannot be auto-fixed)

You can also run each step individually:

| Command          | Description                                   |
| ---------------- | --------------------------------------------- |
| `pnpm lint`      | Check for lint errors (strict, zero warnings) |
| `pnpm lint:fix`  | Auto-fix lint errors across all packages      |
| `pnpm format`    | Format all files with Prettier                |
| `pnpm typecheck` | Report TypeScript type errors (no auto-fix)   |
| `pnpm fix`       | Run lint:fix + format + typecheck in sequence |

## Validated Local Runtime Baseline

The following behaviors were validated for the scaffold on 2026-03-06:

- Web app serves on `http://localhost:3000`
- API serves on `http://localhost:8787`
- `GET http://localhost:8787/api/health` returns JSON with `status`, `service`, `environment`, and `timestamp`
- Requests from `http://localhost:3000` receive `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials`
- Requests from untrusted origins do not receive CORS allow headers

PowerShell health check:

```powershell
Invoke-WebRequest http://localhost:8787/api/health
```

## Troubleshooting

### Missing dependencies or `pnpm` command failures

- Run `corepack enable`.
- Re-run `pnpm install:deps`.
- If the lockfile changed, use `pnpm install` locally and commit the updated `pnpm-lock.yaml`.

### Auth callback mismatch

This becomes relevant once the OAuth routes are enabled.

- Confirm the local GitHub OAuth app callback URL is `http://localhost:8787/api/auth/callback`.
- Keep `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- Keep `FRONTEND_URL=http://localhost:3000` in `apps/api/wrangler.toml`.
- Keep `BACKEND_URL=http://localhost:8787` in `apps/api/wrangler.toml` for local direct API auth.
- Use a separate production GitHub OAuth app instead of reusing local credentials.

### Missing secrets in `apps/api/.dev.vars`

- Copy `apps/api/.dev.vars.example` to `.dev.vars` if the file is missing.
- Provide non-placeholder values for `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `ENCRYPTION_KEY`.
- Restart `wrangler dev` after changing secrets.

### D1 migration mismatch

This becomes relevant once migrations are added under `apps/api/src/db/migrations`.

- Re-run the expected migration file with `wrangler d1 execute <db-name> --file=<path> --local`.
- If the local state is irreparably out of sync, remove `.wrangler/state/` and re-apply the migrations locally.
- Never assume local D1 state matches production without replaying the same migration files.

### Port or CORS mismatch

- Make sure the web app is running on port `3000` and the API on `8787`.
- Keep `FRONTEND_URL` in `apps/api/wrangler.toml` aligned to the web origin.
- If browser requests fail but the health endpoint works directly, inspect the `Origin` header and verify it matches the trusted local frontend origin.
