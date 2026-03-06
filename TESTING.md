# Testing Strategy

## Command Surface

- `pnpm test` runs Vitest across the workspace.
- `pnpm --filter <workspace> test` runs tests for a single workspace using the shared root config.

## Current Baseline

The repository currently keeps a smoke-test layer in place while feature domains are still being scaffolded:

- `apps/api` - health endpoint response and local CORS contract
- `packages/shared` - shared contract stability
- `packages/sdk` - SDK client constructor/default configuration behavior

## Immediate Unit-Test Targets

Add unit tests as soon as the underlying modules exist:

- `packages/shared` eval utilities: template rendering, checks, guardrails, verdict logic
- `apps/api` auth helpers and query helpers
- `packages/sdk` retry, timeout, and fire-and-forget behavior

## Integration Coverage Required Before Release

The following API flows require integration coverage before MVP release:

- Auth redirect, callback, `/me`, and logout
- Org/project RBAC enforcement
- Prompt, dataset, and eval CRUD routes
- Eval run create/item/complete lifecycle
- SDK run logging and API key auth
- Demo seed endpoint

## Review Expectation

New behavior should ship with the smallest useful test that protects it. When implementation is still scaffold-only, add or update smoke coverage so the CI pipeline still exercises the path.
