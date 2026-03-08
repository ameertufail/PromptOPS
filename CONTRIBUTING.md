# Contributing

## Workflow

- Create one task branch per implementation unit using `task/<phase>-<task>-<slug>`.
- Keep scope aligned to the active task in `IMPLEMENTATION_MULTIPHASE_PLAN.md`.
- Merge by squash after review so one task maps to one reviewable changeset.

## Local Setup

1. Run `pnpm install:deps`.
2. Confirm `apps/web/.env.local` and `apps/api/.dev.vars` exist.
3. Start the stack with `pnpm dev`, or run the web and API workspaces independently.

## Required Validation Before Review

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

If a command is not applicable, explain why in the handoff.

## Documentation Writeback Rules

Every completed task must update:

1. `IMPLEMENTATION_MULTIPHASE_PLAN.md`
2. `DOCS/PROJECT_OVERVIEW.md`
3. Every `Read Context` file listed for that task

Use the `Completion Summary` format from the plan and prepend a one-line entry to each touched file's `## Completion Notes` section.

## Boundaries

- `apps/web` and `apps/api` may only share contracts through `@promptops/shared`.
- `packages/shared` must not import from app workspaces.
- Shared contract changes must increment `SHARED_CONTRACT_VERSION` and update the shared contract catalog snapshot test.
- Avoid deep imports into `packages/*/src/*` from other workspaces.
- Preserve the browser-first BYOK model and Phase 1 security guardrails.

## CI And Merge Policy

- GitHub Actions workflow `CI` with job `validate` is the required baseline check.
- Branch protection in GitHub should require `CI / validate` before merge.
- Do not merge if lint, formatting, typecheck, tests, or documentation writebacks are failing.
