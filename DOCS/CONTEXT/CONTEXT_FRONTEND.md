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

- `/` - public landing page (always visible; adapts CTAs for logged-in users instead of redirecting)
- `/login` - GitHub OAuth login page with trust signals and back-to-home link
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

- [x] Root layout (providers, fonts)
- [x] Auth layout (minimal)
- [x] Dashboard layout (sidebar + auth check)
- [x] Sidebar (nav items, org switcher, user menu)
- [x] Breadcrumb component

**Auth Pages:**

- [x] Login page (redesigned: aurora background, trust signals, loading/error states, back-to-home link)
- [x] Callback page (redesigned: matching card styling, error states with retry)
- [x] Auth layout (redesigned: aurora background, noise texture, footer with links)
- [x] Auth context + `useAuth`
- [x] API client with auto-auth

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

- [x] Dataset list page
- [x] Create dataset modal
- [x] Dataset detail page
- [x] Add/edit item panel
- [x] JSONL upload UI

**Evals:**

- [x] Config list page
- [x] Config wizard
- [x] Run execution UI
- [x] Report summary cards
- [x] Report results table
- [x] Report side-by-side comparison
- [x] Report export

**Runs & Dashboard:**

- [x] Runs explorer page
- [x] Dashboard stats cards + charts
- [ ] Per-version analytics

**Settings & Polish:**

- [x] API key management page
- [ ] Provider key management page
- [ ] Empty states for all sections
- [x] Onboarding flow (setup page with demo seed)
- [x] Public landing page (full redesign: aurora background, hero with blur-reveal animation, styled terminal with typing effect, CSS dashboard mockup, animated stats, 3x2 feature grid with tilt-card hover effects per-color accents, SVG provider logos, tech stack pill grid, pricing section, border-beam CTA, 4-column footer, shimmer buttons, consistent section spacing and alternating section backgrounds)

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-16 - Landing page v3 - Fixed headline typography (removed WordRotate, whitespace-nowrap on "you control"), reverted to uniform 3x2 feature grid, tightened section spacing (py-16), enlarged dashboard mockup (max-w-5xl with border/glow), differentiated stat colors (purple/emerald/blue), differentiated navbar vs hero CTAs, uniform tech stack pill layout, wider pricing card (max-w-xl), wider CTA section (max-w-2xl, text-4xl), spacious footer, alternating section background tints, stronger aurora opacity (0.22), larger BYOK icon/logos.
- 2026-03-16 - Landing page v2 - Complete landing page redesign: aurora background, blur-reveal hero, shimmer CTA buttons, styled terminal with typing animation, CSS dashboard mockup with prompt diff view, animated CountUp stats, TiltCard feature cards with per-color accents, inline SVG provider logos (OpenAI/Anthropic/Groq), tech stack icon grid, pricing section, border-beam CTA, 4-column footer, mouse spotlight, consistent py-24 spacing. Removed auto-redirect for logged-in users; page always renders with adaptive CTAs.
- 2026-03-16 - Login page redesign - Redesigned auth layout with aurora background matching landing page, enlarged login card (420px, px-10 py-10), purple branded logo with glow, shimmer button, trust signals ("Your API keys never touch our servers", "Open Source · MIT License · BYOK"), back-to-home link, loading/error states on GitHub button, visible card border, rounded-xl corners. Updated callback page with matching card styling.
- 2026-03-16 - Task 22.3 - Polished landing page with feature grid, BYOK section, tech stack badges, and CTA. Added demo seed to setup flow.
- 2026-03-16 - Task 21.3 - Built API key management settings page, runs explorer with stats/charts/filters/run detail dialog, and dashboard stats cards on project page.
- 2026-03-16 - Task 21.1 - Built eval run execution page, report page with summary cards/filterable results/side-by-side inspection/CSV+JSON export, and VerdictBadge/RunStatusBadge/StatCard components.
- 2026-03-16 - Task 20.2 - Built browser eval engine orchestrator with concurrency control, retry/resume, and progress callbacks in apps/web/src/lib/eval/.
- 2026-03-16 - Task 20.1 - Built LLM client abstraction with OpenAI/Anthropic/Groq adapters, client factory, and judge scoring helper in apps/web/src/lib/llm/.
- 2026-03-16 - Task 19.1 - Added shared template renderer and variable extraction utilities for browser-side eval orchestration.
- 2026-03-16 - Task 18.3 - Added human-readable explainability hints for all rule fields in detail page, rules editor, and config wizard.
- 2026-03-16 - Task 18.2 - Built 5-step eval config wizard at /evals/new with dataset, checks, guardrails, judge, and review/thresholds steps.
- 2026-03-16 - Task 18.1 - Built eval config list page with table/empty/loading states, create dialog with dataset selector, and detail page with rules cards and edit dialogs.
- 2026-03-16 - Task 16.3 - Built JSONL upload dialog with drag-and-drop, progress indicator, and post-import summary with line-level error display.
- 2026-03-16 - Task 16.2 - Built dataset item add/edit dialog with JSON validation, comma-separated tags, sort_order, and delete confirmation.
- 2026-03-16 - Task 16.1 - Built dataset list page with table/empty/loading states, detail page with expandable items and cursor pagination, and create dataset dialog.
- 2026-03-16 - Task 14.3 - Built unified diff viewer with color-coded hunks, version selectors, and release/archive actions with confirmation dialogs.
- 2026-03-16 - Task 14.2 - Built create-version dialog with template editor, {{variable}} extraction, model config form, and JSON variables schema editor.
- 2026-03-16 - Task 14.1 - Built prompt list page with table/empty/loading states, prompt detail page with expandable version timeline, and create prompt dialog.
- 2026-03-15 - Task 12.3 - Built typed API client with credentials, 401 auto-redirect, and full endpoint path builder.
- 2026-03-15 - Task 12.2 - Built login page with GitHub OAuth and callback page with session verification and error handling.
- 2026-03-15 - Task 12.1 - Built root/auth/dashboard layouts with AuthProvider->OrgProvider->ProjectProvider hierarchy, responsive sidebar, breadcrumb nav, and mobile sheet.
- 2026-03-15 - Task 12.0 - Installed 22 shadcn/ui components, created lib/utils with cn(), verified tweakcn theme parity with canonical artifact.
- 2026-03-08 - Task 8.2 - Added canonical API boundary schemas so the frontend can validate route payloads against the same contracts as the backend.
- 2026-03-08 - Task 8.1 - Added the shared enums, entity DTOs, and route metadata the frontend will import from `@promptops/shared`.
- 2026-03-06 - Task 5.3 - Provisioned the Vercel project and mapped the deployed Worker/frontend URLs into the frontend env contract.
- 2026-03-06 - Task 4.2 - Validated frontend startup on port 3000 and documented the local runtime contract against the Worker API scaffold.
- 2026-03-02 - Task 4.1 - Added the frontend env template and seeded local `.env.local` with localhost API/app URLs.
- 2026-03-02 - Task 2.1 - Scaffolded `apps/web` workspace boundaries and wired frontend shared-contract usage via `@promptops/shared`.
