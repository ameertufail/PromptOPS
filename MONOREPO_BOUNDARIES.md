# Monorepo Boundaries

This document defines workspace ownership and import boundaries for PromptOps Studio.

## Ownership

- `apps/web`: Next.js frontend UI and client-side orchestration.
- `apps/api`: Cloudflare Worker API, auth, and persistence endpoints.
- `packages/shared`: Canonical cross-workspace contracts (types, constants, schemas, helpers).
- `packages/sdk`: External SDK client package and examples.

## Import Rules

- `apps/web` may import from `@promptops/shared`.
- `apps/api` may import from `@promptops/shared`.
- `packages/sdk` may import from `@promptops/shared`.
- `packages/shared` must not import from `apps/*` or other workspace packages.
- Workspace code must not import from `apps/web` or `apps/api` using relative paths.
- Use package entrypoints only; do not deep-import into `packages/*/src/*` from other workspaces.

## Why

`packages/shared` is the single contract boundary between runtime surfaces. Keeping all cross-surface contracts there prevents frontend/backend drift and avoids hidden coupling.
