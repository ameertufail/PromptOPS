# CONTEXT: Frontend (Next.js)

> Attach with PROJECT_OVERVIEW.md when working on: Pages, routing, data fetching, state management, API client, React component logic

---

## Frontend Structure

Located at `apps/web/`. Next.js 14 with App Router. Entry: `src/app/`.

**Key folders:**
- `src/app/(auth)/` â€” Public auth pages (login, callback). Minimal layout, no sidebar.
- `src/app/(dashboard)/` â€” Protected pages. Layout has sidebar + auth check.
- `src/app/(dashboard)/[orgSlug]/[projectSlug]/` â€” All project-level pages nested here.
- `src/components/` â€” Reusable components grouped by domain (ui/, layout/, prompts/, datasets/, evals/, runs/)
- `src/lib/` â€” API client, auth helpers, LLM client, eval engine, utilities
- `src/hooks/` â€” Custom React hooks

## Routing (URL â†’ Page)

- `/` â†’ Public landing page
- `/login` â†’ GitHub OAuth login button
- `/callback` â†’ OAuth callback handler
- `/[orgSlug]` â†’ Org overview (project list)
- `/[orgSlug]/[projectSlug]` â†’ Project dashboard (stats, quick links)
- `/[orgSlug]/[projectSlug]/prompts` â†’ Prompt list
- `/[orgSlug]/[projectSlug]/prompts/[promptId]` â†’ Prompt detail (versions, editor, diff)
- `/[orgSlug]/[projectSlug]/datasets` â†’ Dataset list
- `/[orgSlug]/[projectSlug]/datasets/[datasetId]` â†’ Dataset items table
- `/[orgSlug]/[projectSlug]/evals` â†’ Eval config list
- `/[orgSlug]/[projectSlug]/evals/new` â†’ Eval config wizard
- `/[orgSlug]/[projectSlug]/evals/[configId]/runs/[runId]` â†’ Eval report
- `/[orgSlug]/[projectSlug]/runs` â†’ SDK runs explorer
- `/[orgSlug]/[projectSlug]/settings` â†’ API keys, provider keys

## Key Architecture Decisions

- Route groups: `(auth)` = public/no sidebar, `(dashboard)` = protected/sidebar
- API client: fetch wrapper, auto-includes cookies, handles 401â†’login redirect, 403â†’toast
- State: React Context for auth/org/project, useState for page data, URL params for nav. No Redux/Zustand needed.
- Context hierarchy: AuthProvider â†’ OrgProvider â†’ ProjectProvider â†’ DashboardLayout â†’ page
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
- [ ] Report â€” summary cards
- [ ] Report â€” results table (sortable, filterable)
- [ ] Report â€” side-by-side output comparison
- [ ] Report â€” export (JSON/CSV)

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
- (no completed tasks yet)


