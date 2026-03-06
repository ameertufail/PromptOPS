# CONTEXT: Deployment & CI/CD

> Attach with `PROJECT_OVERVIEW.md` when working on Vercel deploy, Cloudflare Workers deploy, D1 migrations, R2 setup, CI pipeline, env vars, domains, and monitoring.

---

## Deployment Architecture

- **Frontend:** Next.js on Vercel free tier (100GB bandwidth/month)
- **Backend:** Cloudflare Workers free tier (100K requests/day)
- **Database:** Cloudflare D1 free tier (5M reads/day, 100K writes/day, 5GB)
- **Storage:** Cloudflare R2 free tier (10GB storage, 10M reads/month)

## Vercel (Frontend)

**Setup:** Create a Vercel account -> import the GitHub repo -> set the root directory to `apps/web` -> set the build command to `cd ../.. && pnpm build`. Preview deploys come from pull requests; production deploys come from `main`.

**Env vars (set in the Vercel dashboard):**

- `NEXT_PUBLIC_API_URL=https://promptops-api.your-sub.workers.dev`
- `NEXT_PUBLIC_APP_URL=https://promptops-studio.vercel.app`

## Cloudflare (Backend)

**Setup steps:**

1. Create a Cloudflare account.
2. Install Wrangler and authenticate with `wrangler login`.
3. Create the D1 database: `wrangler d1 create promptops-db` and record the `database_id`.
4. Update `apps/api/wrangler.toml` with the real `database_id` and future resource bindings.
5. Run SQL migrations against production with `wrangler d1 execute promptops-db --file=<path> --remote`.
6. Create the R2 bucket: `wrangler r2 bucket create promptops-storage`.
7. Set secrets: `wrangler secret put JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ENCRYPTION_KEY`.
8. Deploy with `wrangler deploy`.

`wrangler.toml` currently declares the Worker name, `FRONTEND_URL`, and `ENVIRONMENT`. Future phases add D1 and R2 bindings with real IDs.

## Local Development

**Prerequisites:** Node.js 20+, pnpm via Corepack, Wrangler

**Install:**

- `pnpm install:deps`
- If `wrangler dev` fails immediately after install because `workerd` was not rebuilt locally, run `pnpm rebuild workerd` once.

**Run locally:**

- Backend only: `pnpm --filter @promptops/api dev` (port `8787`)
- Frontend only: `pnpm --filter @promptops/web dev` (port `3000`)
- Both together: `pnpm dev`

**Validated local runtime baseline (2026-03-06):**

- `GET http://localhost:8787/api/health` returns `200 OK`
- Health payload shape: `{ environment, status, service, timestamp }`
- Local CORS allows `http://localhost:3000`, `http://127.0.0.1:3000`, and the configured `FRONTEND_URL`
- Untrusted origins do not receive `Access-Control-Allow-Origin`

**Local env files:**

- `apps/web/.env.local` - `NEXT_PUBLIC_API_URL=http://localhost:8787`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `apps/api/.dev.vars` - `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ENCRYPTION_KEY`
- `apps/api/wrangler.toml` - `FRONTEND_URL=http://localhost:3000`, `ENVIRONMENT=development`

Troubleshooting and recovery steps live in `DOCS/LOCAL_DEVELOPMENT.md`.

## CI Pipeline

GitHub Actions runs on `push` and `pull_request`:

1. Checkout
2. `pnpm install:ci`
3. `pnpm format:check`
4. `pnpm lint`
5. `pnpm typecheck`
6. `pnpm test`

The required branch-protection check is `CI / validate`.

**GitHub secrets needed:** `CLOUDFLARE_API_TOKEN` (Cloudflare API token with Workers Scripts:Edit and D1:Edit permissions) for future deploy automation.

Vercel still handles frontend preview/production deploys from GitHub separately from the repo CI workflow.

## Migration Workflow

1. Create numbered SQL files in `apps/api/src/db/migrations/`.
2. Test locally with `wrangler d1 execute promptops-db --file=<path> --local`.
3. Apply to production with `wrangler d1 execute promptops-db --file=<path> --remote`.
4. Track applied migrations in `_migrations`.

## Domain Setup

For MVP, use the default Vercel and Workers subdomains. Later, add custom domains through Vercel and Cloudflare Workers once OAuth and CORS settings are ready to move.

## Monitoring

- Cloudflare dashboard: Workers analytics, D1 metrics, R2 metrics
- Worker logs: `wrangler tail`
- Vercel dashboard: deployments, Web Vitals, and logs

## Free Tier Limits to Watch

| Resource         | Limit       |
| ---------------- | ----------- |
| Workers requests | 100K/day    |
| D1 reads         | 5M/day      |
| D1 writes        | 100K/day    |
| D1 storage       | 5GB         |
| R2 storage       | 10GB        |
| R2 reads         | 10M/month   |
| Vercel bandwidth | 100GB/month |

## Security Checklist

- All secrets in Wrangler/Vercel/GitHub secret stores only
- `.dev.vars` kept out of git
- GitHub OAuth callback URLs correct for both dev and prod
- CORS limited to the frontend domain plus localhost
- Strong random values for `JWT_SECRET` and `ENCRYPTION_KEY` in production
- No sensitive data in logs

## Production Secret Baseline (Phase 1 Task 1.2)

- **Allowed secret stores only:** Cloudflare Wrangler secrets, Vercel environment variables, and GitHub repository/environment secrets.
- **Disallowed secret locations:** committed files, `wrangler.toml`, CI workflow YAML plaintext, logs, screenshots, and issue comments.
- **Environment separation:** dev/staging/prod use distinct secret values; production deploys are blocked when required secrets are missing or placeholders.
- **Rotation policy:** rotate secrets immediately after suspected exposure; revoke affected sessions or keys when JWT/encryption material changes.
- **Logging hygiene:** redact authorization headers, cookies, and key material; never print decrypted provider keys.

### Phase 1 Secret-Handling Checklist

- [x] Secret-store boundaries documented
- [x] Forbidden secret locations documented
- [x] Environment separation rule documented
- [x] Rotation and incident-response rule documented
- [x] Log-redaction rule documented

---

## Deployment Progress

**Phase 1 Governance:**

- [x] Security baseline documented for production secret storage, environment separation, and rotation policy

**Tooling & Local Baseline:**

- [x] Repository onboarding docs (`README.md`, `CONTRIBUTING.md`, `TESTING.md`, `DOCS/LOCAL_DEVELOPMENT.md`)
- [x] Shared lint, format, and typecheck baseline configured across all workspaces
- [x] Vitest smoke-test skeleton wired into the workspace
- [x] Local web and API startup validated on ports `3000` and `8787`
- [x] Local troubleshooting guide documented

**Initial Setup:**

- [ ] Create Cloudflare account
- [ ] Install and authenticate Wrangler
- [ ] Create D1 database
- [ ] Create R2 bucket
- [ ] Set all Wrangler secrets
- [ ] Create Vercel account
- [ ] Connect GitHub repo to Vercel
- [ ] Set Vercel env vars
- [ ] Register GitHub OAuth App (dev + prod callback URLs)

**First Deploy:**

- [ ] Apply all migrations to production D1
- [ ] Deploy Worker to Cloudflare
- [ ] Deploy frontend to Vercel
- [ ] Verify the health endpoint in production
- [ ] Verify the full OAuth flow in production

**CI/CD:**

- [x] Root workspace command contract (`install:deps`, `install:ci`, `dev`, `build`, `lint`, `typecheck`, `test`)
- [x] GitHub Actions workflow (`format:check`, `lint`, `typecheck`, `test`)
- [x] Required checks policy documented (`CI / validate`)
- [ ] Auto-deploy Worker on main merge
- [ ] `CLOUDFLARE_API_TOKEN` set in GitHub secrets

**Custom Domain (optional):**

- [ ] Add a custom domain to Vercel
- [ ] Add a custom domain to the Cloudflare Worker
- [ ] Update OAuth callback URLs
- [ ] Update CORS config
- [ ] Update env vars

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-06 - Task 4.3 - Added a local development guide with dependency, OAuth, secret, migration, and CORS recovery steps.
- 2026-03-06 - Task 4.2 - Validated local ports, health endpoint behavior, and the trusted local-origin CORS contract for web and API startup.
- 2026-03-06 - Task 3.3 - Added the GitHub Actions validation workflow and documented `CI / validate` as the required branch-protection check.
- 2026-03-06 - Task 3.1 - Added shared ESLint/Prettier standards and enforced them through the root validation commands.
- 2026-03-02 - Task 4.1 - Added env example templates, seeded local env files, and added gitignore secret-file rules for web/api development.
- 2026-03-02 - Task 2.2 - Standardized root install/dev/build/lint/typecheck/test commands and aligned deployment/CI command references to the root script contract.
- 2026-03-02 - Task 1.2 - Finalized production secret-handling rules for approved stores, env separation, rotation, and log redaction.
