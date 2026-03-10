# PromptOps Studio - Detailed Multiphase Implementation Plan

This is the execution document for building PromptOps Studio from scratch to launch using the browser-first eval model.

How to use this document:

1. Work phase-by-phase in order unless a task is explicitly parallelizable.
2. Before starting each task, read every file listed in `Read Context`.
3. Mark tasks complete with `[x]` and keep this file updated as the source of execution truth.

## Completion Writeback Rules (Mandatory)

1. In this file, change the task checkbox from `[ ]` to `[x]`.
2. Replace that task's `Completion Summary: Pending.` with exactly one line in this format:
   `Completion Summary: YYYY-MM-DD - one-line summary of what was done.`
3. In each file listed under `Read Context`, add a one-line entry under `## Completion Notes` using:
   `- YYYY-MM-DD - Task X.Y - one-line summary`
4. Update relevant checklist items to `[x]` in the touched context files and `DOCS/PROJECT_OVERVIEW.md`.
5. Keep newest completion note at the top so a new chat immediately sees latest progress.

## Phase 1 - Scope, Decisions, and Execution Rules

1. [x] Task 1.1: Lock the execution model and success criteria.  
        Read Context: [PROJECT_OVERVIEW.md](DOCS/PROJECT_OVERVIEW.md), [main.md](DOCS/main.md), [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md)  
        Instruction: Confirm browser-orchestrated evals are the primary model, define clear MVP 0/1/2 acceptance criteria, and document non-goals so the team can reject scope creep quickly.
       Completion Summary: 2026-03-02 - Locked browser-orchestrated evals as primary, defined MVP 0/1/2 acceptance gates, and documented non-goals to prevent scope creep.
2. [x] Task 1.2: Freeze architecture guardrails and security principles.
       Read Context: [PROJECT_OVERVIEW.md](DOCS/PROJECT_OVERVIEW.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md)  
        Instruction: Finalize rules for BYOK, key storage, JWT/cookie usage, RBAC enforcement, and production secret handling so all implementation work follows one security baseline.
       Completion Summary: 2026-03-02 - Frozen a single security baseline for BYOK boundaries, key storage, JWT/cookie sessions, RBAC deny-by-default enforcement, and production secret handling.
3. [x] Task 1.3: Define delivery governance and handoff protocol.  
        Read Context: [PROJECT_OVERVIEW.md](DOCS/PROJECT_OVERVIEW.md), [CONTEXT/README.md](DOCS/CONTEXT/README.md), [main.md](DOCS/main.md)  
        Instruction: Set branch strategy, review checklist, definition of done, and documentation update rules so every merged task also updates the relevant context trackers.
       Completion Summary: 2026-03-02 - Defined branch and PR governance, formalized definition of done, and locked mandatory context/documentation writeback rules for every merge.

## Phase 2 - Monorepo and Workspace Scaffolding

1. [x] Task 2.1: Initialize the monorepo structure and package boundaries.  
        Read Context: [PROJECT_OVERVIEW.md](DOCS/PROJECT_OVERVIEW.md), [main.md](DOCS/main.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Create `apps/web`, `apps/api`, `packages/shared`, and `packages/sdk` with clear ownership and avoid cross-imports that bypass shared contracts.
       Completion Summary: 2026-03-02 - Scaffolded apps/packages workspace boundaries with shared-contract imports, starter app/package entrypoints, and monorepo ownership docs.
2. [x] Task 2.2: Configure workspace package management and root scripts.  
        Read Context: [main.md](DOCS/main.md), [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md)  
        Instruction: Standardize install, dev, build, lint, typecheck, and test commands at root so every developer and CI job uses the same execution path.
       Completion Summary: 2026-03-02 - Added root workspace install/dev/build/lint/typecheck/test scripts, aligned package-level script coverage, and updated deployment/CI command references to the shared root path.
3. [x] Task 2.3: Add baseline repository documentation for contributors.  
        Read Context: [main.md](DOCS/main.md), [CONTEXT/README.md](DOCS/CONTEXT/README.md)  
        Instruction: Add a concise contribution guide, folder map, and setup summary so new contributors can start without reverse-engineering project intent.
       Completion Summary: 2026-03-06 - Added root onboarding docs with quick start, folder map, contribution workflow, and links to testing/local development guidance.

## Phase 3 - Tooling, Quality Gates, and CI Baseline

1. [x] Task 3.1: Establish linting, formatting, and type-safety standards across all packages.  
        Read Context: [main.md](DOCS/main.md), [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md)  
        Instruction: Define one consistent standards profile and fail builds on violations to prevent style and type drift from day one.
       Completion Summary: 2026-03-06 - Added shared ESLint and Prettier config, wired workspace lint/typecheck scripts, and enforced the standards through root validation commands.
2. [x] Task 3.2: Set up test strategy skeleton for unit and integration layers.  
        Read Context: [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Decide which modules require unit tests immediately (shared eval utilities, auth, query helpers) and which endpoints require integration coverage before release.
       Completion Summary: 2026-03-06 - Added a Vitest smoke-test baseline for shared, SDK, and API surfaces and documented the immediate unit/integration coverage roadmap.
3. [x] Task 3.3: Implement CI workflow and required checks policy.  
        Read Context: [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md), [main.md](DOCS/main.md)  
        Instruction: Configure automated pipeline for lint, typecheck, and tests, then enforce branch protection so code cannot merge without passing gates.
       Completion Summary: 2026-03-06 - Added the GitHub Actions validation workflow and documented `CI / validate` as the required branch-protection check.

## Phase 4 - Local Development and Environment Contracts

1. [x] Task 4.1: Define local environment variable contracts for frontend and backend.  
        Read Context: [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md)  
        Instruction: Create documented local env templates with descriptions, required/optional markers, and default local URLs for predictable startup.
       Completion Summary: 2026-03-02 - Added env templates and seeded local env files for web/api, plus .gitignore rules to keep secret files out of git.
2. [x] Task 4.2: Validate local runtime startup for both apps and shared dependencies.  
        Read Context: [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md)  
        Instruction: Ensure backend and frontend can run independently and together, and confirm expected ports, CORS behavior, and health endpoint responses.
       Completion Summary: 2026-03-06 - Validated local web/api startup on ports 3000 and 8787, confirmed the health payload, and locked the local CORS behavior around the trusted frontend origin.
3. [x] Task 4.3: Document local troubleshooting and common failure recovery.  
        Read Context: [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md), [main.md](DOCS/main.md)  
        Instruction: Capture high-frequency setup failures (auth callback mismatch, missing secrets, D1 migration mismatch) and exact recovery steps.
       Completion Summary: 2026-03-06 - Added a local development guide with startup instructions plus recovery steps for dependency, OAuth, secret, migration, and CORS issues.

## Phase 5 - Cloud Provisioning and Infrastructure Bootstrap

1. [x] Task 5.1: Provision Cloudflare resources and map bindings.  
        Read Context: [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Create Worker app, D1 database, and R2 bucket, then bind resources in Wrangler configuration with non-placeholder production IDs.
       Completion Summary: 2026-03-06 - Provisioned the Cloudflare Worker resources, created the production D1/R2 bindings, and wrote the real production IDs into Wrangler config.
2. [x] Task 5.2: Configure production secrets and OAuth provider setup.  
        Read Context: [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md)  
        Instruction: Register separate GitHub OAuth apps for local and production, point both at the backend callback route, and store JWT/encryption/client secrets only in secure platform secret stores.
       Completion Summary: 2026-03-06 - Registered local and production GitHub OAuth apps and stored the production GitHub/JWT/encryption secrets in Cloudflare's secret store.
3. [x] Task 5.3: Provision Vercel project and environment mapping.  
        Read Context: [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md)  
        Instruction: Connect repo, configure build settings and public env vars, and verify preview/production deployment channels are correctly separated.
       Completion Summary: 2026-03-06 - Connected the repo to Vercel, mapped the deployed Worker/app URLs into public env vars, and documented the preview/production deployment setup.

## Phase 6 - Database Foundation (Core Tenancy)

1. [x] Task 6.1: Implement migration set for users, orgs, org_members, and projects.  
        Read Context: [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [main.md](DOCS/main.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md)  
        Instruction: Build core tenancy schema with ULID keys, slug uniqueness, role constraints, and foreign key relationships required by RBAC.
       Completion Summary: 2026-03-07 - Added the core tenancy D1 migration with ULID-backed tables, ISO-8601 timestamps, RBAC role constraints, and `_migrations` bookkeeping.
2. [x] Task 6.2: Validate migration idempotency and rollback safety locally.  
        Read Context: [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md)  
        Instruction: Reapply migrations on clean local databases multiple times to verify deterministic outcomes and prevent production migration surprises.
       Completion Summary: 2026-03-07 - Added a repeatable local D1 replay validator and verified deterministic migration runs on clean and already-migrated state.
3. [x] Task 6.3: Implement typed query helpers for tenancy reads/writes.  
        Read Context: [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Add query functions for user upsert, org membership resolution, and project lookup with strict parameter typing and transaction safety.
       Completion Summary: 2026-03-07 - Added typed tenancy query helpers plus unit coverage for user upsert, org membership resolution, org/project creation, and project access lookup.

## Phase 7 - Database Domain Model Completion

1. [x] Task 7.1: Implement migrations for prompts, versions, datasets, eval entities, runs, keys, and audit events.
        Read Context: [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [main.md](DOCS/main.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Complete the full schema exactly aligned with domain entities and JSON fields defined in the product spec.
       Completion Summary: 2026-03-08 - Added migrations 002-006 to complete the prompt, dataset, eval, run logging, key, and audit domain tables with ISO timestamps, FKs, and status constraints.
2. [x] Task 7.2: Add all required indexes and query-path optimizations.
       Read Context: [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [CONTEXT_SDK.md](DOCS/CONTEXT/CONTEXT_SDK.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)
        Instruction: Implement indexes listed in context docs, then verify critical list and stats endpoints use indexed filters and pagination paths.
       Completion Summary: 2026-03-08 - Added migration 007 plus composite hot-path indexes and validated representative dataset, eval item, runs, API key, and audit query plans locally.
3. [x] Task 7.3: Validate production migration workflow and tracking table behavior.
        Read Context: [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md)  
        Instruction: Confirm local-to-remote migration promotion process and `_migrations` bookkeeping before applying schema to production D1.
       Completion Summary: 2026-03-08 - Added full-chain D1 apply/validation scripts and confirmed replay-safe `_migrations` tracking plus the documented remote promotion workflow.

## Phase 8 - Shared Contracts and Validation Layer

1. [x] Task 8.1: Define shared entity types, enums, and constants package-wide.  
        Read Context: [PROJECT_OVERVIEW.md](DOCS/PROJECT_OVERVIEW.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md)  
        Instruction: Create one canonical type source for statuses, verdicts, roles, and DTOs so frontend and backend cannot diverge.
       Completion Summary: 2026-03-08 - Added the canonical shared constants, enums, entity DTOs, and cross-workspace contract exports in `@promptops/shared`.
2. [x] Task 8.2: Define input/output validation schemas for all API boundaries.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md)  
        Instruction: Map every endpoint payload and response into validated contracts and reject invalid request shapes uniformly.
       Completion Summary: 2026-03-08 - Added Zod request/response schemas plus a route contract catalog for the planned API boundaries in `@promptops/shared`.
3. [x] Task 8.3: Establish contract-change policy and compatibility checks.  
        Read Context: [CONTEXT/README.md](DOCS/CONTEXT/README.md), [main.md](DOCS/main.md)  
        Instruction: Require explicit version-aware updates whenever shared contracts change and tie this rule to PR review checklist.
       Completion Summary: 2026-03-08 - Added shared contract versioning rules, a compatibility snapshot test, and PR-review guidance for contract changes.

## Phase 9 - Backend App Skeleton and Middleware Pipeline

1. [x] Task 9.1: Build backend entrypoint, route registration, and CORS/security defaults.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md)  
        Instruction: Implement the baseline API shell with trusted origins, JSON response consistency, and health endpoint for deployment validation.
       Completion Summary: 2026-03-08 - Refactored the API into an app factory with route registration, trusted-origin CORS, security headers, request IDs, and deployment-safe health/not-found handling.
2. [x] Task 9.2: Implement standardized error classes and global error formatter.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [main.md](DOCS/main.md)  
        Instruction: Normalize all backend failures into one error response shape and ensure validation/auth/domain failures remain distinguishable.
       Completion Summary: 2026-03-08 - Added shared backend error classes, validation helpers, and global error/not-found formatters that emit the canonical `{ error, message, details }` envelope.
3. [x] Task 9.3: Implement reusable middleware scaffolding for auth, RBAC, audit, and rate limiting.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_SDK.md](DOCS/CONTEXT/CONTEXT_SDK.md)  
        Instruction: Define middleware ordering and request context contracts so all route handlers receive resolved identity, role, and project metadata.
       Completion Summary: 2026-03-08 - Added request-context, auth guard, RBAC resolution, audit queue flush, and API-key rate-limit middleware scaffolding with focused API tests.

## Phase 10 - Authentication Backend (OAuth, JWT, Session)

1. [x] Task 10.1: Implement GitHub OAuth redirect and callback flow end-to-end.  
        Read Context: [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md)  
        Instruction: Handle state validation, token exchange, user profile fetch, and user upsert with explicit failure paths for bad code/state conditions.
       Completion Summary: 2026-03-08 - Implemented GitHub authorize/callback routes with CSRF state cookies, provider token exchange, profile/email fetch, user upsert, and frontend redirect outcomes.
2. [x] Task 10.2: Implement JWT issuance and session cookie controls.  
        Read Context: [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Issue HttpOnly session cookies with secure attributes, fixed expiry, and route-level authentication checks for dashboard endpoints.
       Completion Summary: 2026-03-08 - Added signed 7-day HS256 session tokens, secure HttpOnly cookie helpers, and JWT-backed request resolution for dashboard-authenticated routes.
3. [x] Task 10.3: Implement auth utility endpoints and logout invalidation.  
        Read Context: [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Provide `/me` and logout endpoints with consistent session invalidation behavior and clear unauthorized response semantics.
       Completion Summary: 2026-03-08 - Added `/api/auth/me` and `/api/auth/logout` with shared contract responses, 401 semantics for missing sessions, and idempotent cookie clearing on logout.

## Phase 11 - Multi-Tenancy, RBAC, and Org/Project Management

1. [x] Task 11.1: Implement org CRUD and membership management endpoints.
        Read Context: [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Enforce role-gated membership changes and guarantee all org mutations produce audit records.
       Completion Summary: 2026-03-09 - Added org create/list/detail/member-management and audit log endpoints with owner safeguards and audit writes for every org mutation.
2. [x] Task 11.2: Implement project CRUD with strict org-scoped access control.
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Ensure project operations are only allowed within caller organization and support role checks for create/update/delete actions.
       Completion Summary: 2026-03-09 - Added org-scoped project create/list/detail/update/delete routes with role checks, slug conflict handling, and mutation audit records.
3. [x] Task 11.3: Implement RBAC resolver and audit event logging integration.
        Read Context: [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Centralize role resolution by project to avoid duplicated access logic and record actor/action/entity metadata for sensitive operations.
       Completion Summary: 2026-03-09 - Tightened RBAC resolution around org/project role checks, added owner-management guardrails, and persisted structured audit metadata for tenancy mutations.

## Phase 12 - Frontend Shell, Auth UI, and Protected Navigation

1. [ ] Task 12.0: Initialize shadcn/ui foundation and theme contract.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md), [PROJECT_OVERVIEW.md](DOCS/PROJECT_OVERVIEW.md)  
        Instruction: Install shadcn/ui in `apps/web`, add the baseline component set required by auth/dashboard flows, and enforce one theme-token contract where user-specified color schemes override defaults and are applied consistently across all UI pages/components. If a user-provided tweakcn theme is supplied, treat it as canonical from that point forward and do not change it unless explicitly requested; use shadcn components first and user-approved React component libraries second.  
        Completion Summary: Pending.
1. [ ] Task 12.1: Build root, auth, and dashboard layouts with provider hierarchy.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md)  
        Instruction: Implement shared app shell with protected dashboard layout, responsive sidebar behavior, and top-level providers for auth/org/project state.
       Completion Summary: Pending.
1. [ ] Task 12.2: Build login and callback pages with reliable session initialization.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md)  
        Instruction: Implement OAuth entry and callback handling UX with user-friendly error and retry states when auth fails.
       Completion Summary: Pending.
1. [ ] Task 12.3: Implement API client and protected route behavior.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Build a shared fetch client that includes credentials, handles 401 redirects to login, and surfaces 403 authorization errors cleanly.
       Completion Summary: Pending.

## Phase 13 - Prompt Backend Domain

1. [ ] Task 13.1: Implement prompt CRUD endpoints with project scoping and validation.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [main.md](DOCS/main.md)  
        Instruction: Support create/list/detail/update/delete behavior as defined by route contracts and enforce permissions per role matrix.
       Completion Summary: Pending.
2. [ ] Task 13.2: Implement immutable prompt version creation and version numbering.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [main.md](DOCS/main.md)  
        Instruction: Ensure each new version captures full prompt content and model config snapshot and cannot be mutated after creation.
       Completion Summary: Pending.
3. [ ] Task 13.3: Implement release/archive and diff endpoints with audit logs.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [main.md](DOCS/main.md)  
        Instruction: Enforce release permissions, archive behavior, and line-level diff output while recording all state transitions in audit events.
       Completion Summary: Pending.

## Phase 14 - Prompt Frontend Domain

1. [ ] Task 14.1: Build prompt list and prompt detail views with version timeline.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Implement list/detail UX with clear status badges, pagination where needed, and robust empty/loading/error states.
       Completion Summary: Pending.
2. [ ] Task 14.2: Build template editor, variables schema editor, and model config forms.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [main.md](DOCS/main.md)  
        Instruction: Provide editing workflows that align to backend validation and clearly communicate missing variables or invalid model settings.
       Completion Summary: Pending.
3. [ ] Task 14.3: Build diff viewer and release/archive actions in UI.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Render side-by-side version comparison with action controls gated by role and clear confirmation flows for state-changing actions.
       Completion Summary: Pending.

## Phase 15 - Dataset Backend Domain

1. [ ] Task 15.1: Implement dataset CRUD endpoints and item count bookkeeping.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [main.md](DOCS/main.md)  
        Instruction: Ensure dataset operations maintain consistent metadata and enforce project-level access checks.
       Completion Summary: Pending.
2. [ ] Task 15.2: Implement dataset item CRUD with validation and ordering.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Support item input, expected output, rubric, tags, and sort order updates with strict schema checks.
       Completion Summary: Pending.
3. [ ] Task 15.3: Implement JSONL bulk import with batch operations and error reporting.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md), [main.md](DOCS/main.md)  
        Instruction: Parse line-by-line, validate each item, insert in batches, and return imported/failed totals plus actionable failure details.
       Completion Summary: Pending.

## Phase 16 - Dataset Frontend Domain

1. [ ] Task 16.1: Build dataset list and detail table screens.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Implement searchable/paginated data tables with clear row previews and empty-state guidance for first dataset creation.
       Completion Summary: Pending.
2. [ ] Task 16.2: Build item add/edit panel with validation UX.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Provide structured form handling for input/expected_output/rubric/tags and preserve order semantics during edits.
       Completion Summary: Pending.
3. [ ] Task 16.3: Build JSONL upload flow and import feedback UI.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [main.md](DOCS/main.md)  
        Instruction: Implement upload entry, progress indicator, and post-import summary with line-level error display for invalid records.
       Completion Summary: Pending.

## Phase 17 - Eval Config Backend

1. [ ] Task 17.1: Implement eval config CRUD endpoints.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Support create/list/detail/update behavior with project scoping and rules payload validation.
       Completion Summary: Pending.
2. [ ] Task 17.2: Enforce rules schema and defaults for checks, guardrails, judge, and thresholds.  
        Read Context: [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [main.md](DOCS/main.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Reject invalid combinations, fill default rule values, and preserve future extensibility without breaking existing configs.
       Completion Summary: Pending.
3. [ ] Task 17.3: Add audit coverage and compatibility checks for config updates.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md)  
        Instruction: Track creation/modification events and ensure edits do not invalidate existing eval run history.
       Completion Summary: Pending.

## Phase 18 - Eval Config Frontend

1. [ ] Task 18.1: Build config list page and config detail editing flow.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Implement discoverable listing and update flows with robust form state handling and backend validation feedback.
       Completion Summary: Pending.
2. [ ] Task 18.2: Build 5-step config wizard (dataset, checks, guardrails, judge, thresholds).  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [main.md](DOCS/main.md)  
        Instruction: Create step-by-step UX with progress indicators, back/next navigation, and summary validation before final save.
       Completion Summary: Pending.
3. [ ] Task 18.3: Add judge and threshold explainability in the UI.  
        Read Context: [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md)  
        Instruction: Provide human-readable helper text so users understand what each rule affects and avoid configuration mistakes.
       Completion Summary: Pending.

## Phase 19 - Shared Eval Utilities (Renderer, Checks, Guardrails)

1. [ ] Task 19.1: Implement template rendering and variable extraction utilities.  
        Read Context: [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [main.md](DOCS/main.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md)  
        Instruction: Support variable replacement, missing-variable error behavior, and extraction logic used by editor validation and runner execution.
       Completion Summary: Pending.
2. [ ] Task 19.2: Implement deterministic checks and the combined checks runner.  
        Read Context: [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [main.md](DOCS/main.md)  
        Instruction: Build JSON validity/schema/regex/exact-match checks with normalized result format and aggregated pass/fail summary.
       Completion Summary: Pending.
3. [ ] Task 19.3: Implement guardrails and verdict calculation with tests.  
        Read Context: [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [main.md](DOCS/main.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md)  
        Instruction: Implement PII detection, injection heuristics, and verdict priority logic, then validate all utility behavior with targeted unit tests.
       Completion Summary: Pending.

## Phase 20 - Browser Eval Engine and Run Lifecycle Backend

1. [ ] Task 20.1: Build browser-side LLM client abstraction and provider adapters.  
        Read Context: [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md)  
        Instruction: Implement provider-agnostic generation interface, BYOK key use, and provider-specific request/response normalization behavior.
       Completion Summary: Pending.
2. [ ] Task 20.2: Build browser orchestrator for concurrent item processing with retries and resume.  
        Read Context: [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [main.md](DOCS/main.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md)  
        Instruction: Process dataset items in controlled concurrency, apply checks/guardrails/judge per item, and persist progress for interruption recovery.
       Completion Summary: Pending.
3. [ ] Task 20.3: Implement eval run create/store/complete backend endpoints with idempotency.  
        Read Context: [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Create run record endpoint, idempotent item result ingestion endpoint, and completion endpoint that computes and stores summary aggregates.
       Completion Summary: Pending.

## Phase 21 - Eval Report UX, API Keys, SDK Logging, and Observability

1. [ ] Task 21.1: Build eval run execution and report interfaces.  
        Read Context: [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md), [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md)  
        Instruction: Implement run progress UI, summary cards, filterable/sortable results table, side-by-side output inspection, and export actions.
       Completion Summary: Pending.
2. [ ] Task 21.2: Implement API key lifecycle and SDK-auth run logging endpoints.  
        Read Context: [CONTEXT_SDK.md](DOCS/CONTEXT/CONTEXT_SDK.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md), [CONTEXT_DATABASE.md](DOCS/CONTEXT/CONTEXT_DATABASE.md)  
        Instruction: Support key create/list/revoke, hash-based authentication for `/runs`, key last-used updates, and per-key rate limiting.
       Completion Summary: Pending.
3. [ ] Task 21.3: Build SDK package and runs analytics APIs/UI.  
        Read Context: [CONTEXT_SDK.md](DOCS/CONTEXT/CONTEXT_SDK.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Deliver SDK client behavior and dashboard/run-explorer surfaces with latency, volume, and guardrail trend visibility.
       Completion Summary: Pending.

## Phase 22 - Deployment, QA, Onboarding, and Launch Readiness

1. [ ] Task 22.1: Complete production deployment and environment hardening.  
        Read Context: [CONTEXT_DEPLOYMENT.md](DOCS/CONTEXT/CONTEXT_DEPLOYMENT.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_BACKEND.md](DOCS/CONTEXT/CONTEXT_BACKEND.md)  
        Instruction: Deploy frontend/backend, apply production migrations, validate OAuth callback domains, and enforce production-safe secret and CORS settings.
       Completion Summary: Pending.
2. [ ] Task 22.2: Execute full end-to-end QA and role-based validation matrix.  
        Read Context: [main.md](DOCS/main.md), [CONTEXT_AUTH.md](DOCS/CONTEXT/CONTEXT_AUTH.md), [CONTEXT_FRONTEND.md](DOCS/CONTEXT/CONTEXT_FRONTEND.md), [CONTEXT_EVAL_ENGINE.md](DOCS/CONTEXT/CONTEXT_EVAL_ENGINE.md)  
        Instruction: Validate all core flows (auth, org/project, prompt lifecycle, datasets, eval execution/reporting, SDK logging) including RBAC edge cases and regression checks.
       Completion Summary: Pending.
3. [ ] Task 22.3: Finalize onboarding assets and open-source launch package.  
        Read Context: [main.md](DOCS/main.md), [PROJECT_OVERVIEW.md](DOCS/PROJECT_OVERVIEW.md), [CONTEXT_UI_DESIGN.md](DOCS/CONTEXT/CONTEXT_UI_DESIGN.md), [CONTEXT_SDK.md](DOCS/CONTEXT/CONTEXT_SDK.md)  
        Instruction: Complete demo seed flow, onboarding checklist, landing page polish, README/contributing/license docs, and launch checklist for public release.
       Completion Summary: Pending.
