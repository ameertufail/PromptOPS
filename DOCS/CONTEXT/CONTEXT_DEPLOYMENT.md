# CONTEXT: Deployment & CI/CD

> Attach with PROJECT_OVERVIEW.md when working on: Vercel deploy, Cloudflare Workers deploy, D1 migrations, R2 setup, CI pipeline, env vars, domains, monitoring

---

## Deployment Architecture

- **Frontend:** Next.js on Vercel free tier (100GB bandwidth/month)
- **Backend:** Cloudflare Workers free tier (100K requests/day)
- **Database:** Cloudflare D1 free tier (5M reads/day, 100K writes/day, 5GB)
- **Storage:** Cloudflare R2 free tier (10GB storage, 10M reads/month)

## Vercel (Frontend)

**Setup:** Create Vercel account → import GitHub repo → set root directory to `apps/web` → set build command to `cd ../.. && pnpm turbo build --filter=web`. Auto-deploys on every push to main. PRs get preview deploys.

**Env vars (set in Vercel dashboard):**
- NEXT_PUBLIC_API_URL = https://promptops-api.your-sub.workers.dev
- NEXT_PUBLIC_APP_URL = https://promptops-studio.vercel.app

## Cloudflare (Backend)

**Setup steps:**
1. Create Cloudflare account
2. Install Wrangler CLI, authenticate with `wrangler login`
3. Create D1 database: `wrangler d1 create promptops-db` → note the database_id
4. Update wrangler.toml with real database_id
5. Run all SQL migrations against production: `wrangler d1 execute promptops-db --file=<path> --remote`
6. Create R2 bucket: `wrangler r2 bucket create promptops-storage`
7. Set secrets: `wrangler secret put JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ENCRYPTION_KEY`
8. Deploy: `wrangler deploy`

**wrangler.toml declares:** Worker name, D1 binding (DB), R2 binding (STORAGE), vars (FRONTEND_URL, ENVIRONMENT). Dev port: 8787.

## Local Development

**Prerequisites:** Node.js 20+, pnpm, Wrangler

**Run locally:**
- Backend: `cd apps/api && pnpm wrangler dev` (port 8787)
- Frontend: `cd apps/web && pnpm dev` (port 3000)
- Or both: `pnpm turbo dev` from root

**Local D1:** Created automatically by Wrangler. Apply migrations with `--local` flag. SQLite file in `.wrangler/state/d1/`.

**Local env files:**
- `apps/web/.env.local` — NEXT_PUBLIC_API_URL=http://localhost:8787, NEXT_PUBLIC_APP_URL=http://localhost:3000
- `apps/api/.dev.vars` — JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ENCRYPTION_KEY (dev values)

## CI Pipeline

GitHub Actions on push/PR: checkout → pnpm install → turbo lint → turbo typecheck → turbo test. On main branch merge: also deploy Worker using CLOUDFLARE_API_TOKEN secret.

**GitHub Secrets needed:** CLOUDFLARE_API_TOKEN (create at Cloudflare Dashboard → API Tokens with Workers Scripts:Edit + D1:Edit permissions)

Vercel auto-deploys from GitHub — no CI config needed for frontend.

## Migration Workflow

1. Create numbered SQL file in `apps/api/src/db/migrations/`
2. Test locally: `wrangler d1 execute promptops-db --file=<path> --local`
3. Apply to production: `wrangler d1 execute promptops-db --file=<path> --remote`
4. Track in _migrations table

## Domain Setup

For MVP: use default Vercel + Workers subdomains. Later: custom domain via Cloudflare Workers custom domains (auto SSL).

## Monitoring

- Cloudflare Dashboard: Workers analytics (requests, CPU time, errors), D1 metrics (read/write counts), R2 metrics
- Worker logs: `wrangler tail` for real-time production logs
- Vercel Dashboard: deployments, Web Vitals, function logs

## Free Tier Limits to Watch

| Resource | Limit |
|----------|-------|
| Workers requests | 100K/day |
| D1 reads | 5M/day |
| D1 writes | 100K/day |
| D1 storage | 5GB |
| R2 storage | 10GB |
| R2 reads | 10M/month |
| Vercel bandwidth | 100GB/month |

## Security Checklist

- All secrets in Wrangler secrets (never in code or wrangler.toml)
- .dev.vars in .gitignore
- GitHub OAuth callback URLs correct for both dev and prod
- CORS configured to only allow frontend domain + localhost
- Strong random values for JWT_SECRET and ENCRYPTION_KEY in production
- No sensitive data in console.log

---

## Deployment Progress

**Initial Setup:**
- [ ] Create Cloudflare account
- [ ] Install + authenticate Wrangler
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
- [ ] Verify health endpoint in production
- [ ] Verify full OAuth flow in production

**CI/CD:**
- [ ] GitHub Actions workflow (lint, typecheck, test)
- [ ] Auto-deploy Worker on main merge
- [ ] CLOUDFLARE_API_TOKEN set in GitHub secrets

**Custom Domain (optional):**
- [ ] Add custom domain to Vercel
- [ ] Add custom domain to Cloudflare Worker
- [ ] Update OAuth callback URLs
- [ ] Update CORS config
- [ ] Update env vars
