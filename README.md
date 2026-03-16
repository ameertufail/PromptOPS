# PromptOps Studio

An open-source LLMOps platform for versioning prompts, evaluating against datasets, enforcing guardrails, and monitoring production quality — with **$0 infrastructure cost** and full **BYOK (Bring Your Own Key)** control.

## Features

- **Prompt Versioning** — Immutable versions with diffs, release gates, and one-click rollback
- **Dataset Management** — Golden sets with structured inputs, JSONL bulk import, and validation
- **Browser-Side Evals** — Run evaluations directly in your browser with your own API keys
- **Guardrails & Checks** — JSON schema validation, regex matching, PII detection, prompt injection heuristics
- **LLM-as-Judge** — Optional judge scoring with configurable models and providers
- **Reports & Analytics** — Pass rates, verdict distributions, regressions, and latency trends
- **SDK & Run Logging** — TypeScript SDK to log production runs with retry and backoff
- **Multi-Tenancy** — Organizations, projects, and role-based access control (OWNER/ADMIN/MEMBER/VIEWER)
- **GitHub OAuth** — One-click sign in, no password management

## Architecture

```
Frontend (Next.js 14)           Backend (Cloudflare Workers)
Vercel free tier                Hono.js + D1 + R2
        │                               │
        │  API calls + credentials      │
        └──────────────────────────────►│
                                        │
LLM Providers (BYOK)                   │
User's browser ──► OpenAI/Anthropic     │ stores results only
```

**Key design decision:** LLM inference calls go directly from the browser to the provider using the user's own API key. The backend never proxies inference — it only stores results, manages auth, and computes summaries.

## Tech Stack

| Layer    | Technology                          | Hosting           |
| -------- | ----------------------------------- | ----------------- |
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui | Vercel (free)     |
| Backend  | Hono.js on Cloudflare Workers       | Cloudflare (free) |
| Database | Cloudflare D1 (SQLite)              | Cloudflare (free) |
| Storage  | Cloudflare R2                       | Cloudflare (free) |
| Auth     | GitHub OAuth + JWT                  | Free              |
| Monorepo | pnpm workspaces                     | —                 |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm via Corepack (`corepack enable`)
- Wrangler CLI (for backend development)

### Install and Run

```bash
git clone https://github.com/promptops/studio.git
cd studio
pnpm install:deps
pnpm dev
```

This starts:

- **Frontend** at `http://localhost:3000`
- **Backend** at `http://localhost:8787`

### Environment Setup

Copy the env templates before first run:

```bash
# Frontend
cp apps/web/.env.local.example apps/web/.env.local

# Backend (secrets for local OAuth)
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Edit `apps/api/.dev.vars` with your GitHub OAuth app credentials (create one at [github.com/settings/developers](https://github.com/settings/developers) with callback URL `http://localhost:8787/api/auth/callback`).

## Repo Structure

```
apps/
  web/          Next.js frontend (App Router)
  api/          Cloudflare Workers backend (Hono.js)
packages/
  shared/       Shared types, Zod schemas, eval utilities
  sdk/          TypeScript SDK for run logging
DOCS/           Context trackers and guides
```

## Workspace Commands

| Command             | Description                             |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | Start all dev servers in parallel       |
| `pnpm build`        | Build all workspaces                    |
| `pnpm lint`         | Lint all workspaces                     |
| `pnpm typecheck`    | TypeScript checks across all workspaces |
| `pnpm test`         | Run all tests                           |
| `pnpm format:check` | Verify Prettier formatting              |
| `pnpm deploy:api`   | Deploy Worker to Cloudflare production  |

## SDK Usage

Install the SDK in your application:

```bash
npm install github:promptops/studio#packages/sdk
```

Log production runs:

```typescript
import { PromptOpsClient } from "@promptops/sdk";

const client = new PromptOpsClient({
  apiKey: "po_sk_your_api_key_here"
});

// Log a run manually
await client.logRun({
  input: { prompt: "Classify this ticket" },
  output: "billing",
  metrics: { latencyMs: 234 }
});

// Or wrap your LLM call for automatic logging
const result = await client.instrumentedGenerate({
  fn: () => openai.chat.completions.create({ ... }),
  input: { prompt: "Classify this ticket" },
  outputExtractor: (r) => r.choices[0].message.content
});
```

See [`packages/sdk/examples/`](packages/sdk/examples/) for full examples.

## Deployment

### Backend (Cloudflare Workers)

1. Authenticate: `wrangler login`
2. Set secrets: `wrangler secret put JWT_SECRET --env production`
3. Deploy: `pnpm deploy:api`

### Frontend (Vercel)

Connect the GitHub repo to Vercel, set root directory to `apps/web`, and configure:

- `NEXT_PUBLIC_API_URL` = your Worker URL
- `NEXT_PUBLIC_APP_URL` = your Vercel URL

### CI/CD

Push to `main` triggers:

- **CI**: format check, lint, typecheck, tests
- **Deploy**: Worker deployment + D1 migration application

See [`.github/workflows/`](.github/workflows/) for workflow details.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch strategy, PR checklist, and documentation writeback rules.

Additional docs:

- [`TESTING.md`](TESTING.md) — Test strategy and coverage
- [`DOCS/LOCAL_DEVELOPMENT.md`](DOCS/LOCAL_DEVELOPMENT.md) — Local setup and troubleshooting
- [`DOCS/PROJECT_OVERVIEW.md`](DOCS/PROJECT_OVERVIEW.md) — Project status tracker

## License

[MIT](LICENSE)
