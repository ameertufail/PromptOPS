# PromptOps Studio — MVP Improvement Roadmap

> **Created:** 2026-03-28
> **Status:** Living document — each domain agent contributes improvements
> **Current State:** MVP 0 complete (Phases 1-22 done). All core flows working: auth, org/project, prompts, datasets, eval execution, SDK logging, dashboards.

---

## How This Document Works

Each domain agent analyzes their area of the codebase and contributes:

1. **What exists now** — current state summary
2. **What needs improvement** — prioritized list of enhancements for MVP polish
3. **PostHog integration points** — where to add analytics events for their domain
4. **Effort estimate** — S (hours), M (1-2 days), L (3-5 days)

---

## PostHog Integration Strategy

### Setup

- **Package:** `posthog-js` (frontend), `posthog-node` (backend/SDK)
- **Hosting:** PostHog Cloud free tier (1M events/month)
- **Privacy:** No PII in events. User identified by anonymous hash of user ID. Org/project scoped with group analytics.
- **Implementation pattern:**
  - Frontend: Initialize in root layout provider, auto-capture page views, custom events for key actions
  - Backend: Server-side events for API-key usage, eval completions, SDK run logging
  - SDK: Optional opt-in telemetry for SDK usage patterns

### Core PostHog Events (Cross-Domain)

| Event             | Trigger           | Properties                |
| ----------------- | ----------------- | ------------------------- |
| `user_signed_up`  | First OAuth login | `auth_provider`           |
| `user_logged_in`  | Subsequent login  | `auth_provider`           |
| `org_created`     | New org           | `member_count`            |
| `project_created` | New project       | `org_id`                  |
| `feature_used`    | Any key feature   | `feature_name`, `context` |

---

## Domain: Frontend

### What Exists Now

The frontend is a Next.js 14 App Router application at `apps/web/`. It uses Tailwind CSS, shadcn/ui components, Framer Motion (`motion/react`), Recharts, and the Geist font family. Dark mode is the default and only theme. The codebase is structured as:

**Auth flow:** Login page (`src/app/(auth)/login/page.tsx`) with GitHub OAuth, callback page (`src/app/(auth)/callback/page.tsx`) with session verification and redirect logic, auth layout with aurora background and trust signals. Auth state is managed via `AuthProvider` context (`src/lib/auth-context.tsx`).

**Dashboard shell:** Protected layout (`src/app/(dashboard)/layout.tsx`) with `AuthGate` that redirects unauthenticated users, `DashboardShell` with `OrgProvider -> ProjectProvider` context hierarchy, 264px desktop sidebar (`src/components/app-sidebar.tsx`) with org/project switchers, breadcrumb nav (`src/components/breadcrumb-nav.tsx`), and mobile sidebar sheet (`src/components/mobile-sidebar.tsx`).

**Onboarding:** Setup page (`src/app/(dashboard)/setup/page.tsx`) with 2-step org/project creation flow with animated transitions and demo data seeding.

**Project dashboard:** (`src/app/(dashboard)/[orgSlug]/[projectSlug]/page.tsx`) with stat cards (total runs, avg latency, avg tokens, est. cost) and navigation cards to Prompts, Datasets, and Evaluations.

**Prompts:** List page with table view, empty state, and create dialog. Detail page (`prompts/[promptId]/page.tsx`) with expandable version timeline, version content preview, model config display, variables schema display, release/archive actions with confirmation dialogs, and a Compare tab with a unified diff viewer (`src/components/prompts/version-diff.tsx`). Create version dialog with template editor, variable extraction, and model config form.

**Datasets:** List page with table view, empty state, and create dialog. Detail page (`datasets/[datasetId]/page.tsx`) with expandable item rows, cursor-based pagination (load more), add/edit item dialog (`src/components/datasets/dataset-item-dialog.tsx`), JSONL upload dialog (`src/components/datasets/jsonl-upload-dialog.tsx`) with drag-and-drop, edit dataset dialog, delete dataset/item confirmation. Dataset items display input, expected output, rubric, and tags.

**Evaluations:** Config list page with rules summary badges. Config detail page (`evals/[configId]/page.tsx`) with checks/guardrails/judge/thresholds cards and edit dialogs, plus a runs history table. 5-step config wizard (`evals/new/page.tsx`) for dataset, checks, guardrails, judge, and review/thresholds. Run execution page (`evals/[configId]/run/page.tsx`) with prompt version selection, BYOK API key input, live progress bar, verdict counts, pause/resume/abort controls. Report page (`evals/[configId]/runs/[runId]/page.tsx`) with summary stat cards, verdict filter, paginated results table, side-by-side output inspection dialog, and CSV/JSON export.

**Runs explorer:** (`runs/page.tsx`) with stat cards, source filter, paginated runs table, and run detail dialog with input/output/metadata inspection.

**Settings:** API key management page (`settings/page.tsx`) with create/revoke flows, key masking, and SDK quick start guide.

**Landing page:** Full marketing page (`src/app/page.tsx`) with aurora background, hero with blur-reveal animation, animated terminal, CSS dashboard mockup, CountUp stats, 3x2 feature grid with TiltCard hover effects, tech stack badges, pricing section, border-beam CTA, and 4-column footer.

**Shared infrastructure:** Typed API client (`src/lib/api-client.ts`) with credentials, auto 401 redirect, and full path builder. Browser eval engine (`src/lib/eval/`) with concurrency control, retry/pause/resume. LLM client abstraction (`src/lib/llm/`) with OpenAI/Anthropic/Groq adapters.

### MVP Improvements (Prioritized)

#### 1. Global Error Boundary and Error Recovery

- **Why** -- Currently, uncaught errors in any page component crash the entire app with a blank screen. Users lose all context and have to refresh. Every `catch` block either silently swallows errors (`// silent`) or shows a single toast, with no retry affordance in most places.
- **What to do** -- Create an `error.tsx` file at `src/app/(dashboard)/error.tsx` using Next.js App Router error boundaries. Include a "Something went wrong" UI with a "Retry" button that calls `reset()`. Add per-page error boundaries for critical sections (eval execution, report rendering). Refactor the `// silent` catch blocks in `PromptListPage`, `DatasetListPage`, `EvalConfigListPage`, and `RunsExplorerPage` to set an `error` state and display a retry banner instead of failing silently. Add an `ErrorAlert` reusable component with retry button.
- **Effort** -- M

#### 2. Skeleton Loading States for All Data-Fetching Pages

- **Why** -- Several pages already have basic skeleton loading (e.g., `ProjectDashboardPage`, `PromptDetailPage`), but the skeleton patterns are inconsistent. The prompt list, dataset list, and eval config list pages use generic repeated `Skeleton` bars that do not match the actual content layout (table headers, columns). This makes the loading state feel disconnected from the loaded state.
- **What to do** -- Create a `TableSkeleton` component that matches the table structure (correct number of columns, row heights matching real rows). Apply it to prompts list (`src/app/(dashboard)/[orgSlug]/[projectSlug]/prompts/page.tsx`), datasets list, eval configs list, runs explorer, and settings. For the project dashboard, add skeleton versions of the nav cards. For eval report, add skeleton stat cards and table.
- **Effort** -- S

#### 3. Optimistic Updates for Mutations

- **Why** -- Every create, update, and delete action currently waits for the server response before updating the UI. For example, creating a prompt shows a spinner, waits for the API, then re-fetches the entire list. Deleting a dataset item does the same. This makes the app feel sluggish even on fast connections.
- **What to do** -- Implement optimistic updates for: prompt creation (append to list immediately, rollback on error), dataset item creation/deletion (add/remove from local state immediately), version release/archive (update badge immediately), API key revocation (remove from list immediately). Use a pattern where the mutation updates local state first, fires the API call, and rolls back on failure with a toast error.
- **Effort** -- M

#### 4. Keyboard Shortcuts and Navigation

- **Why** -- Power users (developers using an LLMOps tool) expect keyboard-driven workflows. Currently, the app has zero keyboard shortcuts. There is no way to navigate between sections, create new items, or dismiss dialogs without a mouse.
- **What to do** -- Add a `useHotkeys` hook (or integrate `@mantine/hooks` hotkeys). Implement: `Cmd/Ctrl+K` for a command palette (search prompts, datasets, configs, navigate to sections), `Cmd/Ctrl+N` for "New" (context-aware: new prompt on prompts page, new dataset on datasets page), `Escape` already works for dialogs (shadcn default), `J/K` for table row navigation on list pages. Display shortcut hints in tooltips on buttons. Add a `?` shortcut to show a keyboard shortcuts overlay.
- **Effort** -- L

#### 5. Search and Filtering on List Pages

- **Why** -- The prompt list, dataset list, eval config list, and runs explorer have no client-side search. As users accumulate tens or hundreds of prompts/datasets, finding a specific one requires scrolling through the entire table. The runs explorer has a source filter but no text search or date range filter.
- **What to do** -- Add a search input with debounced filtering to: `PromptListPage` (filter by name, description), `DatasetListPage` (filter by name, type), `EvalConfigListPage` (filter by name). For the runs explorer, add date range picker and text search on prompt name/version. Add a `SearchInput` reusable component with a search icon, clear button, and `Cmd+K` hint. Filter locally for small lists; add API-side filtering parameters when lists exceed ~100 items.
- **Effort** -- M

#### 6. Responsive Design Improvements

- **Why** -- The sidebar hides at `lg:` breakpoint and uses a sheet overlay on mobile, which is good. However, several page layouts break on small screens: the project dashboard nav cards stack awkwardly, the eval run execution page's 2-column grid becomes a single column but the API key card is below the fold, table columns hide at `sm:`/`md:` breakpoints but the remaining columns are too cramped, and the eval report's side-by-side inspection dialog has no mobile layout.
- **What to do** -- (1) For tables on mobile, switch to a card-based layout below `sm:` breakpoint instead of hiding columns. Create a `ResponsiveTable` wrapper component or use CSS to display table rows as stacked cards. (2) For the eval run setup grid (`evals/[configId]/run/page.tsx`), move the API key card above the version selection on mobile since users need to see the config summary first. (3) For the side-by-side inspection dialog in the eval report, stack the two outputs vertically on mobile with swipe-between tabs. (4) Add `max-w` constraints and horizontal scroll to `<pre>` blocks displaying JSON/template content on mobile.
- **Effort** -- M

#### 7. Toast Notification Consistency and Context

- **Why** -- Toast messages are inconsistent. Some use `toast.success("Project created!")`, others `toast.success("Project created! Redirecting...")`, and error messages range from specific (`"An organization with this slug already exists."`) to generic (`"Failed to create project."`). Some error paths show no toast at all (the `// silent` catches). The toasts also lack action buttons for retry or undo.
- **What to do** -- Audit all toast calls (approximately 35+ across the codebase). Standardize the format: success toasts should be brief and consistent ("Prompt created", "Version released"), error toasts should include context and a "Retry" action where applicable (`toast.error("Failed to load prompts", { action: { label: "Retry", onClick: fetchPrompts } })`). Replace all `// silent` catch blocks with user-visible error state or toast. Add undo toasts for destructive actions (delete dataset item, revoke API key).
- **Effort** -- S

#### 8. Empty States with Guided Actions

- **Why** -- Empty states exist for most list pages (prompts, datasets, eval configs, API keys), which is good. However, the project dashboard shows nothing when there are zero runs (the stat cards section is completely hidden). The eval config detail page has no empty state for the runs history table. The org overview page shows a generic skeleton when projects exist but it is still redirecting.
- **What to do** -- (1) For the project dashboard with zero runs, show a "Getting started" guide with steps: "1. Create a prompt, 2. Create a dataset, 3. Run your first eval" with links to each section. Track which steps the user has completed and show checkmarks. (2) For the eval config detail runs history, show "No runs yet. Start your first evaluation." with a "Run Evaluation" button. (3) For the org overview page, replace the skeleton-during-redirect with a brief loading indicator that explains "Loading your projects...". (4) Add contextual tips to all empty states explaining the feature's purpose and a link to documentation.
- **Effort** -- M

#### 9. Data Refresh and Stale Data Indicators

- **Why** -- Pages fetch data once on mount and never refresh unless the user navigates away and back. If a user opens the prompt list in one tab and creates a prompt in another, the first tab shows stale data indefinitely. The runs explorer and eval report pages have no auto-refresh even though runs may be actively coming in from the SDK.
- **What to do** -- (1) Add a "Last updated X seconds ago" indicator to the project dashboard and runs explorer, with a manual "Refresh" button. (2) Add auto-polling (every 30 seconds) to the runs explorer page when the page is visible (using `document.visibilityState`). (3) Add `focus` event refetching to context providers (`OrgProvider`, `ProjectProvider`) so that switching browser tabs triggers a data refresh. (4) Show a subtle "New data available" banner at the top of list pages when a background check detects changes.
- **Effort** -- M

#### 10. Accessibility Improvements

- **Why** -- The app has minimal accessibility support. Interactive elements like the version expand/collapse button in `PromptDetailPage` use a raw `<button>` with no `aria-expanded` or `aria-controls`. The sidebar navigation lacks `aria-current="page"`. Tables lack `aria-label` descriptions. The mobile sidebar trigger has an `aria-label` (good), but the breadcrumb nav does not use a `<nav aria-label="Breadcrumb">` pattern. The eval run progress bar lacks `aria-valuenow`/`aria-valuemax`. Color-only verdict indicators (green/red/yellow dots) are inaccessible to colorblind users.
- **What to do** -- (1) Add `aria-expanded`, `aria-controls` to all expandable sections (version timeline, dataset item rows). (2) Add `aria-current="page"` to the active sidebar nav item. (3) Add `aria-label` to all table elements and the breadcrumb `<nav>`. (4) Add text labels alongside color indicators for verdict counts in the eval run execution page. (5) Ensure all icon-only buttons have `aria-label` or `sr-only` text. (6) Add `role="status"` and `aria-live="polite"` to the eval progress section. (7) Test and fix tab order through all dialogs.
- **Effort** -- M

#### 11. Code Splitting and Bundle Optimization

- **Why** -- The landing page (`src/app/page.tsx`) is a single large file that includes `motion/react`, `FlickeringGrid`, `AnimatedBeam`, `BentoGrid`, and multiple inline component definitions (`CountUp`, `TypeWriter`, `TiltCard`, `DashboardMockup`, `TerminalBlock`). This creates a large initial bundle for the most visited page. The eval engine (`src/lib/eval/`) and LLM clients (`src/lib/llm/`) are imported statically even though they are only used on the eval run execution page.
- **What to do** -- (1) Use `next/dynamic` with `ssr: false` for below-the-fold landing page sections (features, pricing, CTA, footer). `FloatingLines` is already dynamically imported, extend this pattern. (2) Move `EvalEngine` and LLM client imports to dynamic imports within the run execution page. (3) Extract the inline components from `page.tsx` into separate files under `src/components/landing/` to improve tree-shaking. (4) Add `next/bundle-analyzer` to CI to track bundle size regressions.
- **Effort** -- M

#### 12. Form Validation Improvements

- **Why** -- Form validation is minimal. The setup page's slug field allows any input and only validates client-side with `toSlug()`. The eval wizard's JSON schema field validates on "Next" but shows the error below the field only after navigation attempt. The API key name field has no max length or character validation. There is no inline validation feedback as the user types.
- **What to do** -- (1) Add inline validation to slug fields with a real-time "valid slug" checkmark or error icon as the user types, using debounced validation against `[a-z0-9-]+` pattern. (2) Add character count indicators to text inputs with max lengths (org name: 100, project name: 100, prompt name: 200, API key name: 50). (3) Add real-time JSON validation to the eval wizard's JSON schema field with syntax highlighting of errors. (4) Add `required` field indicators (asterisks) to all mandatory form fields. (5) Prevent form submission on Enter key in multi-field forms (currently some dialogs submit on Enter from any field).
- **Effort** -- S

#### 13. Prompt Template Editor Enhancement

- **Why** -- The create version dialog (`src/components/prompts/create-version-dialog.tsx`) uses a plain `<Textarea>` for template editing. Template variables like `{{query}}` are extracted but not highlighted in the editor. There is no syntax highlighting, no line numbers, no auto-closing braces, and no variable autocomplete. For a tool that is about prompt engineering, the editing experience should be noticeably better than a generic textarea.
- **What to do** -- (1) Replace the textarea with a lightweight code editor component (CodeMirror 6 or Monaco with minimal config). (2) Add syntax highlighting for `{{variable}}` placeholders with a distinct color (e.g., purple from the theme). (3) Add line numbers and a minimap for long templates. (4) Show a live variable extraction panel beside the editor that updates as the user types. (5) Add an "Insert variable" dropdown for commonly used variables.
- **Effort** -- L

#### 14. Dark Mode Contrast and Theming Consistency

- **Why** -- The app is dark mode only, which is good for the target audience. However, some elements have low contrast: `text-muted-foreground/50` and `text-muted-foreground/35` on the login page are hard to read, the `border-border/40` borders on cards are barely visible, and the `bg-card/60` with `backdrop-blur-xl` pattern makes text harder to read when aurora blobs overlap. The landing page uses hardcoded colors (`text-emerald-400`, `text-purple-500`) that do not consistently use theme tokens.
- **What to do** -- (1) Audit all opacity modifiers below `/50` and raise them to meet WCAG AA contrast ratio (4.5:1 for text). (2) Replace hardcoded color classes in the landing page with theme token equivalents where possible. (3) Add a light mode toggle to the root layout (even if dark is default, some users work in bright environments). (4) Ensure all interactive states (hover, focus, active) have visible contrast changes. (5) Test the landing page tilt cards and aurora background for readability at various viewport sizes.
- **Effort** -- M

#### 15. Provider Key Management Page

- **Why** -- The `CONTEXT_FRONTEND.md` marks "Provider key management page" as incomplete (unchecked). The settings page only has API key management. Users currently have to enter their LLM provider key manually on every eval run via the BYOK input. There is no way to save and reuse provider keys across eval runs, which adds friction to the core eval workflow.
- **What to do** -- Build `src/app/(dashboard)/[orgSlug]/[projectSlug]/settings/provider-keys/page.tsx` or add a second card to the existing settings page. Include: add provider key form (provider dropdown: OpenAI/Anthropic/Groq, key name, encrypted key), list of saved provider keys with mask/reveal toggle, delete with confirmation, and auto-populate the eval run execution page's API key field from saved provider keys. The API paths (`api.paths.projectProviderKeys`, `api.paths.providerKey`) already exist in the client.
- **Effort** -- M

#### 16. Bulk Actions on List Pages

- **Why** -- There is no way to perform operations on multiple items at once. If a user wants to archive 5 old prompt versions, they must do it one by one. If they want to delete multiple dataset items, each requires a separate click-confirm-wait cycle. As data grows, this becomes painful.
- **What to do** -- Add checkbox selection to table rows on: dataset items table (bulk delete, bulk tag), prompt versions timeline (bulk archive), eval configs list (bulk delete). Implement a floating action bar that appears at the bottom of the page when items are selected, showing the count and available bulk actions. Start with dataset items (most impactful since JSONL imports can create many items).
- **Effort** -- L

#### 17. Onboarding Tour for First-Time Users

- **Why** -- The setup flow creates an org and project with demo data, which is a good start. But once the user lands on the project dashboard, there is no guidance about what to do next, what the demo data contains, or how the prompt-version-eval workflow works. First-time users may not understand the relationship between prompts, datasets, eval configs, and runs.
- **What to do** -- (1) After demo seed, show a brief onboarding modal explaining what was seeded ("We created a sample prompt with 2 versions, a test dataset, and an eval config"). (2) Add tooltip popovers to the sidebar nav items on first visit (using localStorage flag) explaining each section in one sentence. (3) Add a "Getting Started" checklist widget on the project dashboard that tracks: created a prompt, created a dataset, configured an eval, ran an evaluation, viewed a report. (4) Add `?help=true` URL parameter support that re-triggers tooltips.
- **Effort** -- L

#### 18. Export and Sharing Improvements

- **Why** -- The eval report page has CSV and JSON export, which is good. However, there is no way to share a report link with a teammate, no PDF export for stakeholders, no copy-as-markdown for pasting into PRs/issues, and no way to export prompt versions or datasets.
- **What to do** -- (1) Add a "Copy link" button to the eval report page that copies the current URL (already shareable if the user is authenticated). (2) Add "Copy as Markdown" to the eval report summary that formats the stat cards and verdict distribution as a markdown table. (3) Add CSV export to the dataset detail page (export all items). (4) Add "Copy template" button to the prompt version expanded view for quick copying of the template content.
- **Effort** -- S

### PostHog Integration Points

| Event Name                   | Trigger                                                                 | Properties                                                                                                          | Why Track                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `page_viewed`                | Every route navigation via Next.js router                               | `path`, `orgSlug`, `projectSlug`, `referrer`                                                                        | Understand navigation patterns, identify most/least visited pages, detect drop-off points |
| `prompt_created`             | Successful prompt creation in `CreatePromptDialog`                      | `projectId`, `hasDescription`                                                                                       | Track adoption of prompt versioning feature, measure time-to-first-prompt                 |
| `prompt_version_created`     | Successful version creation in `CreateVersionDialog`                    | `promptId`, `versionNumber`, `hasModelConfig`, `hasVariablesSchema`, `provider`, `model`                            | Understand version creation frequency, popular model configs                              |
| `prompt_version_action`      | Release or archive action in `PromptDetailPage`                         | `action` (release/archive), `promptId`, `versionNumber`, `previousStatus`                                           | Track version lifecycle, identify if users release or archive more                        |
| `dataset_created`            | Successful dataset creation in `CreateDatasetDialog`                    | `projectId`, `type` (GENERATION/EXTRACTION/CLASSIFICATION)                                                          | Track dataset adoption, popular dataset types                                             |
| `dataset_items_imported`     | Successful JSONL upload in `JsonlUploadDialog`                          | `datasetId`, `imported`, `failed`, `fileSize`                                                                       | Measure bulk import usage, identify import error rates                                    |
| `eval_config_created`        | Successful config creation (wizard or quick create)                     | `projectId`, `creationMethod` (wizard/quick), `checksEnabled`, `guardrailsEnabled`, `judgeEnabled`, `judgeProvider` | Understand which eval features users configure, wizard vs quick create preference         |
| `eval_run_started`           | User clicks "Start Evaluation" in run execution page                    | `configId`, `baseVersionId`, `candidateVersionId`, `provider`                                                       | Track eval execution frequency, measure funnel from config to run                         |
| `eval_run_completed`         | Eval engine finishes (phase becomes "done")                             | `configId`, `runId`, `totalItems`, `duration_ms`, `verdictDistribution`                                             | Measure eval completion rate, identify slow evals, understand typical dataset sizes       |
| `eval_run_aborted`           | User clicks "Stop" during eval execution                                | `configId`, `runId`, `completedItems`, `totalItems`, `reason`                                                       | Identify why users abort, detect evals that are too slow                                  |
| `eval_report_exported`       | User clicks CSV or JSON export in report page                           | `runId`, `format` (csv/json), `itemCount`, `verdictFilter`                                                          | Track export adoption, understand reporting needs                                         |
| `eval_report_item_inspected` | User opens side-by-side inspection dialog                               | `runId`, `verdict`, `itemIndex`                                                                                     | Understand how deeply users review results, which verdicts get inspected                  |
| `api_key_created`            | Successful API key creation in settings page                            | `projectId`                                                                                                         | Track SDK adoption funnel (key created -> SDK installed -> first run logged)              |
| `onboarding_step_completed`  | User completes setup step (org created, project created)                | `step` (org/project), `hasDemoSeed`, `duration_ms`                                                                  | Measure onboarding completion rate, identify drop-off points                              |
| `search_used`                | User types in search input on any list page (after implementing search) | `page` (prompts/datasets/evals/runs), `queryLength`, `resultCount`                                                  | Validate search feature adoption, identify common search patterns                         |

---

## Domain: Backend API

### What Exists Now

The backend is a Hono.js application running on Cloudflare Workers (`apps/api/src/index.ts`) with D1 (SQLite) as the database and R2 for storage (binding defined but not yet used in any route). The middleware pipeline applies request context, security headers, CORS, identity resolution (session JWT + API key), and audit event flushing on every `/api/*` request.

**Current endpoints (37 routes across 10 route files):**

- **Auth** (`routes/auth.ts`): `GET /api/auth/github`, `GET /api/auth/callback`, `GET /api/auth/me`, `POST /api/auth/logout` -- GitHub OAuth with CSRF state cookie, JWT session, cookie-based auth.
- **Orgs** (`routes/orgs.ts`): `POST /api/orgs`, `GET /api/orgs`, `GET /api/orgs/:orgId`, `POST /api/orgs/:orgId/members`, `PATCH /api/orgs/:orgId/members/:userId`, `DELETE /api/orgs/:orgId/members/:userId`, `GET /api/orgs/:orgId/audit-events` -- Full org lifecycle with RBAC, member management, audit log.
- **Projects** (`routes/projects.ts`): `POST /api/orgs/:orgId/projects`, `GET /api/orgs/:orgId/projects`, `GET /api/projects/:projectId`, `PATCH /api/projects/:projectId`, `DELETE /api/projects/:projectId`, `POST /api/projects/:projectId/seed-demo` -- CRUD with demo seed.
- **Prompts** (`routes/prompts.ts`): `POST /api/projects/:projectId/prompts`, `GET /api/projects/:projectId/prompts`, `GET /api/prompts/:promptId`, `POST /api/prompts/:promptId/versions`, `GET /api/prompt-versions/:versionId`, `PATCH /api/prompt-versions/:versionId/release`, `PATCH /api/prompt-versions/:versionId/archive`, `GET /api/prompts/:promptId/diff` -- Full prompt versioning with immutable versions, release/archive state machine, LCS diff.
- **Datasets** (`routes/datasets.ts`): `POST /api/projects/:projectId/datasets`, `GET /api/projects/:projectId/datasets`, `GET /api/datasets/:datasetId`, `PATCH /api/datasets/:datasetId`, `DELETE /api/datasets/:datasetId`, `POST /api/datasets/:datasetId/items`, `PATCH /api/dataset-items/:itemId`, `DELETE /api/dataset-items/:itemId`, `POST /api/datasets/:datasetId/items/bulk` -- CRUD + cursor-paginated items + JSONL bulk import.
- **Eval Configs** (`routes/eval-configs.ts`): `POST /api/projects/:projectId/eval-configs`, `GET /api/projects/:projectId/eval-configs`, `GET /api/eval-configs/:configId`, `PATCH /api/eval-configs/:configId` -- Config CRUD with cross-project dataset validation and compatibility audit metadata.
- **Eval Runs** (`routes/eval-runs.ts`): `POST /api/eval-runs`, `GET /api/eval-runs/:runId`, `GET /api/eval-runs/:runId/items`, `POST /api/eval-runs/:runId/items`, `PATCH /api/eval-runs/:runId/complete`, `GET /api/projects/:projectId/eval-runs` -- Full eval lifecycle with idempotent item ingestion and summary computation.
- **SDK Runs** (`routes/runs.ts`): `POST /api/runs` (API-key auth + rate limit), `GET /api/projects/:projectId/runs`, `GET /api/projects/:projectId/runs/stats` -- SDK telemetry logging with latency percentiles, daily rollups, guardrail failure counts.
- **API Keys** (`routes/api-keys.ts`): `POST /api/projects/:projectId/api-keys`, `GET /api/projects/:projectId/api-keys`, `DELETE /api/api-keys/:keyId` -- SHA-256 hashed key storage, prefix display, last-used tracking.
- **Health** (`routes/health.ts`): `GET /api/health`.

**Infrastructure:**

- In-memory rate limiting per API key (100 req/min) -- acknowledged per-isolate limitation in `middleware/rate-limit.ts`.
- Audit event pipeline: events queued during request handling, batch-inserted via `waitUntil` after response (`middleware/audit.ts`).
- 5 middleware layers: request context, security headers + HSTS, CORS, identity resolution (session + API key), audit flush.
- 8 D1 migrations covering tenancy, prompts, datasets, evals, runs/keys, audit events, indexes, and security fixes.
- Shared Zod schemas imported from `@promptops/shared` for all request/response validation.

### MVP Improvements (Prioritized)

#### 1. Provider Key CRUD Routes

- **Why** -- The context doc (`DOCS/CONTEXT/CONTEXT_BACKEND.md` line 109) marks provider key routes as the only unchecked task item. Users cannot configure their own LLM provider keys (OpenAI, Anthropic) through the API, which blocks the eval engine from calling external models on their behalf.
- **What to do** -- Create `routes/provider-keys.ts` with `POST /api/projects/:projectId/provider-keys`, `GET /api/projects/:projectId/provider-keys`, `DELETE /api/provider-keys/:keyId`. Encrypt the secret value using the `ENCRYPTION_KEY` binding (already provisioned in `types.ts` but unused). Store encrypted blob in D1 alongside provider name, key alias, and project scope. Add `db/provider-key-queries.ts` with typed helpers. Wire into `routes/index.ts`. Require ADMIN role for all operations.
- **Effort** -- M

#### 2. Prompt Update and Delete Endpoints

- **Why** -- There is no way to rename, change description, or delete a prompt once created. Users who make a typo in the prompt name are stuck. These are the only CRUD operations missing from the prompt entity in `routes/prompts.ts`.
- **What to do** -- Add `PATCH /api/prompts/:promptId` (update name/description, MEMBER+) and `DELETE /api/prompts/:promptId` (ADMIN+, with cascade check for versions/eval runs referencing it) in `routes/prompts.ts`. Add `updatePrompt` and `deletePrompt` query helpers in `db/prompt-queries.ts`.
- **Effort** -- S

#### 3. Eval Config Delete Endpoint

- **Why** -- Eval configs can be created and updated but never deleted. Stale configs clutter the project. `routes/eval-configs.ts` has no DELETE handler.
- **What to do** -- Add `DELETE /api/eval-configs/:configId` with ADMIN+ role. Check for in-progress eval runs referencing the config via the existing `hasEvalRunsForConfig` helper in `db/eval-config-queries.ts` before allowing deletion. Add `deleteEvalConfig` to the same queries file. Emit `eval_config.deleted` audit event.
- **Effort** -- S

#### 4. Consistent Pagination Across All List Endpoints

- **Why** -- Pagination behavior is inconsistent. Org members (`db/queries.ts` `listOrgMembers`), org projects (`db/queries.ts` `listOrgProjects`), prompts (`db/prompt-queries.ts` `listProjectPrompts`), eval configs (`db/eval-config-queries.ts` `listProjectEvalConfigs`), and API keys (`db/api-key-queries.ts` `listApiKeysByProject`) all return hard-limited arrays (100-200 rows) without total counts or page metadata. Meanwhile eval runs, eval run items, SDK runs, and audit events return `{ items, total, page, limit }`. Dataset items use cursor-based pagination. Users have no way to know if they have hit the limit on the non-paginated endpoints.
- **What to do** -- Standardize all list endpoints to return `{ data, total, page, limit }` for offset-paginated resources. Add `page` and `limit` query params (with defaults from `DEFAULT_PAGE_SIZE`) to prompts, datasets, org members, org projects, eval configs, and API keys. Keep cursor pagination for dataset items (high cardinality). Add a COUNT query alongside each list query using `db.batch()` for a single round-trip.
- **Effort** -- M

#### 5. Search and Filtering on Prompts and Datasets

- **Why** -- As projects grow, users cannot search or filter. The prompt list endpoint in `routes/prompts.ts` and dataset list endpoint in `routes/datasets.ts` have no query parameters for name search, status filtering, or sort order.
- **What to do** -- Add optional query parameters: `search` (LIKE on name/description), `status` (for prompts: filter by latest version status), `sortBy` (name, createdAt), `sortOrder` (asc, desc). Apply in `listProjectPrompts` and `listProjectDatasets` queries in their respective query files. Add corresponding Zod schemas in `@promptops/shared`.
- **Effort** -- M

#### 6. Bulk Delete Operations

- **Why** -- Cleaning up test data requires deleting items one by one. No bulk operations exist for dataset items, prompts, or eval runs.
- **What to do** -- Add `POST /api/datasets/:datasetId/items/bulk-delete` accepting `{ itemIds: string[] }` (max 100). Add `POST /api/projects/:projectId/prompts/bulk-delete` accepting `{ promptIds: string[] }`. Use D1 batch statements. Update `item_count` atomically in `db/dataset-queries.ts`. Require MEMBER+ role.
- **Effort** -- M

#### 7. Eval Run Cancel/Fail Endpoint

- **Why** -- If an eval run stalls (e.g., the frontend tab closes mid-run), there is no way to mark it as FAILED. The only state transition from RUNNING is via `PATCH /eval-runs/:runId/complete` which sets `status: "COMPLETED"`. Stale RUNNING runs will confuse users forever.
- **What to do** -- Add `PATCH /api/eval-runs/:runId/cancel` that sets `status = 'FAILED'`, `error_message = 'Cancelled by user'`, and `finished_at = now` using the existing `completeEvalRun` helper in `db/eval-run-queries.ts` (which already accepts `status: "FAILED"`). Allow MEMBER+ to cancel. Also add a timeout check: a scheduled Durable Object or cron trigger that marks runs stuck in RUNNING for >30 minutes as FAILED automatically.
- **Effort** -- S (cancel endpoint alone), L (with auto-timeout)

#### 8. Distributed Rate Limiting

- **Why** -- The current rate limiter in `middleware/rate-limit.ts` is in-memory per Worker isolate, which means under high traffic the effective limit is `100 * num_isolates`. The file itself documents this limitation (line 16-19). For SDK endpoints that could be hammered, this is insufficient for production.
- **What to do** -- Replace the in-memory `Map<string, RateLimitBucket>` with Cloudflare Rate Limiting rules (available via `wrangler.toml` config) for the `POST /api/runs` endpoint. Alternatively, use a Durable Object per API key to maintain a single counter with `alarm()` for window expiry. Keep the existing middleware as a fast-path check but back it with a binding. Preserve the `X-RateLimit-*` response headers already implemented.
- **Effort** -- L

#### 9. API Versioning Strategy

- **Why** -- The API has no versioning. All routes live at `/api/`. Once external SDK consumers depend on response shapes, breaking changes will be painful. The SDK package already ships, making this pressing.
- **What to do** -- Introduce path-based versioning: `/api/v1/`. Create a `v1` Hono sub-app in `routes/index.ts` that mounts the current route files. Keep `/api/health` and `/api/auth/*` unversioned. Set an `X-API-Version: v1` response header. Document that bare `/api/` paths are deprecated but will continue to work for 6 months via a compatibility redirect or alias.
- **Effort** -- M

#### 10. OpenAPI/Swagger Auto-Generation

- **Why** -- No API documentation exists for external developers or SDK consumers. The Zod schemas in `@promptops/shared` already define the entire request/response contract, but there is no machine-readable spec.
- **What to do** -- Add `@hono/zod-openapi` to convert existing route definitions into OpenAPI 3.1 spec. Add `GET /api/docs` serving Swagger UI (or Scalar). Generate the spec from the shared Zod schemas already used for validation. Publish the spec JSON at `GET /api/openapi.json`.
- **Effort** -- L

#### 11. Webhook/Notification Support for Eval Completion

- **Why** -- Eval runs are long-running (dataset items processed one-by-one by the frontend eval engine). Users have no way to be notified when a run completes. Slack/Discord integration is a high-value feature for teams.
- **What to do** -- Add a `webhooks` table (project_id, url, secret, events[], active). Add `POST/GET/DELETE /api/projects/:projectId/webhooks` endpoints. After `completeEvalRun` in `routes/eval-runs.ts`, dispatch a signed webhook payload via `c.executionCtx.waitUntil(fetch(...))`. Start with `eval_run.completed` event. Use HMAC-SHA256 signing with the webhook secret for consumer-side verification.
- **Effort** -- L

#### 12. Response Compression and Stats Query Optimization

- **Why** -- The `getRunStats` query in `db/run-queries.ts` (line 130-267) fetches up to 10,000 metrics rows to compute percentiles in JavaScript. This is memory-intensive and the response payload can be large. Cloudflare Workers auto-compress only for large-enough responses with `Accept-Encoding`.
- **What to do** -- Move percentile computation to SQL using a subquery with NTILE or ORDER BY + LIMIT-based approximate percentiles, eliminating the need to load 10K rows into memory. Reduce the `LIMIT 10000` on the metrics query to a sampled approach (e.g., reservoir sampling or just take the most recent 1000). Verify CF auto-compression is active by testing response headers.
- **Effort** -- S

#### 13. R2 Storage Integration for Dataset Export/Import

- **Why** -- The `STORAGE` R2 binding is provisioned in `types.ts` (line 12) but never used anywhere. Large dataset imports (JSONL) are processed entirely in-memory in `routes/datasets.ts` line 571-637. There is no export functionality.
- **What to do** -- Add `GET /api/datasets/:datasetId/export` that streams all items as JSONL to R2, then returns a signed URL. For large imports, accept an R2 object key instead of inline body. Add `POST /api/datasets/:datasetId/import-url` that returns a presigned R2 upload URL. Process the uploaded file asynchronously via Cloudflare Queues.
- **Effort** -- L

#### 14. Request Body Size Limits

- **Why** -- The JSONL bulk import endpoint (`routes/datasets.ts` line 584) reads the entire body with `c.req.text()` without any size check. A malicious or accidental large upload could exhaust Worker memory (128MB limit).
- **What to do** -- Add a `Content-Length` check middleware for import endpoints (max 5MB). Return `413 Payload Too Large` if exceeded. Add a shared `requireMaxContentLength(bytes)` middleware in `middleware/security.ts`. Apply to `POST .../items/bulk` and `POST /api/runs`.
- **Effort** -- S

#### 15. Idempotency Keys for Mutation Endpoints

- **Why** -- Network retries on `POST` endpoints (create prompt, create eval run, create API key) can cause duplicate resources. The eval run item endpoint already handles idempotency via the `dataset_item_id` uniqueness check in `db/eval-run-queries.ts`, but no other creation endpoint does.
- **What to do** -- Accept an optional `Idempotency-Key` header on all POST endpoints. Store the key + response in a short-lived D1 table or KV namespace with 24h TTL. Return the cached response for duplicate keys. Start with `POST /api/eval-runs` and `POST /api/runs` (highest traffic).
- **Effort** -- M

#### 16. Error Response Enrichment

- **Why** -- Validation errors from Zod include field-level issues via `formatValidationIssues` in `lib/errors.ts`, but business logic errors return only a flat message string. For example, `"The referenced dataset does not exist."` (in `routes/eval-configs.ts` line 148) does not tell the client which field was wrong.
- **What to do** -- Add a `field` property to business validation errors. For example, when dataset cross-project validation fails, include `{ field: "datasetId" }` in the error details. Extend the `ValidationError` class in `lib/errors.ts` to accept an optional `field` parameter. Standardize the pattern across all routes that throw `ValidationError`.
- **Effort** -- S

#### 17. Eval Run Comparison Endpoint

- **Why** -- Users want to compare two eval runs side-by-side (e.g., same config, different prompt versions). Currently they must fetch both runs and all items separately, then join client-side.
- **What to do** -- Add `GET /api/eval-runs/:runId/compare/:otherRunId` that returns a merged view: for each dataset item, show base/candidate outputs and metrics from both runs, with a delta. Use a single SQL query joining `eval_run_items` on `dataset_item_id` across both runs. Validate that both runs belong to the same eval config (same dataset). Require VIEWER+ on the parent project.
- **Effort** -- M

#### 18. Project-Level Stats Aggregation Endpoint

- **Why** -- The dashboard needs a summary view: total prompts, total datasets, total eval runs, recent activity. Currently the frontend must call multiple list endpoints and count client-side.
- **What to do** -- Add `GET /api/projects/:projectId/stats` returning `{ promptCount, datasetCount, evalRunCount, latestEvalRun, sdkRunsLast24h, activeApiKeys }`. Use a single D1 batch with COUNT queries for a single round-trip. Optionally cache the result via `Cache API` or a KV namespace with a 60-second TTL.
- **Effort** -- S

#### 19. Audit Event Filtering

- **Why** -- The audit events endpoint (`routes/orgs.ts` `GET /api/orgs/:orgId/audit-events`) only supports `page` and `limit` query params. Users cannot filter by entity type, action, date range, or actor -- limiting the utility of the audit log for compliance or debugging.
- **What to do** -- Add optional query params: `entityType`, `action`, `actorUserId`, `from`, `to` to `auditEventsQuerySchema` in `@promptops/shared`. Update `listOrgAuditEvents` in `db/queries.ts` to build dynamic WHERE clauses. This mirrors the pattern already used in `listRunsByProject` in `db/run-queries.ts` (line 59-128).
- **Effort** -- S

#### 20. Background Job Queue for Long-Running Operations

- **Why** -- Dataset exports, large JSONL imports, and eval run auto-timeout checks need background processing. Currently everything runs synchronously within the Worker request handler's CPU time limit.
- **What to do** -- Use Cloudflare Queues (new binding: `QUEUE`) for fire-and-forget tasks. Add a queue consumer Worker that handles `dataset.export`, `eval_run.timeout_check`, and future webhook delivery. Enqueue from route handlers via `c.env.QUEUE.send()`. This keeps the request-response cycle fast. Define the queue binding in `types.ts` alongside the existing bindings.
- **Effort** -- L

### PostHog Integration Points

| Event Name                    | Trigger                                                                              | Properties                                                                                          | Why Track                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `api.eval_run_started`        | `POST /api/eval-runs` creates a new run                                              | `eval_config_id`, `dataset_item_count`, `project_id`                                                | Measure eval adoption rate and dataset sizes users test against                     |
| `api.eval_run_completed`      | `PATCH /api/eval-runs/:runId/complete` succeeds                                      | `run_id`, `duration_seconds`, `total_items`, `improved_count`, `regressed_count`, `pass_rate_delta` | Track eval quality trends; identify users seeing regressions                        |
| `api.sdk_run_logged`          | `POST /api/runs` ingests a run                                                       | `project_id`, `source`, `has_metrics`, `has_prompt_version_id`                                      | Measure SDK adoption; detect projects using the SDK without linking prompt versions |
| `api.api_key_created`         | `POST /api/projects/:projectId/api-keys`                                             | `project_id`, `is_first_key` (boolean)                                                              | Track SDK onboarding funnel -- key creation is the first step                       |
| `api.api_key_revoked`         | `DELETE /api/api-keys/:keyId`                                                        | `project_id`, `key_age_days`                                                                        | Detect key rotation patterns and hygiene                                            |
| `api.rate_limit_hit`          | Rate limit middleware returns 429 in `middleware/rate-limit.ts`                      | `api_key_id`, `project_id`, `endpoint`, `bucket_count`                                              | Identify customers who need higher limits; detect abuse patterns                    |
| `api.dataset_imported`        | `POST /api/datasets/:datasetId/items/bulk` completes                                 | `dataset_id`, `imported_count`, `failed_count`, `content_type`                                      | Measure JSONL import adoption and error rates                                       |
| `api.prompt_version_released` | `PATCH /api/prompt-versions/:versionId/release`                                      | `prompt_id`, `version_number`, `project_id`                                                         | Track deployment velocity -- how often users ship new prompt versions               |
| `api.prompt_diff_viewed`      | `GET /api/prompts/:promptId/diff`                                                    | `prompt_id`, `base_version`, `candidate_version`                                                    | Measure diff feature usage to justify further investment                            |
| `api.demo_seed_used`          | `POST /api/projects/:projectId/seed-demo`                                            | `project_id`                                                                                        | Track onboarding: how many new users seed demo data vs. start from scratch          |
| `api.error_rate`              | Any route handler returns 4xx or 5xx (sampled in global error handler in `index.ts`) | `status_code`, `error_code`, `endpoint`, `method`                                                   | Monitor API reliability; detect broken flows early                                  |
| `api.auth_callback_failed`    | OAuth callback catches an error in `routes/auth.ts` line 118                         | `error_type`, `has_state_cookie`                                                                    | Detect OAuth integration issues (misconfigured redirect URIs, GitHub outages)       |
| `api.org_member_added`        | `POST /api/orgs/:orgId/members`                                                      | `org_id`, `invited_role`, `org_member_count`                                                        | Measure team growth and collaboration adoption                                      |
| `api.webhook_delivered`       | (Future) Webhook dispatch succeeds or fails                                          | `project_id`, `event_type`, `status_code`, `latency_ms`                                             | Monitor webhook reliability once the feature ships                                  |
| `api.request_duration`        | Every API request (sampled at 10% via random in the request context middleware)      | `endpoint`, `method`, `duration_ms`, `status_code`, `auth_type`                                     | P50/P95 latency tracking per endpoint; identify slow queries before users complain  |

---

## Domain: Authentication

### What Exists Now

**OAuth flow:** GitHub-only OAuth with CSRF state validation. Backend exchanges the authorization code, upserts the user, mints a stateless HS256 JWT, and sets it as an HttpOnly `po_session` cookie (7-day TTL, `SameSite=Lax`, `Secure` in production). The frontend callback page verifies the session via `GET /api/auth/me`, then routes to the user's org or the setup page. No PII (email/name) is stored in JWT claims -- only `sub` (user ID), `iat`, and `exp`.

**Session management:** Entirely stateless. JWTs cannot be revoked server-side; logout simply deletes the cookie. The `AuthProvider` React context calls `/auth/me` on mount, gates dashboard access via `AuthGate`, and redirects to `/login` on 401. The `api-client.ts` auto-redirects to `/login` on any 401 response from non-auth pages.

**RBAC:** Four roles -- OWNER, ADMIN, MEMBER, VIEWER -- resolved per-request via org_members lookup. Role hierarchy is enforced by numeric rank (OWNER=4, ADMIN=3, MEMBER=2, VIEWER=1). Org access and project access are resolved separately; API keys are project-scoped and only accepted on SDK run-logging routes. Owner-management guardrails prevent orgs from losing their last owner.

**API keys:** Project-scoped, `po_sk_` prefixed, 32 random chars. SHA-256 hash stored in DB; plaintext shown once at creation. `last_used_at` is tracked via fire-and-forget update. No scoping (read vs write), no expiration, no usage analytics.

**Member management:** Admins+ can add existing users by email, change roles, and remove members. Users must have already signed in via GitHub before they can be added -- there is no invite system for users who have not yet created an account.

### MVP Improvements (Prioritized)

#### 1. Invite System -- Email-Based Org Invitations

- **Why** -- Today you can only add users who have already signed up. This is the biggest blocker for team adoption: org owners cannot onboard teammates who have never visited the app. Every collaborative SaaS needs an invite flow.
- **What to do**
  - Create an `org_invites` table: `id`, `org_id`, `email`, `role`, `invited_by`, `token` (unique, URL-safe random string), `status` (PENDING / ACCEPTED / EXPIRED / REVOKED), `expires_at`, `created_at`.
  - `POST /api/orgs/:orgId/invites` -- ADMIN+ creates an invite, generates a token, optionally triggers an email (or returns a shareable link for MVP).
  - `GET /api/invites/:token` -- public endpoint that returns org name, inviter name, and role so the invite-accept page can render context.
  - `POST /api/invites/:token/accept` -- authenticated user accepts the invite; backend creates org_member row, marks invite as ACCEPTED.
  - Frontend: pending invites list in org settings (with revoke), invite modal with email + role picker, `/invite/:token` accept page.
  - Future: integrate an email provider (Resend, Postmark) to send invite emails with the accept link.
- **Effort** -- M

#### 2. Token Refresh -- Shorter-Lived JWTs with Refresh Token Rotation

- **Why** -- A 7-day stateless JWT cannot be revoked. If a token leaks, the attacker has a week-long window. Shorter access tokens (15-30 min) with a server-side refresh token reduce the blast radius of a compromised session and enable server-side revocation.
- **What to do**
  - Create a `sessions` table: `id`, `user_id`, `refresh_token_hash`, `expires_at`, `created_at`, `last_refreshed_at`, `user_agent`, `ip_address`.
  - On login: issue a short-lived access JWT (15 min) and a refresh token (stored as SHA-256 hash in the sessions table, sent as a separate HttpOnly cookie `po_refresh`).
  - `POST /api/auth/refresh` -- verify the refresh token against the DB, issue a new access JWT and rotate the refresh token (write new hash, delete old).
  - On logout: delete the session row from DB (true revocation).
  - Frontend: intercept 401 in `api-client.ts`, attempt a transparent refresh, replay the original request; if refresh fails, redirect to login.
  - This also enables session listing and "log out all devices" (see next item).
- **Effort** -- L

#### 3. Session Management -- Server-Side Revocation and Session Listing

- **Why** -- Users have no visibility into active sessions and cannot revoke a session from another device. This is a basic security expectation for any multi-device SaaS.
- **What to do** (depends on the `sessions` table from item 2)
  - `GET /api/auth/sessions` -- list active sessions for the current user (device, last active, IP hint).
  - `DELETE /api/auth/sessions/:sessionId` -- revoke a specific session (delete the row; the short-lived JWT expires naturally within minutes).
  - `POST /api/auth/sessions/revoke-all` -- delete all sessions except the current one.
  - Frontend: "Active sessions" card in account settings showing device, last active time, and a revoke button per session.
- **Effort** -- M (S if refresh token infrastructure already exists)

#### 4. Additional OAuth Providers -- Google and Email/Password Fallback

- **Why** -- GitHub-only login excludes non-developer teammates (product managers, content writers, QA). Google OAuth covers the majority of remaining business users. Email/password is a universal fallback.
- **What to do**
  - **Google OAuth:** Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars. New routes: `GET /api/auth/google` (redirect), `GET /api/auth/google/callback` (exchange code, fetch profile, upsert user). The users table already stores `github_id`; add a nullable `google_id` column. Account linking: if the same email exists, link the new provider to the existing user rather than creating a duplicate.
  - **Email/password fallback:** Add `password_hash` (nullable) to users table. New routes: `POST /api/auth/register` (email, password, name), `POST /api/auth/login` (email, password). Hash with Argon2id or bcrypt. Require email verification before first login (verification token table + `/api/auth/verify-email/:token`).
  - Frontend: update the login page with provider buttons and an email/password form. Show "Link account" in settings if the user has only one provider connected.
- **Effort** -- L (Google alone is M)

#### 5. API Key UX -- Scoping, Expiration, and Usage Analytics

- **Why** -- All API keys currently have identical, unlimited permissions. There is no way to create a read-only key for monitoring dashboards or set an expiration for temporary integrations. Usage analytics per key help teams understand SDK adoption.
- **What to do**
  - Add columns to `api_keys`: `scope` (enum: `full`, `read_only`, `write_only`), `expires_at` (nullable), `usage_count` (integer, default 0).
  - Backend: check `scope` in the API key auth middleware -- deny writes for read-only keys; check `expires_at` before authenticating. Increment `usage_count` alongside the existing `last_used_at` update.
  - `GET /api/projects/:projectId/api-keys/:keyId/usage` -- return daily usage counts (aggregate from a new `api_key_usage_daily` table or compute from runs).
  - Frontend: scope selector and optional expiration date in the create-key modal. Usage sparkline chart on the API keys list page. Expired keys shown with a warning badge.
- **Effort** -- M

#### 6. Role Management -- Role Change UI, Descriptions, and Custom Roles

- **Why** -- The four built-in roles cover common cases but lack flexibility. There is no in-app explanation of what each role can do, which leads to confusion when assigning roles. Eventually, teams will want custom roles.
- **What to do**
  - **Role descriptions UI:** Add a tooltip or info popover on the member management page that maps each role to its permissions (matching the RBAC table from CONTEXT_AUTH.md).
  - **Role change UX:** Inline role dropdown on the members list with confirmation dialog for privilege escalation/demotion. Show the current user's own role prominently.
  - **Custom roles (future):** New `roles` table with `org_id`, `name`, `permissions` (JSON array of permission strings). Update RBAC middleware to check custom permission sets. This is post-MVP but the schema should be designed to accommodate it.
- **Effort** -- S (descriptions + inline UI), L (custom roles)

#### 7. Account Settings -- Profile, Avatar, Email Change, Account Deletion

- **Why** -- Users currently have no way to update their profile, change their email, or delete their account. These are baseline expectations and in some jurisdictions (GDPR) deletion is a legal requirement.
- **What to do**
  - `PATCH /api/auth/me` -- update name, avatar URL. Validate and sanitize inputs.
  - `POST /api/auth/change-email` -- initiate email change with verification token sent to the new address. Only apply after verification.
  - `DELETE /api/auth/me` -- account deletion. Cascade: remove org memberships (transfer ownership if sole owner), anonymize audit events, delete user row. Require password or re-auth confirmation.
  - Frontend: account settings page with profile form, email change flow, and danger-zone account deletion with double confirmation.
- **Effort** -- M

#### 8. Security Features -- 2FA/MFA, Login History, Suspicious Activity Alerts

- **Why** -- For teams handling production LLM prompts and API keys, MFA is table-stakes security. Login history and anomaly detection build user trust.
- **What to do**
  - **TOTP MFA:** Add `mfa_secret` (encrypted) and `mfa_enabled` (boolean) columns to users. New routes: `POST /api/auth/mfa/enable` (generate secret + QR URI), `POST /api/auth/mfa/verify` (confirm setup with a TOTP code), `POST /api/auth/mfa/challenge` (verify code during login). After OAuth callback, if MFA is enabled, redirect to an MFA challenge page before issuing the session.
  - **Login history:** New `login_events` table: `id`, `user_id`, `provider`, `ip_address`, `user_agent`, `location_hint` (from IP geolocation), `status` (success/failure), `created_at`. Record on every auth attempt.
  - **Suspicious activity alerts:** Flag logins from new IPs or unusual geolocations. Surface a banner in the dashboard: "New login from [location] at [time]." Future: email notification.
- **Effort** -- L

#### 9. Org Settings -- Billing Hooks, Usage Limits, Member Management Polish

- **Why** -- As orgs scale, they need visibility into usage (API calls, eval runs, members) and the ability to set guardrails. Even on a free tier, usage limits prevent abuse and set expectations for future monetization.
- **What to do**
  - Add `plan` (free/pro/enterprise) and `usage_limits` (JSON) columns to orgs table.
  - `GET /api/orgs/:orgId/usage` -- return current-period usage (API key calls, eval runs, members count) vs. plan limits.
  - Frontend: org settings page with usage meters, member limit indicators, and a billing section (initially just "Free plan" with an upgrade CTA placeholder).
  - Enforce limits in middleware: return 429 or 403 when an org exceeds its API call or member count limit.
- **Effort** -- M

### PostHog Integration Points

| Event Name                  | Trigger                                                         | Properties                                                                  | Why Track                                                                            |
| --------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `auth_login_started`        | User clicks a login provider button                             | `provider` (github, google, email)                                          | Measure login funnel entry; detect provider preference                               |
| `auth_login_completed`      | Session cookie set after successful OAuth callback              | `provider`, `is_new_user` (boolean), `user_id_hash`                         | Track sign-up vs. returning user ratio; compute conversion from started to completed |
| `auth_login_failed`         | OAuth callback returns an error or session verification fails   | `provider`, `error_code` (oauth_state_mismatch, auth_callback_failed, etc.) | Monitor auth failure rate; detect broken OAuth config or attacks                     |
| `auth_logout`               | User clicks logout                                              | `session_age_seconds`                                                       | Understand session duration; detect forced logouts from 401                          |
| `auth_session_expired`      | Frontend receives 401 on `/auth/me` during `AuthProvider` mount | `last_known_session_age_seconds`                                            | Measure how often users hit stale sessions; inform JWT TTL tuning                    |
| `invite_sent`               | Admin sends an org invite                                       | `org_id_hash`, `role`, `method` (email, link)                               | Track invite funnel entry; measure team growth drivers                               |
| `invite_accepted`           | User accepts an org invite                                      | `org_id_hash`, `role`, `time_to_accept_seconds`                             | Measure invite conversion rate and latency                                           |
| `invite_expired_or_revoked` | Invite expires or is manually revoked                           | `org_id_hash`, `reason` (expired, revoked)                                  | Detect invite friction; optimize expiry window                                       |
| `role_changed`              | Admin changes a member's role                                   | `org_id_hash`, `previous_role`, `new_role`                                  | Understand RBAC usage patterns; detect permission escalation trends                  |
| `api_key_created`           | Admin creates a new API key                                     | `project_id_hash`, `scope`, `has_expiration`                                | Track SDK onboarding; measure key scoping adoption                                   |
| `api_key_revoked`           | Admin revokes an API key                                        | `project_id_hash`, `key_age_days`, `usage_count`                            | Monitor key lifecycle; detect unused keys being cleaned up                           |
| `mfa_enabled`               | User enables TOTP MFA                                           | `user_id_hash`                                                              | Measure security feature adoption across the user base                               |
| `account_deleted`           | User deletes their account                                      | `account_age_days`, `org_count`, `was_sole_owner`                           | Track churn; detect if ownership-transfer friction causes abandoned orgs             |

---

## Domain: Database

### What Exists Now

**Platform:** Cloudflare D1 (SQLite-based), bound as `DB` in Wrangler. R2 bucket `STORAGE` available for blob/file storage.

**Schema (14 tables across 8 migrations):**

| Table             | Purpose                                                                          | PK                            | Key relationships                                                                  |
| ----------------- | -------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| `_migrations`     | Tracks applied migration files                                                   | `name TEXT`                   | None                                                                               |
| `users`           | OAuth user profiles                                                              | `id TEXT (ULID)`              | `github_id UNIQUE`, `email UNIQUE` (added in 008)                                  |
| `orgs`            | Organizations / tenants                                                          | `id TEXT (ULID)`              | `slug UNIQUE`                                                                      |
| `org_members`     | User-to-org membership with RBAC role                                            | `(org_id, user_id)` composite | FK to `orgs`, `users` with CASCADE                                                 |
| `projects`        | Workspaces scoped to orgs                                                        | `id TEXT (ULID)`              | FK to `orgs` CASCADE; `UNIQUE(org_id, slug)`                                       |
| `prompts`         | Named prompt templates                                                           | `id TEXT (ULID)`              | FK to `projects` CASCADE, `created_by` FK to `users`                               |
| `prompt_versions` | Versioned prompt content with model config                                       | `id TEXT (ULID)`              | FK to `prompts` CASCADE; `UNIQUE(prompt_id, version_number)`                       |
| `datasets`        | Collections of test data                                                         | `id TEXT (ULID)`              | FK to `projects` CASCADE; denormalized `item_count`                                |
| `dataset_items`   | Individual test rows with input/expected output                                  | `id TEXT (ULID)`              | FK to `datasets` CASCADE                                                           |
| `eval_configs`    | Evaluation rule configurations                                                   | `id TEXT (ULID)`              | FK to `projects` CASCADE, `datasets` RESTRICT                                      |
| `eval_runs`       | Execution instances of evaluations                                               | `id TEXT (ULID)`              | FK to `eval_configs` CASCADE, `prompt_versions` RESTRICT                           |
| `eval_run_items`  | Per-item results within an eval run                                              | `id TEXT (ULID)`              | FK to `eval_runs` CASCADE, `dataset_items`; `UNIQUE(eval_run_id, dataset_item_id)` |
| `runs`            | SDK/UI/eval prompt execution logs                                                | `id TEXT (ULID)`              | FK to `projects` CASCADE, `prompt_versions`                                        |
| `api_keys`        | Hashed project-scoped API keys                                                   | `id TEXT (ULID)`              | FK to `projects` CASCADE; `key_hash` indexed                                       |
| `provider_keys`   | LLM provider credentials (column named `encrypted_key` but no actual encryption) | `id TEXT (ULID)`              | FK to `projects` CASCADE; `UNIQUE(project_id, provider)`                           |
| `audit_events`    | Org-level action log                                                             | `id TEXT (ULID)`              | FK to `orgs` CASCADE                                                               |

**Indexes (27 total from migrations 007 + 008):** Single-column FK lookups, composite covering indexes on hot paths (`runs(project_id, created_at)`, `eval_run_items(eval_run_id, verdict, created_at)`, `audit_events(org_id, created_at)`), unique constraint indexes on `users.email` and `eval_run_items(eval_run_id, dataset_item_id)`.

**Query helpers (7 files):** `queries.ts` (tenancy/org/project/audit), `prompt-queries.ts`, `dataset-queries.ts`, `eval-config-queries.ts`, `eval-run-queries.ts`, `api-key-queries.ts`, `run-queries.ts`. All use typed `D1Database` with `db.withSession("first-primary")` for write-then-read batches. ULID generation via `createUlid()`. Helper utilities `requireFirstResult()` and `getIdFactory()` duplicated across every file.

**Pagination:** Mixed strategy. `listDatasetItems` uses cursor-based pagination (sort_order, id). `listOrgAuditEvents`, `listRunsByProject`, `listProjectEvalRuns`, and `listEvalRunItems` all use offset-based pagination (`LIMIT ? OFFSET ?` with separate `COUNT(*)` queries).

**Bulk operations:** `bulkCreateDatasetItems` batches 20 inserts per transaction with incremental `item_count` updates.

**Stats computation:** `getRunStats` fetches up to 10,000 raw metrics rows client-side, then parses JSON to compute percentiles and guardrail failure counts. Uses `json_extract()` for AVG/SUM aggregations directly in SQL.

---

### MVP Improvements (Prioritized)

#### 1. Provider Key Encryption -- Implement real encryption for LLM API keys

- **Why:** The `encrypted_key` column in `provider_keys` currently stores plaintext. If the D1 database is compromised or a SQL injection is found, all provider API keys (OpenAI, Anthropic, etc.) are exposed in the clear. This is the single highest-severity security gap in the data layer.
- **What to do:**
  - Use the Web Crypto API (`crypto.subtle`) available in Cloudflare Workers to implement AES-256-GCM encryption.
  - Store a `PROVIDER_KEY_SECRET` (32-byte hex) as a Wrangler secret (`wrangler secret put PROVIDER_KEY_SECRET`). Never commit this value.
  - Create `encryptProviderKey(plaintext, secret)` and `decryptProviderKey(ciphertext, secret)` helpers that produce a single `iv:ciphertext:tag` base64 string stored in `encrypted_key`.
  - Add a typed `provider-key-queries.ts` module (currently missing entirely -- there are no query helpers for the `provider_keys` table) with `createProviderKey`, `getProviderKey` (decrypt on read), `listProviderKeys` (return only `key_hint`), and `deleteProviderKey`.
  - Add a migration 009 that is a no-op on the schema (the column already exists) but documents the encryption contract.
  - Rotate all existing plaintext values via a one-time migration script.
- **Effort:** M

#### 2. Cursor-Based Pagination -- Migrate remaining offset queries to cursor-based

- **Why:** Offset pagination degrades as datasets grow -- `OFFSET 10000` requires SQLite to scan and discard 10,000 rows. Audit events and runs are append-only and will grow unboundedly. The separate `COUNT(*)` query doubles read cost on every paginated list call.
- **What to do:**
  - **`listOrgAuditEvents`:** Replace `LIMIT ? OFFSET ?` with `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?`. Accept `cursor` (the `id` of the last item) instead of `page`. Look up the cursor row's `created_at` inline with a scalar subquery. Return `nextCursor` (last item's `id`) instead of `total`.
  - **`listRunsByProject`:** Same pattern -- cursor on `(created_at DESC, id DESC)`. The `idx_runs_project_created` composite index already covers this.
  - **`listProjectEvalRuns`:** Cursor on `(er.created_at DESC, er.id DESC)` with the existing `idx_eval_runs_config_created` index.
  - **`listEvalRunItems`:** Cursor on `(created_at ASC, id ASC)` using `idx_eval_run_items_run_verdict_created`.
  - Remove all `COUNT(*)` total queries from list endpoints. If the frontend needs a total for display, provide a separate lightweight `count` endpoint or cache the count.
  - Update the corresponding route handlers and API response shapes to accept/return cursor strings instead of page numbers.
- **Effort:** M

#### 3. Soft Deletes -- Recoverable deletion for prompts, datasets, and projects

- **Why:** `DOCS/main.md` already specifies `DELETE /api/projects/:projectId` as "soft delete (requires OWNER)" but the current `deleteProject` query does a hard `DELETE FROM projects WHERE id = ?` with CASCADE, which permanently destroys all child prompts, versions, datasets, eval configs, eval runs, runs, and API keys. One accidental click can wipe an entire project.
- **What to do:**
  - Add a migration that adds `deleted_at TEXT DEFAULT NULL` to `projects`, `prompts`, and `datasets`.
  - Add a partial index `idx_projects_org_active ON projects(org_id) WHERE deleted_at IS NULL` to keep list queries fast.
  - Update `deleteProject` to `SET deleted_at = strftime(...)` instead of `DELETE`. Update `listOrgProjects` to add `AND deleted_at IS NULL`.
  - Apply the same pattern for `deleteDataset` -- set `deleted_at` instead of hard delete. The `ON DELETE RESTRICT` on `eval_configs.dataset_id` currently blocks deletion of datasets with eval configs referencing them; soft delete sidesteps this while preserving referential integrity.
  - For prompts: soft-delete the prompt row; versions remain accessible for historical eval run references.
  - Add `restoreProject` / `restoreDataset` / `restorePrompt` query helpers for undo within 30 days.
  - Add a scheduled cron (Cloudflare Worker cron trigger) to hard-delete rows where `deleted_at < datetime('now', '-30 days')`.
- **Effort:** M

#### 4. Missing `updated_at` Columns -- Track when entities were last modified

- **Why:** No table has an `updated_at` timestamp. This means the frontend cannot sort by "recently modified", API clients cannot use `If-Modified-Since` caching, and there is no lightweight indicator of when configurations changed beyond the audit_events log.
- **What to do:**
  - Add `updated_at TEXT DEFAULT NULL` to `projects`, `prompts`, `prompt_versions`, `datasets`, `eval_configs`, and `provider_keys` via a new migration.
  - Since D1/SQLite has no triggers, every `UPDATE` query helper must explicitly set `updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`. This aligns with the existing pattern where helpers build dynamic SET clauses, so adding one more assignment is trivial.
  - Add an index `idx_prompts_project_updated ON prompts(project_id, updated_at)` for "recently edited" sort.
- **Effort:** S

#### 5. Analytics Pre-Aggregation -- Replace client-side stats computation with materialized summaries

- **Why:** `getRunStats` currently fetches up to 10,000 raw `metrics` JSON rows, parses every one in JavaScript, sorts latencies client-side, and counts guardrail failures in a loop. At scale this will blow through D1 read limits and incur significant Worker CPU time. The three `json_extract()` aggregations in the same query also force a full table scan on every call.
- **What to do:**
  - Create a `run_daily_stats` table: `(project_id TEXT, prompt_version_id TEXT, date TEXT, source TEXT, run_count INTEGER, total_latency_ms REAL, total_token_count REAL, total_cost REAL, min_latency_ms REAL, max_latency_ms REAL, PRIMARY KEY(project_id, date, prompt_version_id, source))`.
  - On every `createRun`, increment the corresponding `run_daily_stats` row using `INSERT ... ON CONFLICT DO UPDATE SET run_count = run_count + 1, total_latency_ms = total_latency_ms + ?` (parse the single metrics JSON once in the run-creation helper, not on the read path).
  - Create an `eval_run_summary` table: `(eval_run_id TEXT PRIMARY KEY, improved INTEGER, regressed INTEGER, same INTEGER, base_avg_score REAL, candidate_avg_score REAL, base_pass_rate REAL, candidate_pass_rate REAL)`. Populate on `completeEvalRun` instead of recomputing from `getAllEvalRunItems` on every dashboard load.
  - Rewrite `getRunStats` to read from `run_daily_stats` with simple `SUM/AVG` aggregations -- no JSON parsing, no 10K row fetch.
  - For percentile computation, keep a `latency_histogram` table with bucketed counts (0-50ms, 50-100ms, 100-200ms, 200-500ms, 500-1000ms, 1000ms+) and approximate P50/P95 from the histogram.
- **Effort:** L

#### 6. Full-Text Search -- FTS5 for prompt content, dataset items, and run output

- **Why:** Users currently have no way to search across their prompt content, dataset inputs, or run outputs. As the number of prompts and datasets grows, scanning by name alone is insufficient. SQLite FTS5 is supported in D1 and is the standard approach for text search in SQLite.
- **What to do:**
  - Create FTS5 virtual tables in a migration:
    ```sql
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_prompts USING fts5(name, description, content='prompts', content_rowid='rowid');
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_dataset_items USING fts5(input, expected_output, content='dataset_items', content_rowid='rowid');
    ```
  - Since D1 has no triggers, maintain FTS sync manually: on `createPrompt` / `updatePrompt`, insert/update the corresponding FTS row. Same for dataset items on `createDatasetItem` / `updateDatasetItem` / `bulkCreateDatasetItems`.
  - Add a `searchPrompts(db, { projectId, query })` helper that JOINs `fts_prompts` with `prompts` and filters by `project_id`.
  - Add a `searchDatasetItems(db, { datasetId, query })` helper for dataset item search.
  - FTS5 MATCH is O(log n) vs. `LIKE '%query%'` which is O(n) full-table scan.
- **Effort:** M

#### 7. Data Archival Strategy -- Prevent unbounded table growth for runs, eval_run_items, and audit_events

- **Why:** The `runs` table receives a row for every SDK/UI/eval execution and has no TTL. On D1 free tier (5GB limit), a moderately active project logging 100 runs/day with ~2KB per row would consume ~70MB/year for runs alone. `eval_run_items` and `audit_events` are similarly append-only and unbounded.
- **What to do:**
  - **Cold storage tier:** Add an R2 archival pipeline. When runs are older than 90 days, export them as NDJSON to the R2 `STORAGE` bucket (path: `archive/{project_id}/runs/{year}/{month}.ndjson.gz`), then delete the D1 rows. The same pattern applies to `eval_run_items` (archive by eval_run) and `audit_events` (archive by month).
  - **Implementation:** A Cloudflare Worker cron trigger (`crons = ["0 3 * * 0"]` -- weekly at 3AM) that selects rows older than the retention period, writes to R2 in batches, then deletes the archived rows.
  - **Retention config:** Add a `retention_days INTEGER DEFAULT 90` column to `projects` so users can control their own data lifecycle.
  - **Archive index:** `idx_runs_project_created` (already exists) and `idx_audit_events_org_created` (already exists) efficiently select rows by date range for archival.
  - **Read-through:** For archived data, provide an API endpoint that reads from R2 and streams NDJSON results, clearly marked as "archived" in the response.
- **Effort:** L

#### 8. Migration Tooling -- Proper rollback support and migration testing

- **Why:** The current migration system is append-only numbered SQL files tracked in `_migrations`. There is no rollback mechanism. If a migration introduces a bug, the only fix is a forward migration. The `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` pattern makes migrations appear idempotent but masks failures silently. The table-recreation approach in migration 008 (drop + rename) is inherently destructive and non-reversible.
- **What to do:**
  - **Rollback scripts:** For each migration `NNN_name.sql`, create a companion `NNN_name.down.sql` with the reverse DDL. Store in `apps/api/src/db/migrations/down/`.
  - **Checksum verification:** Store a SHA-256 hash of each migration file in the `_migrations` table (add a `checksum TEXT` column). On startup, verify that applied migrations have not been modified after the fact. If a checksum mismatches, log a warning.
  - **Dry-run mode:** Add a `db:migrate:dry-run` script that prints the SQL that would be executed without applying it. Useful for PR reviews.
  - **Pre-deploy validation:** The existing `db:validate:all` target is good. Enhance it to also run the down migrations in reverse order and verify the database returns to a clean state.
  - **Migration lock:** Before running migrations in production, acquire a row-level lock in `_migrations` (e.g., `INSERT INTO _migrations (name) VALUES ('__lock__')` at start, delete at end) to prevent two Workers from migrating concurrently.
- **Effort:** M

#### 9. Backup Strategy -- D1 backup and export/import tooling

- **Why:** There is no documented backup strategy. D1 provides automatic point-in-time recovery, but there is no user-facing export or self-service restore. If a user accidentally deletes data (and soft deletes are not yet in place), there is no recovery path short of Cloudflare support.
- **What to do:**
  - **Automated D1 backups:** Use `wrangler d1 backup create` in a scheduled GitHub Action (daily). Store backup IDs in a log file committed to the repo or pushed to R2.
  - **Project export:** Add an API endpoint `GET /api/projects/:projectId/export` that streams a full project export as JSON (prompts, versions, datasets, items, eval configs). This doubles as a migration path if users want to move data between orgs.
  - **Project import:** Add `POST /api/projects/:projectId/import` that accepts the export format and replays the data with new ULIDs.
  - **D1 Time Travel:** Document the D1 time-travel feature (available on paid plans) in the ops runbook. On free tier, rely on the GitHub Action backups.
  - **R2 lifecycle:** For the R2 `STORAGE` bucket, enable Cloudflare R2 lifecycle policies to prevent accidental deletion of archived data.
- **Effort:** M

#### 10. Query Helper Deduplication and Shared Utilities

- **Why:** The functions `requireFirstResult`, `getIdFactory`, and the `IdFactoryOptions` type are copy-pasted identically across `queries.ts`, `prompt-queries.ts`, `dataset-queries.ts`, `eval-config-queries.ts`, `eval-run-queries.ts`, and `api-key-queries.ts` (6 copies of each). This is a maintenance burden and a source of drift if one copy is updated and others are not.
- **What to do:**
  - Extract `requireFirstResult`, `getIdFactory`, and `IdFactoryOptions` into a shared `apps/api/src/db/db-utils.ts` module.
  - Re-export from each query file or import directly.
  - This is a pure refactor with no behavioral change and no migration needed.
- **Effort:** S

#### 11. Schema Constraints -- Missing CHECK constraints and NOT NULL tightening

- **Why:** Several columns are more permissive than the application logic expects, allowing invalid data to be written if a bug bypasses the application layer validation.
- **What to do:**
  - `audit_events.action`: Add `CHECK (length(action) > 0)` to prevent empty action strings.
  - `audit_events.entity_type`: Add `CHECK (entity_type IN ('org', 'project', 'prompt', 'dataset', 'eval_config', 'eval_run', 'api_key', 'provider_key', 'org_member'))` to enforce known entity types.
  - `runs`: Add an `error TEXT` column for failed runs rather than overloading the `output` column with error info.
  - `prompt_versions.content`: Add `CHECK (length(content) > 0)` to prevent empty prompt versions.
  - `api_keys.key_hash`: Add `CHECK (length(key_hash) = 64)` to enforce SHA-256 hex digest length.
  - `provider_keys.encrypted_key`: After encryption is implemented, add `CHECK (length(encrypted_key) > 0)`.
  - Use a table-recreation migration (same pattern as 008) since SQLite does not support `ALTER TABLE ... ADD CONSTRAINT`.
- **Effort:** S

#### 12. Unbounded List Queries -- Add safety limits and truncation indicators

- **Why:** `listProjectDatasets` has no `LIMIT` clause, meaning a project with thousands of datasets would return all of them in one response. `getAllDatasetItems` and `getAllEvalRunItems` use `LIMIT 10000` which silently truncates results without any indication to the caller.
- **What to do:**
  - Add `LIMIT 200` to `listProjectDatasets` (matching the pattern in `listProjectPrompts`, `listOrgMembers`, `listProjectEvalConfigs`, etc.).
  - For `getAllDatasetItems` and `getAllEvalRunItems`, fetch `LIMIT 10001` and if `results.length > 10000`, return `{ items: results.slice(0, 10000), truncated: true }` so the caller knows data was clipped.
  - Long-term: convert "getAll" functions to streaming or paginated iteration for truly unbounded datasets.
- **Effort:** S

---

### PostHog Integration Points

| Event Name                | Trigger                                  | Properties                                                                                 | Why Track                                                                                          |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `db_migration_applied`    | Each migration file applied successfully | `migration_name`, `duration_ms`, `environment`                                             | Track migration health, detect slow migrations, confirm production parity                          |
| `db_migration_failed`     | Migration throws an error                | `migration_name`, `error_message`, `environment`                                           | Alert on broken schema changes, measure migration reliability                                      |
| `db_query_slow`           | Any query helper exceeds 500ms latency   | `query_name`, `duration_ms`, `table`, `project_id`                                         | Identify performance regressions, find hot queries needing index optimization                      |
| `db_storage_usage`        | Scheduled weekly check (cron)            | `total_rows_by_table`, `estimated_size_mb`, `d1_read_count_today`, `d1_write_count_today`  | Monitor growth trends, predict when D1 free tier limits will be hit, plan archival timing          |
| `db_archival_completed`   | After R2 archival cron runs              | `table`, `rows_archived`, `rows_deleted`, `r2_object_key`, `duration_ms`                   | Confirm archival pipeline is running correctly, measure data lifecycle                             |
| `db_bulk_import`          | `bulkCreateDatasetItems` completes       | `dataset_id`, `items_imported`, `batch_count`, `duration_ms`                               | Understand import patterns, optimize batch sizes, detect large imports that strain D1 write limits |
| `db_run_stats_computed`   | `getRunStats` returns                    | `project_id`, `total_runs`, `duration_ms`, `rows_scanned`                                  | Track the most expensive analytics query, justify and measure impact of pre-aggregation work       |
| `db_provider_key_created` | Provider key saved                       | `provider`, `project_id` (never any key material)                                          | Understand which LLM providers are popular, prioritize provider integrations                       |
| `db_eval_run_completed`   | `completeEvalRun` persists summary       | `eval_run_id`, `status`, `total_items`, `improved_count`, `regressed_count`, `duration_ms` | Measure eval throughput, detect failure patterns, track feature adoption                           |
| `db_backup_created`       | Scheduled D1 backup completes            | `backup_id`, `environment`, `duration_ms`                                                  | Confirm backups are running on schedule, alert immediately on failures                             |

---

## Domain: Eval Engine

### What Exists Now

The eval engine runs entirely in the browser (locked architecture decision for MVP 0/1/2). The frontend orchestrates everything: template rendering, BYOK provider calls, deterministic checks, guardrails, LLM-as-judge scoring, verdict calculation, and result persistence.

**Deterministic Checks** (`packages/shared/src/eval/checks.ts`):

- JSON validity (`checkJsonValid`)
- JSON schema validation via Ajv (`checkJsonSchema`)
- Regex match (`checkRegexMatch`) with ReDoS protection (pattern length limit, nested quantifier detection)
- Exact match with trim (`checkExactMatch`)
- Aggregated `runChecks()` wrapper with per-check enable/disable

**Guardrails** (`packages/shared/src/eval/guardrails.ts`):

- PII detection: email, phone, SSN, credit card (Luhn-validated), IP address, with redacted output
- Prompt injection heuristics: 10 regex patterns covering common injection vectors
- `runGuardrails()` aggregator that checks output for PII and raw input for injection

**LLM-as-Judge** (`apps/web/src/lib/llm/judge.ts`):

- Single-criteria rubric-based scoring with configurable scale (default 1-5)
- XML-delimited prompt with anti-injection instructions
- JSON response parsing with score range validation
- Uses the user's own BYOK key via the same LLM client

**LLM Providers** (`apps/web/src/lib/llm/`):

- OpenAI (native adapter), Anthropic (native adapter), Groq (native adapter)
- Together AI (OpenAI-compatible, custom base URL)
- Custom (OpenAI-compatible, user-provided base URL with SSRF validation)
- All clients: 60s fetch timeout, API key redaction in error messages, response structure validation

**Verdict Calculation** (`packages/shared/src/eval/verdict.ts`):

- Priority: check/guardrail pass divergence > judge score delta > SAME
- Configurable `deltaThreshold` for judge score comparison

**Engine Orchestrator** (`apps/web/src/lib/eval/engine.ts`):

- Controlled concurrency (default 3)
- Retry once after 2s, then mark as ERROR
- Auto-pause after 5 consecutive errors
- Resume support (skip completed items)
- Per-item progress callbacks

**Backend** (`apps/api/src/routes/eval-runs.ts`, `apps/api/src/services/eval-summary.ts`):

- Eval run lifecycle: create (RUNNING), store items (idempotent), complete (COMPLETED/FAILED)
- Summary computation: totalItems, pass rates, avg scores, improved/regressed/same counts, top regressions
- RBAC: MEMBER to create/run, VIEWER to read
- Audit events for run start/complete
- CSV and JSON export from the report page

**UI Pages** (`apps/web/src/app/(dashboard)/[orgSlug]/[projectSlug]/evals/`):

- Eval config list with rules summary
- Config wizard (5-step) and quick-create dialog
- Run execution page with setup (prompt version + API key selection), live progress, verdict counters, pause/resume/abort
- Run report page with summary cards, paginated results table, verdict filter, side-by-side item inspection dialog, top regressions list

### MVP Improvements (Prioritized)

#### 1. Contains / Not-Contains Check

- **Why** -- The most commonly needed eval check in practice. Users running classification, extraction, or Q&A evals need to verify that specific strings appear (or are absent) in outputs without writing regex.
- **What to do** -- Add `checkContains(output, substring, caseSensitive?)` and `checkNotContains(output, substring, caseSensitive?)` to `packages/shared/src/eval/checks.ts`. Extend `EvalChecks` in `evalChecksSchema` with `contains: z.array(z.string()).nullable().default(null)` and `notContains: z.array(z.string()).nullable().default(null)`. Wire into `runChecks()`. Add corresponding UI fields in the config wizard checks step. Add unit tests.
- **Effort** -- S

#### 2. Output Length Limit Guardrail

- **Why** -- Runaway outputs waste tokens and money. Users need a hard upper bound on output length, especially for classification and structured extraction tasks.
- **What to do** -- Add `maxOutputLength: z.number().int().positive().nullable().default(null)` to `evalGuardrailsSchema`. Implement `checkOutputLength(output, maxLength)` in `guardrails.ts`. Wire into `runGuardrails()`. When flagged, include the actual length vs. the limit in the failure message. Add UI toggle + numeric input in the config wizard guardrails step.
- **Effort** -- S

#### 3. Cosine Similarity / Semantic Similarity Check

- **Why** -- Exact match is too strict for most NLP evals. Cosine similarity against an expected output (or a reference embedding) is the standard way to measure semantic closeness. Critical for summarization, paraphrase, and translation evals.
- **What to do** -- Add `checkCosineSimilarity(output, expected, threshold)` to `checks.ts`. For MVP, use a lightweight browser-side embedding approach: call the user's BYOK OpenAI embeddings endpoint (`text-embedding-3-small`) for both strings and compute cosine similarity. Add `cosineSimilarity: z.object({ threshold: z.number().min(0).max(1), model: z.string().optional() }).nullable().default(null)` to `evalChecksSchema`. The check passes if similarity >= threshold. Store the raw similarity score in `CheckResult.details`. Requires extending `EvalEngine` to pass the LLM client to the checks layer for embedding calls.
- **Effort** -- M

#### 4. Multi-Criteria Judge with Rubric Templates

- **Why** -- The current judge scores on a single rubric string. Real-world evals need multiple criteria (accuracy, fluency, safety, relevance) each scored independently, with a weighted aggregate. Rubric templates reduce setup time and improve consistency.
- **What to do** -- Extend `evalJudgeSchema` with `criteria: z.array(z.object({ name: z.string(), rubric: z.string(), weight: z.number().min(0).max(1) })).optional()`. When `criteria` is present, `scoreWithJudge` iterates over each criterion, produces per-criterion scores, and computes a weighted aggregate. Store per-criterion scores in `judgeReasons` or a new `judgeCriteria` field on `EvalItemMetrics`. Add 4-5 built-in rubric templates (Summarization Quality, Q&A Accuracy, Classification Correctness, Code Quality, Safety/Toxicity) as JSON presets selectable in the config wizard. Display per-criterion breakdown in the item inspection dialog.
- **Effort** -- M

#### 5. Confidence Scores on Judge Output

- **Why** -- Users need to know when to trust the judge's score. A judge that is uncertain about a score should be flagged so users can manually review those items.
- **What to do** -- Update the judge prompt to request a `confidence` field (0-1) alongside `score` and `reasons`. Parse it in `parseJudgeResponse`. Store in `EvalItemMetrics` as `judgeConfidence: number | null`. In the report UI, add a "Low Confidence" filter (e.g., confidence < 0.6) and surface a warning icon on items with low confidence. Include `avgConfidence` in the eval run summary.
- **Effort** -- S

#### 6. Google Gemini Provider

- **Why** -- Gemini is the third most popular LLM provider. Many users have Gemini API keys and want to eval Gemini-powered prompts directly.
- **What to do** -- Add `"GEMINI"` to `PROVIDER_TYPES` in `constants.ts`. Create `apps/web/src/lib/llm/gemini-client.ts` implementing `LLMClient`. The Gemini REST API (`generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`) uses a Bearer token. Map `LLMGenerateRequest` fields to Gemini's `contents` format. Add to `createLLMClient` factory and `getDefaultModel` (default: `gemini-2.0-flash`). Handle Gemini-specific response structure (`candidates[0].content.parts[0].text`) and token counting.
- **Effort** -- M

#### 7. Ollama (Local) Provider

- **Why** -- Users running local models via Ollama need to eval them without paying for API calls. This is especially valuable for enterprises with data privacy requirements.
- **What to do** -- Add `"OLLAMA"` to `PROVIDER_TYPES`. Since Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`, implement it as an OpenAI adapter with a localhost base URL. Relax the SSRF validation in `validateBaseUrl()` to allow `localhost` and `127.0.0.1` explicitly (already partially allowed). Add to `createLLMClient` factory. Default model: `llama3.2`. Add a note in the UI that Ollama must be running locally with CORS headers enabled.
- **Effort** -- S

#### 8. Azure OpenAI Provider

- **Why** -- Enterprise customers use Azure OpenAI rather than direct OpenAI. The API format differs (custom base URL with deployment name in the path, `api-key` header instead of `Bearer` token, `api-version` query parameter).
- **What to do** -- Add `"AZURE_OPENAI"` to `PROVIDER_TYPES`. Create `apps/web/src/lib/llm/azure-openai-client.ts` implementing `LLMClient`. Require `baseUrl` (the Azure resource endpoint), `deploymentName`, and `apiVersion` in the config. The endpoint pattern is `{baseUrl}/openai/deployments/{deployment}/chat/completions?api-version={version}`. Auth via `api-key` header. Add to factory. Add deployment name and API version fields in the eval run setup UI when Azure is selected.
- **Effort** -- M

#### 9. Toxicity Detection Guardrail

- **Why** -- PII detection alone is insufficient for safety. Users need to detect toxic, harmful, or offensive content in LLM outputs, especially for user-facing applications.
- **What to do** -- Add `toxicityCheck: z.boolean().default(false)` to `evalGuardrailsSchema`. Implement `detectToxicity(text)` in `guardrails.ts` using a keyword/phrase-based heuristic approach (similar to prompt injection detection) covering profanity, slurs, violence, self-harm, and hate speech categories. Use a curated blocklist of ~200 high-confidence patterns. Return `GuardrailResult` with matched categories. For MVP, this is deterministic (no LLM call). Wire into `runGuardrails()`. Add UI toggle in config wizard.
- **Effort** -- M

#### 10. Custom Blocklist Guardrail

- **Why** -- Every domain has its own banned terms (competitor names, internal codenames, restricted medical/legal terms). Users need to define their own blocklists without writing regex.
- **What to do** -- Add `customBlocklist: z.array(z.string()).nullable().default(null)` to `evalGuardrailsSchema`. Implement `checkCustomBlocklist(output, blocklist)` in `guardrails.ts` using case-insensitive substring matching. Wire into `runGuardrails()`. In the config wizard, add a textarea for comma-separated or newline-separated blocked terms. Report which specific blocked term was found.
- **Effort** -- S

#### 11. Eval Run Comparison View (Side-by-Side Runs)

- **Why** -- Users run evals iteratively and need to compare two runs to see what improved and what regressed between prompt iterations. This is the core feedback loop of prompt engineering.
- **What to do** -- Add a new page at `evals/[configId]/compare` that takes two `runId` query parameters. Fetch both runs' summaries and items. Display side-by-side summary cards (delta of deltas). Show a table with matched dataset items: left column = run A verdict/score, right column = run B verdict/score, with regression highlighting (items that were IMPROVED in run A but REGRESSED in run B get a red highlight). Add a "Compare" button on the config detail page that lets users select two runs. Add trend sparkline charts for score averages across all runs of a config.
- **Effort** -- L

#### 12. Cost Tracking (Token Usage and Cost Estimation)

- **Why** -- Users need to know how much an eval run costs before they spend money on a 500-item dataset. Post-run, they need to see total token usage and estimated cost for budgeting.
- **What to do** -- The `LLMGenerateResponse` already includes `tokenCount`. Aggregate token counts into `EvalItemMetrics` as `inputTokens` and `outputTokens` (update all 3 client adapters to report these separately from the provider's `usage` response). Add `totalTokens`, `estimatedCostUsd` to `EvalRunSummary`. Implement a cost estimation helper with per-provider, per-model pricing tables (hardcoded for top 10 models, with a fallback estimate). Show cost in the run report summary cards. Add a pre-run cost estimate on the run execution page based on dataset size and average prompt length.
- **Effort** -- M

#### 13. BLEU/ROUGE Scores Check

- **Why** -- Standard NLP evaluation metrics for translation (BLEU) and summarization (ROUGE). Expected by ML teams who are used to these benchmarks.
- **What to do** -- Implement lightweight BLEU-1/BLEU-2 and ROUGE-L scoring functions in `packages/shared/src/eval/checks.ts` (pure TypeScript, no external dependencies). BLEU uses n-gram precision with brevity penalty. ROUGE-L uses longest common subsequence. Add `bleuScore: z.object({ threshold: z.number().min(0).max(1) }).nullable().default(null)` and `rougeScore: z.object({ threshold: z.number().min(0).max(1), variant: z.enum(["rouge-l"]) }).nullable().default(null)` to `evalChecksSchema`. Store the raw score in `CheckResult.details`. These require an `expectedOutput` in the dataset item.
- **Effort** -- M

#### 14. Eval Templates (Pre-Built Configs)

- **Why** -- New users don't know which checks, guardrails, and judge settings to use. Pre-built templates for common use cases dramatically reduce time-to-first-eval and teach best practices.
- **What to do** -- Create a `packages/shared/src/eval/templates.ts` file exporting an array of `EvalTemplate` objects: `{ id, name, description, category, rules: EvalRules }`. Include 6 templates: (1) Summarization Quality -- ROUGE check + judge with summarization rubric; (2) Q&A Accuracy -- exact match + contains check + judge with accuracy rubric; (3) Classification -- exact match + contains check; (4) JSON API Response -- JSON validity + JSON schema + PII guardrail; (5) Safe Chatbot -- PII + prompt injection + toxicity guardrails + judge with safety rubric; (6) Code Generation -- regex check for code blocks + judge with code quality rubric. In the config wizard, add a "Start from template" option in step 1 that pre-fills all rules. Show template cards with descriptions.
- **Effort** -- M

#### 15. Scheduled Evals (Automated Recurring Runs)

- **Why** -- Prompt quality can degrade over time as models update or data drifts. Scheduled evals catch regressions automatically without manual intervention.
- **What to do** -- Add a `schedules` table in the database: `id, eval_config_id, cron_expression, last_run_at, next_run_at, enabled, base_version_id, candidate_version_id, provider_key_id, created_by`. Create CRUD API endpoints for schedules. On the backend, use Cloudflare Workers Cron Triggers (since the backend runs on Workers) to check for due schedules every 15 minutes. For scheduled runs, the backend must orchestrate the eval (not the browser), which means adding a server-side eval execution path using stored provider keys. This is a significant architecture extension. For MVP, limit to a "reminder" notification (email or in-app) that prompts the user to run the eval manually.
- **Effort** -- L

#### 16. A/B Testing (Split Traffic Between Prompt Versions)

- **Why** -- After eval shows a candidate is better, users need to gradually roll out the new prompt version to production traffic and measure real-world impact before fully committing.
- **What to do** -- Add a `traffic_split` column to the prompt version or a new `ab_tests` table: `id, prompt_id, base_version_id, candidate_version_id, split_percentage, status, started_at, ended_at`. Update the SDK's `getPrompt` endpoint to return the appropriate version based on the split percentage (deterministic hash of a session/user ID). Add a simple A/B test dashboard page showing live traffic distribution and SDK-reported metrics per version. Track `ab_test_started`, `ab_test_impression`, `ab_test_completed` events. This depends on SDK logging infrastructure already in place.
- **Effort** -- L

#### 17. Streaming Support

- **Why** -- Many LLM applications use streaming responses. The eval engine currently waits for full responses, which adds latency and prevents real-time output display during eval runs.
- **What to do** -- Add a `stream` option to `LLMGenerateRequest`. Implement SSE parsing in OpenAI and Anthropic clients (Groq already uses OpenAI-compatible streaming). Buffer chunks and return the full response when complete, but emit partial output via a callback for UI display. Update `EvalEngine.processItemCore` to accept an optional `onChunk` callback. Show streaming output in the run execution page for the currently-processing item. Time-to-first-token (TTFT) metric added to `EvalItemMetrics`.
- **Effort** -- M

#### 18. Custom Scorers (User-Defined JavaScript Functions)

- **Why** -- Power users need domain-specific scoring logic that can't be expressed as checks or judge rubrics (e.g., "count the number of bullet points", "verify the output sums to 100%", "check that the date is in ISO format").
- **What to do** -- Add `customScorers: z.array(z.object({ name: z.string(), code: z.string().max(10_000) })).nullable().default(null)` to `evalRulesSchema`. Execute user code in a sandboxed Web Worker with a 5-second timeout and no network/DOM access. The scorer function signature is `(input: string, output: string, expected?: string) => { pass: boolean, score?: number, reason?: string }`. Store results in `EvalItemMetrics.customScorers`. Add a code editor (Monaco) in the config wizard for writing scorer functions with TypeScript hints. Security: use `new Function()` inside a Worker with `importScripts` blocked.
- **Effort** -- L

#### 19. Language Detection Guardrail

- **Why** -- Multilingual applications need to ensure outputs are in the expected language. A French customer service bot producing English responses is a regression.
- **What to do** -- Add `expectedLanguage: z.string().length(2).nullable().default(null)` to `evalGuardrailsSchema` (ISO 639-1 code). Implement `detectLanguage(text)` in `guardrails.ts` using a trigram-based language detection approach (pure TypeScript, ~50 languages). The `franc` npm package is a good lightweight option (~200KB). Guardrail fails if detected language does not match expected. Store detected language in the guardrail result details.
- **Effort** -- M

#### 20. Regression Highlighting and Trend Charts

- **Why** -- Users need to see at a glance whether prompt quality is trending up or down across multiple eval runs. Individual run reports are not enough.
- **What to do** -- On the eval config detail page, add a "Trends" section below the run history table. Fetch the last 20 runs' summaries. Render: (1) Line chart of candidateAvgScore over time; (2) Stacked bar chart of improved/regressed/same counts per run; (3) Line chart of candidatePassRate over time. Use a lightweight charting library (recharts, already common in Next.js projects). Highlight runs where regression count spiked. Add a "regression alert" badge on the config list page if the most recent run has more regressions than the previous run.
- **Effort** -- M

### PostHog Integration Points

| Event Name                 | Trigger                                                                   | Properties                                                                                                                                    | Why Track                                                                             |
| -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `eval_config_created`      | User creates a new eval config (wizard or quick-create)                   | `project_id`, `checks_enabled` (list), `guardrails_enabled` (list), `judge_enabled`, `template_used` (if from template)                       | Track which checks/guardrails are most popular; measure template adoption rate        |
| `eval_run_started`         | User clicks "Start Evaluation" on the run execution page                  | `eval_config_id`, `project_id`, `provider`, `model`, `dataset_item_count`, `concurrency`, `checks_enabled`, `judge_enabled`                   | Measure eval adoption, dataset sizes, and provider distribution                       |
| `eval_run_completed`       | Eval engine finishes all items and backend computes summary               | `eval_config_id`, `run_id`, `total_items`, `improved_count`, `regressed_count`, `same_count`, `duration_seconds`, `error_count`, `provider`   | Core success metric; measure completion rates and eval quality trends                 |
| `eval_run_failed`          | Eval engine encounters a fatal error or user aborts                       | `eval_config_id`, `run_id`, `error_message`, `items_completed`, `items_total`, `failure_reason` (abort/error/pause_timeout), `provider`       | Debug provider failures; measure reliability per provider                             |
| `eval_run_paused`          | Engine auto-pauses after 5 consecutive errors                             | `eval_config_id`, `run_id`, `consecutive_errors`, `last_error_message`, `items_completed`, `provider`                                         | Identify problematic provider/model combinations; tune auto-pause threshold           |
| `eval_run_resumed`         | User clicks Resume after a pause                                          | `eval_config_id`, `run_id`, `items_remaining`                                                                                                 | Measure recovery rate; determine if auto-pause is too aggressive                      |
| `eval_check_result`        | Each deterministic check completes (sampled at 10% to avoid event volume) | `check_type` (jsonValid/schema/regex/exact/contains/cosine/bleu/rouge), `passed`, `eval_config_id`                                            | Track check pass/fail rates; identify most-failed checks to improve UX guidance       |
| `eval_guardrail_triggered` | A guardrail flags content                                                 | `guardrail_type` (pii/injection/toxicity/blocklist/language/outputLength), `eval_config_id`, `match_category` (for PII: email/phone/ssn etc.) | Measure guardrail trigger rates; identify which PII categories are most common        |
| `eval_judge_scored`        | Judge returns a score for one item (sampled at 10%)                       | `score`, `confidence`, `scale_min`, `scale_max`, `model`, `latency_ms`, `criteria_count`                                                      | Track judge score distributions; identify calibration issues; measure judge latency   |
| `eval_provider_call`       | Each LLM API call completes (sampled at 10%)                              | `provider`, `model`, `latency_ms`, `token_count`, `is_judge_call`, `status` (success/error)                                                   | Provider performance benchmarking; cost attribution; identify slow providers          |
| `eval_report_viewed`       | User opens the run report page                                            | `run_id`, `eval_config_id`, `time_since_run_completed_seconds`                                                                                | Measure how quickly users check results; report page engagement                       |
| `eval_report_exported`     | User exports CSV or JSON from the report page                             | `run_id`, `format` (csv/json), `item_count`                                                                                                   | Track export adoption; identify users who need programmatic access (SDK opportunity)  |
| `eval_item_inspected`      | User opens the side-by-side item inspection dialog                        | `run_id`, `verdict`, `has_judge_score`                                                                                                        | Measure deep-dive behavior; do users inspect regressions more than improvements?      |
| `eval_comparison_viewed`   | User opens the run comparison page (future feature)                       | `config_id`, `run_a_id`, `run_b_id`                                                                                                           | Validate that comparison is used; measure iterative eval workflow adoption            |
| `eval_template_selected`   | User picks a pre-built eval template (future feature)                     | `template_id`, `template_name`, `project_id`                                                                                                  | Measure template adoption; identify most popular templates to prioritize improvements |

---

## Domain: SDK & Deployment

### What Exists Now

**SDK (`packages/sdk/`):**
The TypeScript SDK is a single-file package (`src/index.ts`, ~146 lines) that exports a `PromptOpsClient` class. It supports two methods: `logRun()` for direct run logging and `instrumentedGenerate()` for wrapping async LLM calls with automatic latency measurement. The client authenticates via project-scoped API keys (`po_sk_` prefix) sent as Bearer tokens. It includes retry logic (3 retries with exponential backoff + jitter on 5xx), fire-and-forget error handling (never throws to crash user apps), AbortController-based timeouts (default 5s), and an `onLogError` callback hook. The SDK depends on `@promptops/shared` for constants (`API_RUNS_PATH`, `SDK_DEFAULT_BASE_URL`, `SDK_DEFAULT_TIMEOUT_MS`) and types (`LogRunRequest`, `LogRunResponse`, `JsonObject`). Distribution is currently GitHub-only (`npm install github:...`); no npm publish workflow exists. There are 13 unit tests covering constructor validation, logRun HTTP behavior, retry logic, and instrumentedGenerate. The SDK has no build step -- `package.json` exports the raw TypeScript source (`"exports": { ".": "./src/index.ts" }`), which means consumers must have a TypeScript-compatible build pipeline.

**Deployment:**

- **Frontend:** Next.js on Vercel free tier (100GB bandwidth/month) with automatic preview deploys from PRs and production deploys from `main`. Next.js config includes security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control) and a rewrite proxy (`/api/:path*` to the Cloudflare Worker) so cookies stay on the same domain.
- **Backend:** Cloudflare Workers free tier (100K req/day) with D1 (5M reads/day, 100K writes/day, 5GB) and R2 (10GB, 10M reads/month). `wrangler.toml` defines separate `development` and `production` environments with distinct `FRONTEND_URL` and `ENVIRONMENT` vars. Both environments share the same D1 database ID (`5e57380c-...`), which means dev and prod use the same physical database. Secrets (JWT_SECRET, GITHUB_CLIENT_ID/SECRET, ENCRYPTION_KEY) are in Wrangler's secret store.
- **CI:** GitHub Actions (`ci.yml`) runs format:check, lint, typecheck, test on push and PR. The `deploy.yml` workflow applies all 8 D1 migrations (must be idempotent), deploys the Worker, and runs a health-check curl. The `CLOUDFLARE_API_TOKEN` GitHub secret is documented but not yet configured, meaning the deploy workflow is not yet operational.
- **Monorepo:** pnpm 10.2.0 workspaces (`apps/*`, `packages/*`) with Turborepo for task orchestration (`turbo.json` defines build, dev, lint, typecheck, test tasks with dependency chains). Root `package.json` provides unified commands: `install:deps`, `install:ci`, `dev`, `build`, `lint`, `typecheck`, `test`, `deploy:api`, `tail:api`.

**Gaps:** No Python SDK, no framework integrations, no batch/offline logging, no npm publishing, no preview environments for the API backend, no staging environment, no monitoring/alerting beyond manual Cloudflare dashboard inspection, no centralized logging, no PostHog analytics, no infrastructure-as-code, no CDN caching strategy, and the SDK ships raw TypeScript instead of compiled JavaScript.

---

### MVP Improvements (Prioritized)

#### 1. NPM Publishing Workflow

- **Why** -- The current GitHub-based install (`npm install github:promptops/studio#packages/sdk`) is fragile, slow, and unfamiliar to most developers. A proper npm package at `@promptops/sdk` is table stakes for any SDK adoption. Additionally, the SDK currently ships raw TypeScript source (`"exports": { ".": "./src/index.ts" }`) meaning consumers must have a TypeScript-compatible build pipeline, which excludes plain JavaScript projects entirely.
- **What to do**
  - Add a `tsconfig.build.json` to `packages/sdk/` that compiles to `dist/` with ESM output and declaration files (`declaration: true`, `outDir: "dist"`, `rootDir: "src"`).
  - Update `packages/sdk/package.json`: add `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`, `"exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }`, and `"files": ["dist", "README.md"]`.
  - Add a real `build` script: `"build": "tsc -p tsconfig.build.json"` (replacing the current no-emit typecheck).
  - Create `.github/workflows/publish-sdk.yml` triggered on tags matching `sdk-v*`:
    - Checkout, pnpm install, build shared package, build SDK, run SDK tests.
    - `pnpm --filter @promptops/sdk publish --no-git-checks --access public` using an `NPM_TOKEN` repository secret.
    - Enable npm provenance attestation with the `--provenance` flag (requires `id-token: write` permission in the workflow).
  - Add a `CHANGELOG.md` to `packages/sdk/` for release notes.
  - Add `"version": "0.1.0"` as the initial published version.
  - Update `SDK_DEFAULT_BASE_URL` in `packages/shared/src/constants.ts` from `http://localhost:8787` to the production API URL once custom domains are configured, so published SDK consumers do not default to localhost.
- **Effort** -- S

#### 2. Batch Logging

- **Why** -- Production apps generating hundreds of LLM calls per minute will fire one HTTP request per `logRun` call, wasting network resources and risking the 100 req/min per-key rate limit. Batching reduces network overhead by 10-50x and eliminates rate limit concerns for high-throughput users.
- **What to do**
  - Add a `BatchQueue` class in `packages/sdk/src/batch.ts` with configurable `maxBatchSize` (default 25), `flushIntervalMs` (default 5000), and `maxQueueSize` (default 1000).
  - Queue `logRun` payloads internally instead of firing immediately; flush on interval tick or when batch size threshold is reached.
  - Add a new `POST /api/runs/batch` endpoint in the backend that accepts `{ runs: LogRunRequest[] }` and bulk-inserts into D1 using a single transaction.
  - Add `batchCreateRunLogRequestSchema` to `packages/shared/src/schemas.ts`: `z.object({ runs: z.array(createRunLogRequestSchema).min(1).max(100) })`.
  - Expose `client.flush(): Promise<void>` for graceful shutdown (users call it in `process.on('beforeExit')` or similar).
  - Add `enableBatching: boolean` to `PromptOpsClientConfig` (default `false` for backward compatibility).
  - Add `batchSize`, `flushInterval`, and `maxQueueSize` optional config fields.
  - Add `onBatchError?: (error: unknown, failedRuns: LogRunRequest[]) => void` callback so users can handle batch failures (e.g., write to a local fallback).
  - In the SDK, when batching is enabled, `logRun` enqueues and returns `{ id: "pending", status: "queued" }` immediately.
- **Effort** -- M

#### 3. Offline Support / Queue Resilience

- **Why** -- SDK users in edge environments, serverless cold starts, mobile backends, or flaky networks will lose run data when all 3 retries fail. A persistent queue prevents silent data loss and ensures eventual delivery.
- **What to do**
  - Extend the `BatchQueue` with a `PersistenceAdapter` interface: `save(items: LogRunRequest[]): Promise<void>`, `load(): Promise<LogRunRequest[]>`, `clear(): Promise<void>`.
  - Provide a default in-memory adapter (no persistence, current behavior) and two optional adapters:
    - `FileSystemAdapter` (Node.js): writes to `~/.promptops/queue.jsonl`, one JSON line per queued run. Reads on client init and drains.
    - `LocalStorageAdapter` (browser): uses `localStorage` with a `promptops_queue` key. Size-limited to 500KB to avoid storage quota issues.
  - On network failure after all retries, push the payload to the persistent queue instead of discarding it.
  - Add a background reconciliation loop (configurable interval, default 30s) that checks connectivity by pinging `GET /api/health` and drains the queue when the backend is reachable.
  - Expose `client.pendingCount: number` readonly property for observability.
  - Add `persistence?: PersistenceAdapter` to `PromptOpsClientConfig`.
  - Document the queue behavior, adapter options, and shutdown considerations in the SDK README.
- **Effort** -- M

#### 4. Auto-Instrumentation

- **Why** -- Manual `logRun` calls are tedious and error-prone. Developers forget to instrument calls, pass wrong fields, or do it inconsistently across their codebase. Auto-instrumentation provides zero-effort observability by wrapping existing LLM client objects.
- **What to do**
  - Create `packages/sdk/src/instrument/openai.ts` that monkey-patches the OpenAI client:
    - `client.instrumentOpenAI(openai)` returns a proxied OpenAI client.
    - Intercepts `chat.completions.create` (and `completions.create` for legacy) calls.
    - Automatically extracts: messages array (input), response content (output), `usage.prompt_tokens + usage.completion_tokens` (tokenCount), model name (metadata), wall-clock latency.
    - Computes `costEstimate` from a built-in token pricing table (updatable via config).
  - Create `packages/sdk/src/instrument/anthropic.ts` for `anthropic.messages.create`:
    - Extracts: messages array (input), response content blocks (output), `usage.input_tokens + usage.output_tokens` (tokenCount), model name.
  - Handle streaming: wrap async iterators to buffer the full streamed output, then log once the stream completes.
  - Allow per-call opt-out via an extra options field: `{ promptops: { skip: true } }` or `{ promptops: { promptVersionId: "ver_abc" } }` to attach a version.
  - Export as separate subpath entries in `package.json`: `"@promptops/sdk/openai"`, `"@promptops/sdk/anthropic"` so the modules are tree-shakeable and do not add unwanted dependencies.
  - Add `openai` and `@anthropic-ai/sdk` as optional `peerDependencies`.
- **Effort** -- L

#### 5. Framework Integrations

- **Why** -- LangChain, LlamaIndex, and Vercel AI SDK are the dominant frameworks for building LLM applications. Native integrations let users adopt PromptOps without changing their application code, just by adding a callback handler or middleware.
- **What to do**
  - **Vercel AI SDK middleware:** Create `packages/sdk/src/integrations/vercel-ai.ts` implementing the Vercel AI SDK `LanguageModelMiddleware` interface. Intercept `doGenerate` and `doStream` calls, extract input/output/usage from `LanguageModelRequestMetadata` and the result, log via the PromptOps client. Export as `@promptops/sdk/vercel-ai`. Example usage: `const model = wrapLanguageModel({ model: openai("gpt-4o"), middleware: promptopsMiddleware(client) })`.
  - **LangChain callback handler:** Create `packages/sdk/src/integrations/langchain.ts` implementing the LangChain `BaseCallbackHandler` abstract class. Hook into `handleLLMStart` (capture input + start time), `handleLLMEnd` (capture output, compute latency, call logRun), `handleLLMError` (capture failure). Export as `@promptops/sdk/langchain`.
  - **LlamaIndex callback:** Similar pattern for the LlamaIndex `CallbackManager` interface with `on_event_start` / `on_event_end` hooks for LLM events.
  - Each integration is a separate entry point with the corresponding framework as a `peerDependency` (not a hard dependency).
  - Add a runnable example for each integration in `packages/sdk/examples/`.
- **Effort** -- L

#### 6. Python SDK

- **Why** -- The majority of AI/ML teams use Python. Without a Python SDK, PromptOps is invisible to the largest segment of LLM application developers. Many production setups run Python backends with TypeScript frontends, and they need a native SDK for server-side logging.
- **What to do**
  - Create `packages/sdk-python/` as a standalone Python package (`promptops`) with:
    - `promptops/client.py`: `PromptOpsClient` class with `log_run()` (sync) and `alog_run()` (async) methods, plus `instrumented_generate()` wrapper.
    - `promptops/batch.py`: batch queue with `flush()` and `shutdown()`, matching the TypeScript batch design.
    - `promptops/instrument/openai.py`: `instrument_openai(client)` for auto-instrumenting the OpenAI Python SDK.
    - `promptops/instrument/anthropic.py`: similar for the Anthropic Python SDK.
  - Use `httpx` for async HTTP with built-in retry support (or `tenacity` for retry decoration).
  - Type hints throughout with Pydantic v2 models for request/response validation.
  - Batch support from day one: `enable_batching=True` config option.
  - `pyproject.toml` with `hatchling` or `setuptools` backend; target Python 3.9+.
  - Publish workflow: `.github/workflows/publish-sdk-python.yml` triggered on tags matching `sdk-python-v*`. Steps: checkout, install Python + dependencies, run pytest, build with `python -m build`, upload to PyPI with `twine upload dist/*` using a `PYPI_TOKEN` secret.
  - Mirror the TypeScript test coverage: constructor validation, logRun HTTP behavior, retry logic, instrumented_generate, batch flush.
  - README with quickstart guide matching the TypeScript SDK documentation structure.
- **Effort** -- L

#### 7. SDK Documentation and Developer Portal

- **Why** -- The current README is a minimal API reference. Developers need interactive examples, copy-paste quickstart guides, framework-specific integration guides, and troubleshooting docs to adopt the SDK quickly. Poor documentation is the number one reason developers abandon SDKs.
- **What to do**
  - Add a `/docs` section to the web app (or a separate documentation site using Starlight/Mintlify) with:
    - **Quickstart guide:** 5-minute setup (install, init client, log first run) with copy-pasteable code snippets for TypeScript and Python.
    - **API reference:** auto-generated from TypeScript types and JSDoc comments using TypeDoc or similar.
    - **Integration guides:** one page per framework (OpenAI, Anthropic, Vercel AI SDK, LangChain, LlamaIndex) with complete working examples.
    - **Configuration reference:** all config options with defaults, environment variables, and recommendations for production vs. development.
    - **Troubleshooting / FAQ:** common issues (CORS errors, rate limiting, timeout tuning, batch flush on shutdown).
  - Expand `packages/sdk/examples/` with runnable examples: `openai-basic.ts`, `anthropic-streaming.ts`, `vercel-ai-middleware.ts`, `langchain-callback.ts`, `batch-logging.ts`, `offline-queue.ts`.
  - Add JSDoc comments to all public methods and types in `packages/sdk/src/index.ts`.
  - Create a Postman / Bruno collection for the run logging API endpoints (`POST /api/runs`, `POST /api/runs/batch`, `GET /api/projects/:id/runs`, `GET /api/projects/:id/runs/stats`).
- **Effort** -- M

#### 8. Preview Environments (Per-PR API Backend)

- **Why** -- Vercel provides frontend previews automatically, but there is no isolated API backend for PR testing. This means PR reviewers cannot verify backend changes (new endpoints, migration changes, auth changes) end-to-end without manually running the API locally. This slows down review cycles and increases the risk of shipping broken backend code.
- **What to do**
  - Create `.github/workflows/preview.yml` triggered on `pull_request` events (opened, synchronize, reopened).
  - Use Wrangler to deploy to a PR-specific environment:
    - Add a dynamic `[env.preview]` generation step that creates a temporary wrangler config with PR-specific Worker name (`promptops-api-preview-pr-<number>`).
    - Create a temporary D1 database for the preview (or use a shared preview D1 with table-name prefixes, though isolated databases are cleaner).
    - Apply all migrations to the preview D1.
    - Deploy with `wrangler deploy --env preview-pr-${{ github.event.pull_request.number }}`.
  - Post the preview API URL as a PR comment using `gh pr comment --body "Preview API: https://promptops-api-preview-pr-123.promptops-ameer.workers.dev"`.
  - Set the preview API URL as the `NEXT_PUBLIC_API_URL` override for the Vercel preview deployment (using Vercel's deployment URL-specific env var override or by adding a `vercel.json` preview configuration).
  - Add a cleanup workflow (`.github/workflows/preview-cleanup.yml`) triggered on `pull_request` closed events that deletes the preview Worker and its D1 database.
  - Limit preview deployments to PRs with a specific label (e.g., `deploy-preview`) to conserve Cloudflare free-tier resources.
- **Effort** -- L

#### 9. Staging Environment

- **Why** -- There is no environment between local development and production. Changes merged to `main` deploy straight to production via `deploy.yml`, with no staging gate for integration testing, migration validation, or QA.
- **What to do**
  - Create a separate D1 database for staging: `wrangler d1 create promptops-db-staging`.
  - Create a separate R2 bucket for staging: `wrangler r2 bucket create promptops-storage-staging`.
  - Add `[env.staging]` section to `apps/api/wrangler.toml` with the staging D1 ID, R2 bucket name, `ENVIRONMENT=staging`, and `FRONTEND_URL` pointing to the staging Vercel deployment.
  - Create a staging Vercel project (or configure a branch-based deployment: push to `staging` branch deploys to `promptops-staging.vercel.app`).
  - Create a separate GitHub OAuth app for staging with the staging callback URL.
  - Add `.github/workflows/deploy-staging.yml` triggered on push to the `staging` branch (or on push to `main` before the production deploy, as a pre-production gate).
  - Define GitHub Actions environments: `staging` and `production`, each with their own set of secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and environment-specific vars).
  - Document the promotion workflow: merge to `main` -> auto-deploy to staging -> manual approval (via GitHub environment protection rules) -> deploy to production.
- **Effort** -- M

#### 10. Monitoring and Alerting

- **Why** -- The only monitoring today is manual inspection of the Cloudflare and Vercel dashboards. There is no automated alerting for downtime, elevated error rates, or approaching free-tier quota limits. A production outage would go unnoticed until a user reports it.
- **What to do**
  - **Uptime monitoring:** Set up a free uptime monitor (Better Uptime, UptimeRobot, or Checkly free tier) pinging `GET /api/health` every 60 seconds with Slack/Discord webhook notifications on downtime.
  - **Deep health check:** Create `GET /api/health/deep` that verifies D1 connectivity (`SELECT 1`) and R2 access (head a known object). Return `{ status: "ok", d1: "ok", r2: "ok", latency_ms }`. Use this for uptime checks instead of the surface-level health endpoint.
  - **Free-tier quota monitor:** Add a Cloudflare Workers cron trigger (in `wrangler.toml`: `[triggers] crons = ["0 * * * *"]`) that runs hourly and checks D1 reads/writes and Worker request counts against the free-tier thresholds via the Cloudflare API. Post an alert to a Slack/Discord webhook when usage exceeds 80% of any limit.
  - **Structured request logging:** Add a middleware in the Worker that emits a structured JSON log line for every request: `{ timestamp, level, requestId, method, path, status, latencyMs, userId, orgId, error }`. This is the foundation for log aggregation (item 14).
  - **Cloudflare Notifications:** Configure the built-in Cloudflare Notifications for Worker error rate spikes and D1 storage approaching 5GB.
  - **Vercel monitoring:** Enable Vercel Speed Insights and Web Vitals monitoring (free tier includes basic metrics).
- **Effort** -- M

#### 11. CDN and Edge Caching

- **Why** -- Static and semi-static API responses (health check, public project metadata, eval config details) are re-computed on every request. Caching improves latency for users, reduces D1 read consumption (critical on the 5M reads/day free tier), and lowers Worker request counts (critical on the 100K/day limit).
- **What to do**
  - Add `Cache-Control` headers to appropriate read-only API responses:
    - `GET /api/health` -- `public, max-age=60` (cache 1 minute).
    - `GET /api/projects/:id` -- `private, max-age=30, stale-while-revalidate=60` (cache 30s per-user).
    - `GET /api/projects/:id/runs/stats` -- `private, max-age=60, stale-while-revalidate=120` (stats do not change rapidly).
  - Use the Cloudflare Cache API inside the Worker for frequently-accessed read endpoints. Pattern: check `caches.default.match(request)`, return cached response if present, otherwise compute and `caches.default.put(request, response.clone())`.
  - Add `Vary: Authorization` to all cached responses to ensure per-user isolation.
  - For mutation endpoints (POST, PATCH, DELETE), add `Cache-Control: no-store` to prevent accidental caching.
  - On the frontend: verify that Next.js static assets (JS/CSS bundles) receive `immutable` cache headers from Vercel (they should by default), and configure ISR (Incremental Static Regeneration) for semi-static pages like documentation.
- **Effort** -- S

#### 12. Custom Domains

- **Why** -- The production URLs (`promptops-api-production.promptops-ameer.workers.dev` and `prompt-ops-web.vercel.app`) look unprofessional, are hard to remember, make OAuth callback configuration fragile, and would be disruptive to change later after users have configured their SDK `baseUrl`. Custom domains should be set up before any public launch.
- **What to do**
  - Register or configure a domain (e.g., `promptops.dev` or `promptops.io`).
  - **Frontend:** Add `app.promptops.dev` as a custom domain in Vercel project settings. Add a CNAME DNS record pointing `app` to `cname.vercel-dns.com`.
  - **API:** Add `api.promptops.dev` as a custom domain on the Cloudflare Worker via Workers > Custom Domains in the dashboard. This requires the domain to be on Cloudflare DNS (add the domain to the Cloudflare account as a zone).
  - Update `FRONTEND_URL` in `wrangler.toml` `[env.production.vars]` to `https://app.promptops.dev`.
  - Update `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL` in Vercel env vars.
  - Update the production GitHub OAuth app callback URL to `https://api.promptops.dev/api/auth/callback`.
  - Update CORS allowed origins in the backend to include `https://app.promptops.dev`.
  - Update `SDK_DEFAULT_BASE_URL` in `packages/shared/src/constants.ts` to `https://api.promptops.dev` so published SDK consumers default to the correct production endpoint.
  - Update all references in documentation (README, SDK README, CONTEXT files).
- **Effort** -- S

#### 13. Infrastructure as Code

- **Why** -- The current infrastructure is set up via manual CLI commands and dashboard clicks, as documented in `CONTEXT_DEPLOYMENT.md`. This is fragile, poorly reproducible, and makes onboarding new contributors or recreating environments (staging, preview) error-prone. As the number of environments grows (production + staging + per-PR previews), manual management becomes untenable.
- **What to do**
  - Adopt Pulumi (TypeScript, natural fit for this monorepo) or Terraform for Cloudflare resource management.
  - Create `infra/` directory at the repo root with the IaC definition files:
    - `infra/index.ts` (Pulumi) or `infra/main.tf` (Terraform) defining: `cloudflare_workers_script`, `cloudflare_d1_database` (production + staging), `cloudflare_r2_bucket` (production + staging), `cloudflare_worker_route`, `cloudflare_record` (DNS entries for custom domains).
  - Store state in Pulumi Cloud (free tier for individual use) or Terraform Cloud (free tier for up to 5 users) to avoid committing state files to the repo.
  - Add a `plan` step to the CI workflow that runs on PRs and posts the infrastructure diff as a PR comment (showing what resources would be created/modified/destroyed).
  - Add an `apply` step to the deploy workflow that runs after successful CI and applies infrastructure changes before deploying application code.
  - Document the IaC setup, required secrets (`PULUMI_ACCESS_TOKEN` or `TF_API_TOKEN`), and the resource graph in `DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md`.
- **Effort** -- L

#### 14. Log Aggregation

- **Why** -- `wrangler tail` is ephemeral (only shows live-streamed logs) and cannot be searched, filtered, or correlated after the fact. There is no way to investigate a production error from yesterday, build dashboards on API usage patterns, or measure latency percentiles. This is a hard blocker for any production debugging workflow.
- **What to do**
  - Integrate with **Axiom** (free tier: 500MB/month ingest, 30-day retention) as the primary log aggregation target. Axiom has a native Cloudflare Workers integration and is well-suited for structured JSON logs.
  - **Option A (Cloudflare Logpush):** Configure Cloudflare Workers Logpush (available on Workers paid plan; not available on free tier). If on free tier, use Option B.
  - **Option B (Application-level logging):** Add a lightweight logging middleware in the Worker that batches structured log entries and POSTs them to Axiom's HTTP ingest endpoint (`https://api.axiom.co/v1/datasets/<dataset>/ingest`) using `ctx.waitUntil()` to avoid blocking responses.
  - Define a standard log schema: `{ timestamp, level, requestId, method, path, status, latencyMs, userId, orgId, projectId, error, cfColo, cfCountry }`.
  - Create saved queries and dashboards in Axiom:
    - Error rate by endpoint (5xx count / total count, grouped by path).
    - P50 / P95 / P99 latency by endpoint.
    - Top errors (grouped by error message).
    - Daily active users (distinct userId count).
    - SDK run volume over time (path = `/api/runs`, method = POST).
  - For frontend logs: use Vercel's built-in logging (available in dashboard) or add Axiom's Vercel integration for server-side Next.js logs.
- **Effort** -- M

#### 15. PostHog Provider Component (Frontend)

- **Why** -- Without product analytics, the team has no visibility into which features are used, where users drop off, what causes churn, or which pages are slow. PostHog provides product analytics, session replay, and feature flags in a single tool on a generous free tier (1M events/month).
- **What to do**
  - Install `posthog-js` in `apps/web/`: `pnpm --filter @promptops/web add posthog-js`.
  - Create `apps/web/src/components/providers/posthog-provider.tsx`:

    ```tsx
    "use client";
    import posthog from "posthog-js";
    import {
      PostHogProvider as PHProvider,
      usePostHog
    } from "posthog-js/react";
    import { useEffect } from "react";

    const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const POSTHOG_HOST =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    export function PostHogProvider({
      children
    }: {
      children: React.ReactNode;
    }) {
      useEffect(() => {
        if (!POSTHOG_KEY) return;
        posthog.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          person_profiles: "identified_only",
          capture_pageview: true,
          capture_pageleave: true,
          loaded: (ph) => {
            if (process.env.NODE_ENV === "development") ph.debug();
          }
        });
      }, []);

      if (!POSTHOG_KEY) return <>{children}</>;
      return <PHProvider client={posthog}>{children}</PHProvider>;
    }

    export function useIdentifyUser() {
      const ph = usePostHog();
      return (user: { id: string; email: string; name: string }) => {
        ph.identify(user.id, { email: user.email, name: user.name });
      };
    }
    ```

  - Wrap the root layout (`apps/web/src/app/layout.tsx`) children with `<PostHogProvider>` as the outermost provider.
  - Call `useIdentifyUser()` in the `AuthProvider` after successful `/auth/me` response.
  - Set up group analytics on org/project selection (see PostHog Implementation Plan below).
  - Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to Vercel env vars (both preview and production).
  - Add `NEXT_PUBLIC_POSTHOG_KEY` to `apps/web/.env.local.example` with a placeholder value.

- **Effort** -- S

#### 16. PostHog Server Client (Cloudflare Worker)

- **Why** -- Backend events (API key usage, SDK run logging, eval completions, migration success/failure) happen server-side and are invisible to the frontend PostHog client. Server-side analytics are essential for capturing the full product usage picture, especially for SDK interactions that never touch the web UI.
- **What to do**
  - **Compatibility note:** `posthog-node` v3+ uses `fetch` internally, which is available in Cloudflare Workers. However, it also uses `setTimeout` for flush intervals and may reference Node.js globals. Recommended approach: use the raw PostHog HTTP batch API directly for maximum Workers compatibility and zero dependencies.
  - Create `apps/api/src/lib/analytics.ts` with a Worker-compatible PostHog client:

    ```typescript
    type CaptureEvent = {
      event: string;
      distinct_id: string;
      properties?: Record<string, unknown>;
      groups?: Record<string, string>;
      timestamp?: string;
    };

    const buffer: CaptureEvent[] = [];

    export function capture(event: CaptureEvent): void {
      buffer.push({
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString()
      });
    }

    export async function flush(apiKey: string): Promise<void> {
      if (buffer.length === 0) return;
      const batch = buffer.splice(0);
      try {
        await fetch("https://us.i.posthog.com/batch/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, batch })
        });
      } catch {
        /* fire-and-forget */
      }
    }
    ```

  - Add `POSTHOG_API_KEY` to Wrangler secrets: `wrangler secret put POSTHOG_API_KEY --env production`.
  - In request handlers, call `capture(...)` for key events, then `ctx.waitUntil(flush(env.POSTHOG_API_KEY))` at the end of the request to send analytics without blocking the response.
  - Key backend events to capture: `run_logged_via_sdk`, `api_key_created`, `api_key_first_used`, `eval_run_completed`, `eval_run_failed`.

- **Effort** -- S

#### 17. PostHog SDK Opt-In Telemetry

- **Why** -- Understanding SDK usage patterns (which methods are called, error rates, retry frequency, version distribution across the user base) is essential for prioritizing SDK improvements. This must be strictly opt-in to respect developer trust and avoid any perception of spyware in the SDK.
- **What to do**
  - Add `telemetry: boolean` option to `PromptOpsClientConfig` (default `false`).
  - Add `PROMPTOPS_TELEMETRY=1` environment variable check as an alternative opt-in mechanism (checked in the constructor).
  - When enabled, capture anonymized events via a lightweight `fetch` call to `https://us.i.posthog.com/capture/`:
    - `sdk_initialized` -- on `new PromptOpsClient()`. Properties: `sdk_version`, `runtime` (node/bun/deno/edge), `node_version`, `has_batching`, `has_persistence`.
    - `sdk_log_run_success` -- on successful `logRun` response. Properties: `latency_ms`, `retry_count`.
    - `sdk_log_run_failure` -- on `logRun` returning null. Properties: `error_type` (timeout/4xx/5xx/network), `retry_count`.
    - `sdk_batch_flush` -- on batch queue flush. Properties: `batch_size`, `flush_trigger` (interval/size/manual/shutdown).
  - Use a dedicated PostHog project (separate from the main product analytics) with a hardcoded public project API key embedded in the SDK source.
  - **Privacy:** Never capture API keys, input/output data, prompt content, user IDs, or any customer data. Only capture SDK operational metrics.
  - Rate-limit telemetry to max 1 event per event type per 60 seconds to minimize overhead.
  - Add a `User-Agent` header to all SDK HTTP requests: `PromptOps-SDK/0.1.0 typescript` so the backend can track SDK version distribution without requiring telemetry opt-in.
  - Add a clear section in the SDK README: "## Telemetry" explaining exactly what is collected, that it is opt-in only, and how to enable/disable it.
- **Effort** -- S

---

### PostHog Integration Points

| Event Name                | Trigger                                                                                                    | Properties                                                                                                                  | Why Track                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `sdk_installed`           | First `logRun` call from a previously-unseen API key (backend-side, check `api_keys.last_used_at IS NULL`) | `sdk_version` (from User-Agent), `sdk_language` (ts/python), `project_id`                                                   | Track SDK adoption velocity; measure time from key creation to first use      |
| `sdk_initialized`         | `new PromptOpsClient()` constructor completes (telemetry opt-in only)                                      | `sdk_version`, `runtime` (node/bun/deno/edge), `node_version`, `has_batching`, `has_persistence`, `has_timeout_override`    | Understand SDK configuration patterns and runtime environment distribution    |
| `sdk_log_run_success`     | `logRun` receives a 201 response from the backend                                                          | `latency_ms`, `retry_count`, `has_metadata`, `has_metrics`, `has_prompt_version_id`                                         | Monitor SDK reliability; understand which optional fields users populate      |
| `sdk_log_run_failure`     | `logRun` returns null after exhausting retries                                                             | `error_type` (timeout/4xx/5xx/network), `retry_count`, `total_duration_ms`                                                  | Identify reliability problems; detect backend issues from the SDK perspective |
| `sdk_batch_flush`         | Batch queue flushed (interval, size threshold, or manual)                                                  | `batch_size`, `queue_depth_before`, `flush_trigger` (interval/size/manual/shutdown), `flush_latency_ms`                     | Tune default batch size and flush interval based on real usage patterns       |
| `api_key_created`         | `POST /api/projects/:id/api-keys` (backend)                                                                | `project_id`, `org_id`, `key_scope` (if scoping is implemented), `has_expiration`                                           | Track SDK onboarding funnel; measure how quickly new projects create keys     |
| `api_key_first_used`      | First authenticated request with an API key where `last_used_at` was NULL (backend)                        | `project_id`, `org_id`, `hours_since_creation`                                                                              | Measure activation metric: time from key creation to first SDK call           |
| `run_logged_via_sdk`      | `POST /api/runs` with source=SDK succeeds (backend)                                                        | `project_id`, `has_prompt_version_id`, `has_metrics`, `has_metadata`, `latency_ms`, `input_size_bytes`, `output_size_bytes` | Core product usage metric; understand SDK adoption depth per project          |
| `deploy_succeeded`        | `deploy.yml` health check passes after Worker deployment                                                   | `deploy_duration_s`, `migration_count`, `commit_sha`, `deployer` (github-actions)                                           | Monitor deployment health; track deployment frequency and duration trends     |
| `deploy_failed`           | `deploy.yml` health check fails or any step errors out                                                     | `failed_step` (migrate/deploy/health-check), `error_message`, `commit_sha`                                                  | Alert on deployment regressions; correlate failures with specific changes     |
| `ci_build_completed`      | `ci.yml` workflow finishes (success or failure)                                                            | `duration_s`, `status` (pass/fail), `trigger` (push/pr), `failed_step` (if failed)                                          | Track CI performance, flakiness rate, and identify slow steps                 |
| `api_latency_sampled`     | Every Nth API request, sampled at 10% rate (backend middleware)                                            | `method`, `path`, `status`, `latency_ms`, `cf_colo` (Cloudflare data center), `cf_country`                                  | Build latency percentile dashboards (p50/p95/p99); detect regional issues     |
| `free_tier_usage_checked` | Hourly cron trigger in the Worker (scheduled event)                                                        | `d1_reads_pct`, `d1_writes_pct`, `d1_storage_gb`, `r2_reads_pct`, `r2_storage_gb`, `worker_requests_pct`                    | Alert before hitting free-tier limits; plan capacity and upgrade timing       |
| `sdk_version_seen`        | Any SDK request (extracted from User-Agent header, backend middleware)                                     | `sdk_version`, `sdk_language` (ts/python), `project_id`, `is_latest` (boolean)                                              | Track SDK version adoption curve; measure upgrade velocity after releases     |

---

### PostHog Implementation Plan

#### 1. Package Installation Map

| Workspace      | Package                                | Install Command                               | Notes                                                                                                                                                                                                                                       |
| -------------- | -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`     | `posthog-js`                           | `pnpm --filter @promptops/web add posthog-js` | Frontend auto-capture, custom events, session replay, feature flags                                                                                                                                                                         |
| `apps/api`     | None (raw `fetch` to PostHog HTTP API) | N/A                                           | `posthog-node` may not be fully compatible with Cloudflare Workers runtime due to Node.js-specific APIs (`setTimeout` for flush, `os` module). Use the raw HTTP batch ingest API directly for maximum compatibility. Zero new dependencies. |
| `packages/sdk` | None                                   | N/A                                           | Telemetry uses raw `fetch` (already available in all SDK target runtimes). Zero new dependencies -- critical to keep the SDK lightweight.                                                                                                   |

**Environment Variables to Add:**

| Variable                   | Where                                   | Value                                                          |
| -------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Vercel env vars (preview + production)  | PostHog project API key (public, safe to expose)               |
| `NEXT_PUBLIC_POSTHOG_HOST` | Vercel env vars                         | `https://us.i.posthog.com` (or EU: `https://eu.i.posthog.com`) |
| `POSTHOG_API_KEY`          | Wrangler secrets (production + staging) | Same PostHog project API key (used server-side)                |

#### 2. Frontend Initialization (Provider Component)

Create `apps/web/src/components/providers/posthog-provider.tsx`:

```tsx
"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") {
          ph.debug();
        }
      }
    });
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}

/** Call in AuthProvider after successful /auth/me response */
export function useIdentifyUser() {
  const ph = usePostHog();
  return (user: { id: string; email: string; name: string }) => {
    ph.identify(user.id, {
      email: user.email,
      name: user.name
    });
  };
}

/** Call on logout to reset PostHog identity */
export function useResetPostHog() {
  const ph = usePostHog();
  return () => ph.reset();
}
```

Update `apps/web/src/app/layout.tsx` to wrap the root layout:

```tsx
import { PostHogProvider } from "@/components/providers/posthog-provider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark ..." suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <PostHogProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
```

#### 3. Backend Initialization (Worker-Compatible Setup)

Create `apps/api/src/lib/analytics.ts`:

```typescript
/**
 * Cloudflare Worker-compatible PostHog analytics client.
 *
 * Uses the raw PostHog HTTP batch ingest API instead of posthog-node
 * to avoid Node.js runtime compatibility issues in the Workers environment.
 * Events are buffered during request processing and flushed via ctx.waitUntil()
 * to avoid blocking the HTTP response.
 */

export type CaptureEvent = {
  event: string;
  distinct_id: string;
  properties?: Record<string, unknown>;
  groups?: Record<string, string>;
  timestamp?: string;
};

const buffer: CaptureEvent[] = [];

/** Queue an event for the next flush. Call during request handling. */
export function capture(event: CaptureEvent): void {
  buffer.push({
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString()
  });
}

/**
 * Flush all buffered events to PostHog.
 * Call via ctx.waitUntil(flush(env.POSTHOG_API_KEY)) at the end of
 * request processing to send without blocking the response.
 */
export async function flush(apiKey: string): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0);

  try {
    await fetch("https://us.i.posthog.com/batch/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, batch })
    });
  } catch {
    // Fire-and-forget: analytics must never break the application.
  }
}

/** Convenience: capture with org and project group context. */
export function captureWithContext(
  event: string,
  distinctId: string,
  orgId: string,
  projectId?: string,
  properties?: Record<string, unknown>
): void {
  capture({
    event,
    distinct_id: distinctId,
    properties: {
      ...properties,
      $groups: {
        org: orgId,
        ...(projectId ? { project: projectId } : {})
      }
    },
    groups: {
      org: orgId,
      ...(projectId ? { project: projectId } : {})
    }
  });
}
```

**Usage in a request handler (example for run logging):**

```typescript
import { capture, flush } from "../lib/analytics";

// Inside the POST /api/runs handler:
capture({
  event: "run_logged_via_sdk",
  distinct_id: `apikey:${apiKeyId}`,
  properties: {
    project_id: projectId,
    has_prompt_version_id: !!body.promptVersionId,
    has_metrics: !!body.metrics
  },
  groups: { org: orgId, project: projectId }
});

// At the end of the request (in the response middleware or finally block):
ctx.waitUntil(flush(env.POSTHOG_API_KEY));
```

#### 4. Group Analytics Setup (Org -> Project Hierarchy)

PostHog group analytics enables attributing events to organizations and projects, allowing per-org dashboards, per-project funnels, and cross-org comparisons.

**PostHog Dashboard Configuration (one-time setup):**

1. In PostHog Settings > Group Analytics, define two group types:
   - Type 0: `org` (display name: "Organization")
   - Type 1: `project` (display name: "Project")
2. This enables queries like: "Show all events for org X", "Compare run volume across projects in org Y", "Which orgs are most active this week".

**Frontend (on org/project context change):**

```typescript
// In org-context.tsx, when the active org changes:
posthog.group("org", orgId, {
  name: org.name,
  slug: org.slug,
  created_at: org.createdAt,
  member_count: org.memberCount
});

// In project-context.tsx, when the active project changes:
posthog.group("project", projectId, {
  name: project.name,
  slug: project.slug,
  org_id: project.orgId,
  created_at: project.createdAt
});
```

**Backend (on every authenticated request):**

```typescript
// In the auth middleware, after resolving the user and org context:
captureWithContext("api_request", userId, orgId, projectId, {
  method: request.method,
  path: routePath,
  status: response.status
});
```

**Resulting Dashboard Capabilities:**

- Per-org: total runs, active projects, member count, API key count, eval runs per week.
- Per-project: SDK runs per day, eval pass rate trend, active API keys, latency percentiles.
- Cross-org: compare engagement metrics, identify power users and at-risk orgs.

#### 5. Feature Flag Integration for Gradual Rollouts

**Frontend (using PostHog React hooks):**

```typescript
import { useFeatureFlagEnabled, useFeatureFlagPayload } from "posthog-js/react";

function EvalComparisonPage() {
  const useNewUI = useFeatureFlagEnabled("new-eval-comparison-ui");
  const uiConfig = useFeatureFlagPayload("new-eval-comparison-ui");

  if (!useNewUI) return <LegacyEvalComparison />;
  return <NewEvalComparison config={uiConfig} />;
}

// For non-hook usage (utility functions):
import posthog from "posthog-js";
const enabled = posthog.isFeatureEnabled("batch-import-v2");
```

**Backend (evaluated per-request via PostHog Decide API):**

```typescript
// Helper in apps/api/src/lib/feature-flags.ts:
type FeatureFlags = Record<string, boolean | string>;

export async function getFeatureFlags(
  apiKey: string,
  distinctId: string,
  groups?: Record<string, string>
): Promise<FeatureFlags> {
  try {
    const res = await fetch("https://us.i.posthog.com/decide/?v=3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        distinct_id: distinctId,
        groups: groups ?? {}
      })
    });
    const data = await res.json();
    return (data.featureFlags as FeatureFlags) ?? {};
  } catch {
    return {}; // Fail open: if PostHog unreachable, all flags default to off
  }
}

// Usage in a handler:
const flags = await getFeatureFlags(env.POSTHOG_API_KEY, userId, {
  org: orgId
});
if (flags["batch-run-endpoint"]) {
  // Enable the new batch endpoint logic
}
```

**Caching strategy for backend flags:** Cache the `/decide` response in a Worker global variable with a 60-second TTL keyed by `distinctId + JSON.stringify(groups)`. This avoids calling the PostHog API on every request while keeping flags reasonably fresh.

**Recommended Feature Flags for the MVP Improvement Phase:**

| Flag Name                | Type    | Rollout Strategy                      | Purpose                                                                  |
| ------------------------ | ------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `batch-run-endpoint`     | Boolean | 0% -> 10% -> 50% -> 100% by org group | Gate the new `POST /api/runs/batch` endpoint until validated at scale    |
| `new-eval-comparison-ui` | Boolean | Internal team first, then 50% -> 100% | Gradually roll out redesigned eval comparison UI                         |
| `deep-health-check`      | Boolean | 100% from start (kill switch)         | Enable `/api/health/deep` with D1/R2 checks; disable if it causes issues |
| `sdk-offline-queue`      | Boolean | 10% -> 50% -> 100%                    | Gradually enable offline queue in the SDK for opted-in telemetry users   |
| `preview-environments`   | Boolean | Per-user allowlist                    | Enable per-PR preview deployments only for select contributors           |
| `python-sdk-beta`        | Boolean | Per-org allowlist                     | Gate Python SDK docs and download links for beta testers                 |

**SDK-Side Feature Flags (evaluated at initialization):**
When SDK telemetry is opted in, the SDK can optionally call the PostHog `/decide` endpoint during `new PromptOpsClient()` initialization to check for remotely-toggled SDK behavior flags. This enables the team to disable buggy SDK features (e.g., batch mode, offline queue) without requiring users to upgrade their SDK version. The flag response should be cached for the lifetime of the client instance to avoid per-request overhead. Implementation: a single `fetch` call during construction, with a 2-second timeout and a fail-open policy (if unreachable, all flags default to their local config values).

---

## Summary & Priority Matrix

### Total Improvements by Domain

| Domain           | Improvements | PostHog Events | Key Theme                                                   |
| ---------------- | ------------ | -------------- | ----------------------------------------------------------- |
| Frontend         | 18           | 15             | UX polish, error handling, accessibility, onboarding        |
| Backend API      | 20           | 15             | Missing endpoints, pagination, search, webhooks, OpenAPI    |
| Authentication   | 9            | 13             | Invite system, token refresh, Google OAuth, API key scoping |
| Database         | 12           | 10             | Encryption, cursor pagination, soft deletes, FTS5, archival |
| Eval Engine      | 20           | 15             | New checks, providers, judge improvements, cost tracking    |
| SDK & Deployment | 17           | 14             | Python SDK, NPM publish, staging, PostHog implementation    |
| **Total**        | **96**       | **82**         |                                                             |

### Sprint Priority Recommendations

#### Sprint 1 — Foundation (Week 1-2)

_Focus: Ship what blocks team adoption and analytics_

| #   | Improvement                             | Domain   | Effort | Why First                         |
| --- | --------------------------------------- | -------- | ------ | --------------------------------- |
| 1   | PostHog Provider + Server Client        | SDK      | S+S    | Unlocks all analytics tracking    |
| 2   | Invite System (email-based org invites) | Auth     | M      | Biggest blocker for team adoption |
| 3   | NPM Publishing Workflow                 | SDK      | S      | SDK not installable without this  |
| 4   | Global Error Boundary                   | Frontend | M      | Users see white screens on errors |
| 5   | Provider Key Encryption                 | Database | M      | Security-critical gap             |
| 6   | Prompt Update/Delete endpoints          | Backend  | S      | Basic CRUD incomplete             |

#### Sprint 2 — Polish (Week 3-4)

_Focus: UX quality and eval engine depth_

| #   | Improvement                            | Domain   | Effort | Why Next                     |
| --- | -------------------------------------- | -------- | ------ | ---------------------------- |
| 7   | Skeleton Loading Consistency           | Frontend | S      | Perceived performance        |
| 8   | Cursor-Based Pagination                | Database | M      | Performance at scale         |
| 9   | Token Refresh + Session Revocation     | Auth     | L+M    | Security posture             |
| 10  | New Check Types (contains, similarity) | Eval     | M      | Most-requested eval features |
| 11  | Search & Filtering                     | Backend  | M      | Usability at scale           |
| 12  | Cost Tracking per Eval Run             | Eval     | M      | Users need spend visibility  |

#### Sprint 3 — Scale (Week 5-6)

_Focus: Production readiness and developer experience_

| #   | Improvement                | Domain   | Effort | Why Then                   |
| --- | -------------------------- | -------- | ------ | -------------------------- |
| 13  | Staging Environment        | SDK      | M      | Safe deployment pipeline   |
| 14  | Google OAuth               | Auth     | M      | Expand user base           |
| 15  | Eval Comparison Views      | Eval     | L      | Core differentiator        |
| 16  | Batch Logging (SDK)        | SDK      | M      | Production SDK performance |
| 17  | Soft Deletes               | Database | M      | Data safety                |
| 18  | Keyboard Shortcuts + Cmd+K | Frontend | L      | Power user retention       |

#### Sprint 4 — Growth (Week 7-8)

_Focus: Platform expansion and self-service_

| #   | Improvement                    | Domain   | Effort | Why Then                    |
| --- | ------------------------------ | -------- | ------ | --------------------------- |
| 19  | Python SDK                     | SDK      | L      | Reach Python AI teams       |
| 20  | New Providers (Gemini, Ollama) | Eval     | M      | Broader LLM coverage        |
| 21  | OpenAPI/Swagger Docs           | Backend  | M      | Developer self-service      |
| 22  | Eval Templates                 | Eval     | M      | Lower barrier to first eval |
| 23  | Full-Text Search (FTS5)        | Database | M      | Scale UX                    |
| 24  | Onboarding Tour                | Frontend | L      | Activation rate             |

### PostHog Event Priority

**Implement immediately (Sprint 1):**

- `user_signed_up`, `user_logged_in`, `org_created`, `project_created`
- `eval_run_started`, `eval_run_completed`, `eval_run_failed`
- `prompt_created`, `prompt_version_created`
- `page_viewed` (auto-capture)

**Implement in Sprint 2:**

- `dataset_created`, `dataset_items_imported`
- `api_key_created`, `sdk_run_logged`
- `invite_sent`, `invite_accepted`
- All funnel events (signup → first eval completion)

**Implement in Sprint 3-4:**

- Feature usage events, performance metrics, error tracking
- Group analytics (org → project hierarchy)
- Feature flag integration
