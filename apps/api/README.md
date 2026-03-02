# `apps/api`

Backend API workspace (Cloudflare Workers + Hono).

## Ownership

- API route registration, middleware, auth, RBAC, and persistence workflows.

## Allowed Imports

- External packages.
- `@promptops/shared` public exports.
- Local files under `apps/api/src`.

## Disallowed Imports

- Any direct import from `apps/web`.
- Any deep import from `packages/shared/src/*`.
