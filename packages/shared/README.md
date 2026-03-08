# `packages/shared`

Canonical cross-workspace contract package.

## Ownership

- Shared types, constants, and validation contracts.
- Any type that must stay synchronized between frontend/backend/SDK.

## Rules

- Keep exports stable and consume through `@promptops/shared`.
- Do not import from `apps/*` or `packages/sdk`.
- Do not expose app-specific runtime logic from this package.
- Contract changes must increment `SHARED_CONTRACT_VERSION` and update the shared contract catalog snapshot test.
