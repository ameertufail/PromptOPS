# CONTEXT: Frontend (Next.js)

> Attach with PROJECT_OVERVIEW.md when working on: Pages, routing, data fetching, state management, API client, React component logic

---

## Frontend Structure

Located at `apps/web/`. Next.js 14 with App Router. Entry: `src/app/`.

**Key folders:**
- `src/app/(auth)/` — Public auth pages (login, callback). Minimal layout, no sidebar.
- `src/app/(dashboard)/` — Protected pages. Layout has sidebar + auth check.
- `src/app/(dashboard)/[orgSlug]/[projectSlug]/` — All project-level pages nested here.
- `src/components/` — Reusable components grouped by domain (ui/, layout/, prompts/, datasets/, evals/, runs/)
- `src/lib/` — API client, auth helpers, LLM client, eval engine, utilities
- `src/hooks/` — Custom React hooks

## Routing (URL → Page)

- `/` → Public landing page
- `/login` → GitHub OAuth login button
- `/callback` → OAuth callback handler
- `/[orgSlug]` → Org overview (project list)
- `/[orgSlug]/[projectSlug]` → Project dashboard (stats, quick links)
- `/[orgSlug]/[projectSlug]/prompts` → Prompt list
- `/[orgSlug]/[projectSlug]/prompts/[promptId]` → Prompt detail (versions, editor, diff)
- `/[orgSlug]/[projectSlug]/datasets` → Dataset list
- `/[orgSlug]/[projectSlug]/datasets/[datasetId]` → Dataset items table
- `/[orgSlug]/[projectSlug]/evals` → Eval config list
- `/[orgSlug]/[projectSlug]/evals/new` → Eval config wizard
- `/[orgSlug]/[projectSlug]/evals/[configId]/runs/[runId]` → Eval report
- `/[orgSlug]/[projectSlug]/runs` → SDK runs explorer
- `/[orgSlug]/[projectSlug]/settings` → API keys, provider keys

## Key Architecture Decisions

- Route groups: `(auth)` = public/no sidebar, `(dashboard)` = protected/sidebar
- API client: fetch wrapper, auto-includes cookies, handles 401→login redirect, 403→toast
- State: React Context for auth/org/project, useState for page data, URL params for nav. No Redux/Zustand needed.
- Context hierarchy: AuthProvider → OrgProvider → ProjectProvider → DashboardLayout → page
- Data fetching: Client components with useEffect + api.get(). Skeletons while loading. Empty states when no data.
- Polling: For eval run progress, poll every 3 seconds until COMPLETED/FAILED
- Env vars: NEXT_PUBLIC_API_URL (backend), NEXT_PUBLIC_APP_URL (frontend, for OAuth)

---

## Frontend Progress

**Layout & Navigation:**
- [ ] Root layout (providers, fonts)
- [ ] Auth layout (minimal)
- [ ] Dashboard layout (sidebar + auth check)
- [ ] Sidebar (nav items, org switcher, user menu)
- [ ] Breadcrumb component

**Auth Pages:**
- [ ] Login page
- [ ] Callback page
- [ ] Auth context + useAuth hook
- [ ] API client with auto-auth

**Org & Project:**
- [ ] Org overview page (project list)
- [ ] Create org flow
- [ ] Org switcher
- [ ] Create project modal
- [ ] Project dashboard page

**Prompts:**
- [ ] Prompt list page
- [ ] Create prompt modal
- [ ] Prompt detail page (versions + editor)
- [ ] Template editor with variable highlighting
- [ ] Variables schema editor
- [ ] Model config form
- [ ] Diff viewer (side-by-side)
- [ ] Release/archive buttons

**Datasets:**
- [ ] Dataset list page
- [ ] Create dataset modal
- [ ] Dataset detail page (paginated items table)
- [ ] Add/edit item panel
- [ ] JSONL upload UI

**Evals:**
- [ ] Config list page
- [ ] Config wizard (5 steps: dataset, checks, guardrails, judge, thresholds)
- [ ] Run execution UI (start, progress, cancel)
- [ ] Report — summary cards
- [ ] Report — results table (sortable, filterable)
- [ ] Report — side-by-side output comparison
- [ ] Report — export (JSON/CSV)

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
- 2026-03-02 - Task 4.1 - Added frontend env template and seeded local `.env.local` with localhost API/app URLs.


