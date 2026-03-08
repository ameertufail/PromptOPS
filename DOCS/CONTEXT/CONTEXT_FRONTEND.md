# CONTEXT: Frontend (Next.js)

> Attach with `PROJECT_OVERVIEW.md` when working on pages, routing, data fetching, state management, API client behavior, or React component logic.

---

## Frontend Structure

Located at `apps/web/`. Next.js 14 with the App Router. Entry: `src/app/`.

**Key folders:**

- `src/app/(auth)/` - public auth pages (login, callback)
- `src/app/(dashboard)/` - protected pages with the shared shell
- `src/app/(dashboard)/[orgSlug]/[projectSlug]/` - project-level routes
- `src/components/` - reusable components grouped by domain
- `src/lib/` - API client, auth helpers, LLM client, eval engine, utilities
- `src/hooks/` - custom React hooks

## Routing (URL -> Page)

- `/` - public landing page
- `/login` - GitHub OAuth login button
- `/callback` - post-auth client landing page after the backend session is created
- `/[orgSlug]` - org overview
- `/[orgSlug]/[projectSlug]` - project dashboard
- `/[orgSlug]/[projectSlug]/prompts` - prompt list
- `/[orgSlug]/[projectSlug]/prompts/[promptId]` - prompt detail
- `/[orgSlug]/[projectSlug]/datasets` - dataset list
- `/[orgSlug]/[projectSlug]/datasets/[datasetId]` - dataset detail
- `/[orgSlug]/[projectSlug]/evals` - eval config list
- `/[orgSlug]/[projectSlug]/evals/new` - eval config wizard
- `/[orgSlug]/[projectSlug]/evals/[configId]/runs/[runId]` - eval report
- `/[orgSlug]/[projectSlug]/runs` - SDK runs explorer
- `/[orgSlug]/[projectSlug]/settings` - API keys and provider keys

## Key Architecture Decisions

- Route groups: `(auth)` is public, `(dashboard)` is protected
- API client: fetch wrapper that includes credentials, redirects `401` to login, and surfaces `403`
- State: React Context for auth/org/project, local state for page data, URL params for navigation
- Context hierarchy: `AuthProvider -> OrgProvider -> ProjectProvider -> DashboardLayout -> page`
- Data fetching: client components with `useEffect` plus page-level loading/empty/error states
- Polling: eval run progress polls every 3 seconds until `COMPLETED` or `FAILED`
- Env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`
- GitHub's provider callback targets the backend Worker at `/api/auth/callback`; `/callback` is the frontend handoff route after session initialization

## Current Runtime Contract

- The local web app serves on `http://localhost:3000`
- The scaffold landing page renders successfully without the protected app shell in place yet
- The frontend env template points to the local Worker API at `http://localhost:8787`
- The production frontend is deployed at `https://prompt-ops-web.vercel.app`
- The production public API URL maps to `https://promptops-api-production.promptops-ameer.workers.dev`

## Frontend Progress

**Workspace Foundation:**

- [x] `apps/web` scaffolded with Next.js package boundary files (`package.json`, `tsconfig`, `src/app` entrypoints)
- [x] Frontend import boundary documented to consume shared contracts through `@promptops/shared`
- [x] Canonical entity/status DTOs and route metadata are available to the frontend through `@promptops/shared`
- [x] Canonical request/response validation schemas are available for the future frontend API client layer
- [x] Local frontend startup validated on `localhost:3000`
- [x] Vercel project provisioned with public app/API URL env mapping

**Layout & Navigation:**

- [ ] Root layout (providers, fonts)
- [ ] Auth layout (minimal)
- [ ] Dashboard layout (sidebar + auth check)
- [ ] Sidebar (nav items, org switcher, user menu)
- [ ] Breadcrumb component

**Auth Pages:**

- [ ] Login page
- [ ] Callback page
- [ ] Auth context + `useAuth`
- [ ] API client with auto-auth

**Org & Project:**

- [ ] Org overview page
- [ ] Create org flow
- [ ] Org switcher
- [ ] Create project modal
- [ ] Project dashboard page

**Prompts:**

- [ ] Prompt list page
- [ ] Create prompt modal
- [ ] Prompt detail page
- [ ] Template editor with variable highlighting
- [ ] Variables schema editor
- [ ] Model config form
- [ ] Diff viewer
- [ ] Release/archive buttons

**Datasets:**

- [ ] Dataset list page
- [ ] Create dataset modal
- [ ] Dataset detail page
- [ ] Add/edit item panel
- [ ] JSONL upload UI

**Evals:**

- [ ] Config list page
- [ ] Config wizard
- [ ] Run execution UI
- [ ] Report summary cards
- [ ] Report results table
- [ ] Report side-by-side comparison
- [ ] Report export

**Runs & Dashboard:**

- [ ] Runs explorer page
- [ ] Dashboard stats cards + charts
- [ ] Per-version analytics

**Settings & Polish:**

- [ ] API key management page
- [ ] Provider key management page
- [ ] Empty states for all sections
- [ ] Onboarding flow
- [ ] Public landing page

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-08 - Task 8.2 - Added canonical API boundary schemas so the frontend can validate route payloads against the same contracts as the backend.
- 2026-03-08 - Task 8.1 - Added the shared enums, entity DTOs, and route metadata the frontend will import from `@promptops/shared`.
- 2026-03-06 - Task 5.3 - Provisioned the Vercel project and mapped the deployed Worker/frontend URLs into the frontend env contract.
- 2026-03-06 - Task 4.2 - Validated frontend startup on port 3000 and documented the local runtime contract against the Worker API scaffold.
- 2026-03-02 - Task 4.1 - Added the frontend env template and seeded local `.env.local` with localhost API/app URLs.
- 2026-03-02 - Task 2.1 - Scaffolded `apps/web` workspace boundaries and wired frontend shared-contract usage via `@promptops/shared`.
