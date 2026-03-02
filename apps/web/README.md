# `apps/web`

Frontend application workspace (Next.js App Router).

## Ownership

- All UI routes, components, client-side state, and dashboard behavior.

## Allowed Imports

- External packages.
- `@promptops/shared` public exports.
- Local files under `apps/web/src`.

## Disallowed Imports

- Any direct import from `apps/api`.
- Any deep import from `packages/shared/src/*`.
