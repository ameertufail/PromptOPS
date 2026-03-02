# `packages/sdk`

PromptOps SDK package workspace.

## Ownership

- External client interface for run logging and integration helpers.
- Runtime-safe client behavior (timeouts, retries, fire-and-forget patterns) in later tasks.

## Allowed Imports

- External packages.
- `@promptops/shared` public exports.
- Local files under `packages/sdk/src`.

## Disallowed Imports

- Any direct import from `apps/web` or `apps/api`.
- Any deep import from `packages/shared/src/*`.
