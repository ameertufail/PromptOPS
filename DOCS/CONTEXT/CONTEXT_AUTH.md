# CONTEXT: Authentication & Authorization

> Attach with: PROJECT_OVERVIEW.md

---

## How Auth Works

Two methods:

1. **JWT (cookie):** Dashboard users. GitHub OAuth → backend issues JWT → HttpOnly cookie `po_session`. 7-day expiry.
2. **API Key (header):** SDK only. Format `po_sk_` + 32 chars. Sent as `Authorization: Bearer po_sk_...`. Project-scoped.

## GitHub OAuth Flow

User clicks login → backend redirects to GitHub (with CSRF state param) → GitHub redirects back with code → backend exchanges code for token → fetches profile → upserts user → issues JWT cookie.

GitHub OAuth Apps support one callback base URL, so keep one app for local development and a separate app for production.

The GitHub provider callback URL should target the backend route, not the frontend route:

- Local: `http://localhost:8787/api/auth/callback`
- Production: `https://promptops-api-production.promptops-ameer.workers.dev/api/auth/callback`

The frontend `/callback` route is the post-auth app landing page, not the GitHub provider callback target.

Secrets needed: environment-specific `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `JWT_SECRET` values in Wrangler secrets.

## RBAC

| Action                        | OWNER | ADMIN | MEMBER | VIEWER |
| ----------------------------- | ----- | ----- | ------ | ------ |
| Read anything                 | ✅    | ✅    | ✅     | ✅     |
| Create/edit prompts, datasets | ✅    | ✅    | ✅     | ❌     |
| Release prompt versions       | ✅    | ✅    | ❌     | ❌     |
| Manage members, API keys      | ✅    | ✅    | ❌     | ❌     |
| Delete project/org            | ✅    | ❌    | ❌     | ❌     |

Resolution: request → look up project → get org_id → check org_members for role → 403 if insufficient.

## API Keys

Project-scoped. Format: `po_sk_` + 32 random chars. Store SHA-256 hash (never plaintext). Show prefix `po_sk_a1b2...` in UI. Plaintext shown ONCE at creation. Used only for `/api/runs`.

## Provider Keys (BYOK)

Users enter their LLM API key in settings. Encrypted with AES-256-GCM (ENCRYPTION_KEY secret). UI shows hint only (`sk-...abc`). Decrypted and passed to browser for eval runs. Backend never calls LLM providers.

## Tables

users, orgs, org_members, api_keys, provider_keys (see CONTEXT_DATABASE for full schema)

## Endpoints

Auth: github redirect, callback, me, logout. Orgs: CRUD + membership. API keys: create/list/revoke. Provider keys: store/list/delete/decrypt.

## Security Rules

JWT in Wrangler secrets. CSRF on OAuth. API keys hashed. Provider keys encrypted. HttpOnly cookies. RBAC at API level. Rate limiting on SDK endpoint. Always verify org membership.

## Security Baseline Lock (Phase 1 Task 1.2)

- **BYOK boundary:** Browser orchestration is the default path for provider calls; backend is not the default inference proxy.
- **Provider keys:** Encrypt with AES-256-GCM using `ENCRYPTION_KEY`; never store or log plaintext keys.
- **SDK API keys:** Store only SHA-256 hash + prefix metadata; plaintext key may be shown once at creation only.
- **JWT sessions:** Issue only after OAuth state validation; use `po_session` cookie with `HttpOnly`, `SameSite=Lax`, `Secure` in production, 7-day max expiry.
- **RBAC:** Resolve org/project role server-side on every protected request, deny by default when membership is missing, and enforce Owner/Admin gates for sensitive actions.
- **Route auth boundary:** `po_sk_*` API keys are accepted only for SDK run logging routes; dashboard/session routes require JWT cookie auth.

### Phase 1 Security Checklist

- [x] BYOK execution boundary documented
- [x] Key encryption/hashing requirements documented
- [x] JWT/cookie policy documented
- [x] RBAC deny-by-default policy documented
- [x] API key vs JWT route boundary documented

---

## Task Progress

- [x] Security baseline frozen for BYOK, key handling, JWT/cookie policy, and RBAC enforcement
- [x] GitHub OAuth apps registered (local + production)
- [x] Shared auth, API key, and provider key request/response schemas defined in `@promptops/shared`
- [x] OAuth flow backend (redirect, callback, token exchange, upsert)
- [x] JWT issuance and cookie handling
- [x] JWT session middleware
- [x] API key auth middleware
- [x] RBAC middleware
- [x] Org CRUD + membership endpoints
- [x] API key CRUD endpoints
- [ ] Provider key CRUD endpoints
- [x] Login page UI
- [x] Callback page UI
- [x] Auth context/hook (useAuth)
- [x] Protected dashboard layout
- [ ] Org creation + switcher UI
- [x] API key management UI
- [ ] Provider key management UI

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-16 - Login page redesign - Redesigned login page: aurora background, enlarged card (420px), purple branded logo with glow, shimmer CTA button with loading state (spinner + "Redirecting..."), trust signals ("Your API keys never touch our servers"), back-to-home link. Redesigned callback error card with matching styling. Auth layout updated with aurora blobs, footer with GitHub/MIT links.
- 2026-03-16 - Landing page auth change - Removed auto-redirect for logged-in users on `/`. Landing page now always renders; auth check runs in background and adapts CTA labels (navbar: "Dashboard"/"Sign In", hero: "Go to Dashboard"/"Get Started") without blocking page render.
- 2026-03-16 - Task 22.2 - Added QA integration tests for auth edge cases (expired token, wrong secret, missing code) and RBAC role matrix validation.
- 2026-03-16 - Task 22.1 - Hardened production CORS to block localhost origins and added HSTS for production environment.
- 2026-03-16 - Task 21.2 - Added API key create/list/revoke endpoints, SHA-256 hash-based auth middleware, and last_used_at tracking for SDK run logging.
- 2026-03-16 - Task 20.1 - Built BYOK LLM client abstraction for browser-side provider calls using user's own API keys without backend proxying.
- 2026-03-16 - Task 19.3 - Added prompt injection heuristics guardrail for eval input validation in shared eval utilities.
- 2026-03-16 - Task 17.3 - Added eval config audit events for creation and update with compatibility metadata tracking changed fields and existing run presence.
- 2026-03-16 - Task 13.3 - Added ADMIN+ release and MEMBER+ archive permission enforcement for prompt version state transitions with audit logging.
- 2026-03-15 - Task 12.2 - Built login and callback pages with GitHub OAuth redirect, session verification, and error-specific messaging.
- 2026-03-15 - Task 12.1 - Built protected dashboard layout with AuthProvider gate, auth-aware sidebar user menu, and logout flow.
- 2026-03-09 - Task 11.3 - Tightened org/project RBAC enforcement with owner-management guardrails and structured audit metadata on sensitive tenancy mutations.
- 2026-03-09 - Task 11.2 - Added org-scoped project create/list/detail/update/delete endpoints with role checks and audit logging.
- 2026-03-09 - Task 11.1 - Added org create/list/detail/member-management and audit log endpoints with existing-user invites and last-owner safeguards.
- 2026-03-08 - Task 10.3 - Added `/api/auth/me` and `/api/auth/logout` with shared contract responses, 401 session semantics, and idempotent cookie clearing on logout.
- 2026-03-08 - Task 10.2 - Added signed 7-day session JWTs plus secure `po_session` cookie helpers and dashboard-session request resolution.
- 2026-03-08 - Task 10.1 - Implemented GitHub authorize/callback routes with CSRF state validation, provider token exchange, user upsert, and frontend callback redirects.
- 2026-03-08 - Task 9.3 - Added request-context, auth guard, and RBAC resolution middleware scaffolding so upcoming JWT/API-key implementation lands on one contract.
- 2026-03-08 - Task 8.2 - Added shared auth/session, API key, and provider-key validation schemas so future route handlers and UI flows use one contract source.
- 2026-03-07 - Task 6.1 - Added the core tenancy tables and RBAC membership constraints that the OAuth upsert and role-resolution flow will rely on.
- 2026-03-06 - Task 5.2 - Registered separate local and production GitHub OAuth apps and stored the production auth secrets in Cloudflare.
- 2026-03-02 - Task 1.2 - Locked auth guardrails for BYOK boundaries, encrypted/hashed keys, JWT cookie policy, and deny-by-default RBAC.
- 2026-03-02 - Task 4.1 - Added backend secrets template and seeded local `.dev.vars` placeholders for JWT, GitHub OAuth, and encryption key.
