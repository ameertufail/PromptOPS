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

---

## Task Progress

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
