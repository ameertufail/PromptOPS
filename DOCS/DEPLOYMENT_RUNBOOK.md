# Phase 5 Deployment Runbook

Use this guide for the manual provisioning work that cannot be done from the repo alone.

## Current Provisioned Values (2026-03-06)

- Frontend URL: `https://prompt-ops-web.vercel.app`
- Backend URL: `https://promptops-api-production.promptops-ameer.workers.dev`
- D1 database: `promptops-db`
- R2 bucket: `promptops-storage`
- Cloudflare `workers.dev` subdomain: `promptops-ameer`

## Required Outputs

Capture these values as you go:

| Item                                     | Where you get it                                       | Where it goes                                           |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| Cloudflare Worker URL                    | `wrangler deploy` output                               | `NEXT_PUBLIC_API_URL`, GitHub production OAuth callback |
| D1 `database_id`                         | `wrangler d1 create ... --update-config` output        | `apps/api/wrangler.toml`                                |
| R2 bucket binding                        | `wrangler r2 bucket create ... --update-config` output | `apps/api/wrangler.toml`                                |
| Vercel production URL                    | Vercel project dashboard                               | `NEXT_PUBLIC_APP_URL`, `FRONTEND_URL`                   |
| Local GitHub OAuth client ID/secret      | GitHub Developer Settings                              | `apps/api/.dev.vars`                                    |
| Production GitHub OAuth client ID/secret | GitHub Developer Settings                              | Wrangler production secrets                             |
| `JWT_SECRET`                             | generated locally                                      | Wrangler production secret                              |
| `ENCRYPTION_KEY`                         | generated locally                                      | Wrangler production secret                              |

## 1. Cloudflare Account And Worker Resources

1. Create or sign in to your Cloudflare account at `https://dash.cloudflare.com/`.
2. In the repo root, authenticate Wrangler:

   ```powershell
   corepack pnpm --filter @promptops/api exec wrangler login
   corepack pnpm --filter @promptops/api exec wrangler whoami
   ```

3. Create the production D1 database and let Wrangler update `apps/api/wrangler.toml` for you:

   ```powershell
   corepack pnpm --filter @promptops/api exec wrangler d1 create promptops-db --location enam --binding DB --use-remote --update-config
   ```

4. Create the production R2 bucket and let Wrangler update `apps/api/wrangler.toml`:

   ```powershell
   corepack pnpm --filter @promptops/api exec wrangler r2 bucket create promptops-storage --location enam --binding STORAGE --use-remote --update-config
   ```

5. After Vercel gives you the frontend production URL, add this block to [`apps/api/wrangler.toml`](../apps/api/wrangler.toml):

   ```toml
   [env.production.vars]
   ENVIRONMENT = "production"
   FRONTEND_URL = "https://prompt-ops-web.vercel.app"
   ```

6. Deploy the Worker:

   ```powershell
   corepack pnpm deploy:api
   ```

7. Copy the production Worker URL from the deploy output and verify the health endpoint:

   ```powershell
   Invoke-WebRequest https://promptops-api.<your-subdomain>.workers.dev/api/health
   ```

## 2. GitHub OAuth Apps

GitHub OAuth Apps do not support one callback setup that cleanly covers both `localhost` and your production domain. Create one app for local development and one for production.

### Local OAuth App

1. Open GitHub and go to `Settings -> Developer settings -> OAuth Apps -> New OAuth App`.
2. Use:
   - Application name: `PromptOps Studio Local`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:8787/api/auth/callback`
3. After the app is created, click `Generate a new client secret`.
4. Put the values into [`apps/api/.dev.vars`](../apps/api/.dev.vars):

   ```text
   GITHUB_CLIENT_ID=<local client id>
   GITHUB_CLIENT_SECRET=<local client secret>
   ```

### Production OAuth App

1. In the same GitHub Developer Settings area, create a second OAuth App.
2. Use:
   - Application name: `PromptOps Studio Production`
   - Homepage URL: `https://prompt-ops-web.vercel.app`
   - Authorization callback URL: `https://promptops-api-production.promptops-ameer.workers.dev/api/auth/callback`
3. Generate the client secret and keep it only in a secure notes manager long enough to set the Wrangler secrets.

## 3. Production Secrets

Generate strong values locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run that command once for `JWT_SECRET` and once for `ENCRYPTION_KEY`.

Then store the production secrets in Cloudflare:

```powershell
corepack pnpm --filter @promptops/api exec wrangler secret put GITHUB_CLIENT_ID --env production
corepack pnpm --filter @promptops/api exec wrangler secret put GITHUB_CLIENT_SECRET --env production
corepack pnpm --filter @promptops/api exec wrangler secret put JWT_SECRET --env production
corepack pnpm --filter @promptops/api exec wrangler secret put ENCRYPTION_KEY --env production
```

Paste each value only when Wrangler prompts for it. Do not put them in `wrangler.toml`, `.env` files committed to git, screenshots, or issue comments.

## 3.1 Phase 7 D1 Migration Promotion

Run this after pulling the Phase 7 migration files locally and before you start Phase 8 work against production data.

1. Validate the full migration chain locally:

   ```powershell
   corepack pnpm --filter @promptops/api db:validate:all
   ```

2. Apply the migrations to the remote D1 database:

   ```powershell
   corepack pnpm --filter @promptops/api db:apply:all:remote
   ```

3. Confirm `_migrations` was written correctly:

   ```powershell
   corepack pnpm --filter @promptops/api exec wrangler d1 execute promptops-db --remote --command "SELECT name, applied_at FROM _migrations ORDER BY name;"
   ```

4. In the Cloudflare dashboard, open `Workers & Pages -> D1 -> promptops-db -> Console` and run the same `_migrations` query if you want a UI-side double check.

5. If the migration list is missing any numbered file, stop and do not continue to Phase 8 route or contract work against production.

## 4. Vercel Project

1. Open `https://vercel.com/new`.
2. Import the GitHub repository.
3. In the project settings during import, use:
   - Framework Preset: `Next.js`
   - Root Directory: `apps/web`
   - Build Command: `cd ../.. && corepack pnpm build:web`
4. Add production environment variables:
   - `NEXT_PUBLIC_API_URL=https://promptops-api-production.promptops-ameer.workers.dev`
   - `NEXT_PUBLIC_APP_URL=https://prompt-ops-web.vercel.app`
5. Deploy once and record the assigned production URL.
6. If the final Vercel URL is not `https://prompt-ops-web.vercel.app`, update:
   - the GitHub production OAuth app Homepage URL
   - the `FRONTEND_URL` value under `[env.production.vars]` in [`apps/api/wrangler.toml`](../apps/api/wrangler.toml)
   - `NEXT_PUBLIC_APP_URL` in Vercel

## 5. Verification Checklist

- `apps/api/wrangler.toml` contains real `DB` and `STORAGE` bindings plus `[env.production.vars]`
- Cloudflare production secrets exist for `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, and `ENCRYPTION_KEY`
- Vercel production env vars exist for `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL`
- `GET https://promptops-api-production.promptops-ameer.workers.dev/api/health` returns `200`
- The GitHub production OAuth app callback URL matches the Worker domain exactly

## 6. Optional CI Token For Later Automation

When you are ready to automate Worker deploys from GitHub Actions:

1. Open Cloudflare `My Profile -> API Tokens -> Create Token`.
2. Create a custom token with the minimum account permissions needed for Workers, D1, and R2 updates.
3. In GitHub, open `Repository -> Settings -> Secrets and variables -> Actions`.
4. Add a repository secret named `CLOUDFLARE_API_TOKEN`.
