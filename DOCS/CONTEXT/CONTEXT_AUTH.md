# CONTEXT: Authentication & Authorization

> Attach with: PROJECT_OVERVIEW.md

---

## How Auth Works

Two methods:
1. **JWT (cookie):** Dashboard users. GitHub OAuth → backend issues JWT → HttpOnly cookie `po_session`. 7-day expiry.
2. **API Key (header):** SDK only. Format `po_sk_` + 32 chars. Sent as `Authorization: Bearer po_sk_...`. Project-scoped.

## GitHub OAuth Flow

User clicks login → backend redirects to GitHub (with CSRF state param) → GitHub redirects back with code → backend exchanges code for token → fetches profile → upserts user → issues JWT cookie.

Secrets needed: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET (Wrangler secrets)

## RBAC

| Action | OWNER | ADMIN | MEMBER | VIEWER |
|--------|-------|-------|--------|--------|
| Read anything | ✅ | ✅ | ✅ | ✅ |
| Create/edit prompts, datasets | ✅ | ✅ | ✅ | ❌ |
| Release prompt versions | ✅ | ✅ | ❌ | ❌ |
| Manage members, API keys | ✅ | ✅ | ❌ | ❌ |
| Delete project/org | ✅ | ❌ | ❌ | ❌ |

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
- [ ] GitHub OAuth App registered (dev + prod)
- [ ] OAuth flow backend (redirect, callback, token exchange, upsert)
- [ ] JWT issuance and cookie handling
- [ ] Auth middleware (JWT + API key)
- [ ] RBAC middleware
- [ ] Org CRUD + membership endpoints
- [ ] API key CRUD endpoints
- [ ] Provider key CRUD endpoints
- [ ] Login page UI
- [ ] Callback page UI
- [ ] Auth context/hook (useAuth)
- [ ] Protected dashboard layout
- [ ] Org creation + switcher UI
- [ ] API key management UI
- [ ] Provider key management UI


## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-02 - Task 1.2 - Locked auth guardrails for BYOK boundaries, encrypted/hashed keys, JWT cookie policy, and deny-by-default RBAC.
- 2026-03-02 - Task 4.1 - Added backend secrets template and seeded local `.dev.vars` placeholders for JWT, GitHub OAuth, and encryption key.


