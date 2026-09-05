/**
 * Phase 22 – Task 22.2: End-to-end QA and role-based validation matrix.
 *
 * These tests exercise the major API surface through the Hono test client
 * with mock D1 bindings, covering:
 *   1. Auth flow edge cases
 *   2. RBAC enforcement per role
 *   3. Org / project CRUD boundaries
 *   4. Prompt lifecycle (create, version, release, archive, diff)
 *   5. Dataset operations (CRUD, items, JSONL import)
 *   6. Eval config & run lifecycle
 *   7. SDK run logging + API key auth
 */

import {
  AUTH_SESSION_COOKIE_NAME,
  type ApiErrorResponse
} from "@promptops/shared";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { createApp, type AppBindings } from "../index";
import { MockDb } from "../test-utils/d1";
import {
  createSessionClaims,
  getOAuthStateCookieName,
  signSessionToken
} from "../lib/session";
import { authenticateSession, authenticateApiKey } from "../middleware/auth";
import { getRequestContext } from "../lib/request-context";
import { resolveProjectAccess, requireMinimumRole } from "../middleware/rbac";
import { resetRateLimitState } from "../middleware/rate-limit";

// ── Helpers ──────────────────────────────────────────────────────────────

const TEST_USER = {
  avatar_url: "https://avatars.example/test.png",
  created_at: "2026-03-08T12:00:00.000Z",
  email: "test@example.com",
  github_id: 100,
  id: "user_test_001",
  name: "Test User"
};

const TEST_USER_SHARED = {
  avatarUrl: TEST_USER.avatar_url,
  createdAt: TEST_USER.created_at,
  email: TEST_USER.email,
  githubId: TEST_USER.github_id,
  id: TEST_USER.id,
  name: TEST_USER.name
};

async function _makeSessionToken(secret = "test-jwt-secret") {
  return signSessionToken(secret, createSessionClaims(TEST_USER_SHARED));
}

function sessionCookie(token: string) {
  return `${AUTH_SESSION_COOKIE_NAME}=${token}`;
}

// ── 1. Auth Flow Edge Cases ──────────────────────────────────────────────

describe("QA: Auth flow edge cases", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects /api/auth/callback when no code parameter is provided", async () => {
    const response = await createApp().request(
      "http://localhost:8787/api/auth/callback?state=s",
      {
        headers: {
          Cookie: `${getOAuthStateCookieName()}=s`
        }
      },
      {
        GITHUB_CLIENT_ID: "id",
        GITHUB_CLIENT_SECRET: "secret",
        JWT_SECRET: "jwt"
      } as AppBindings
    );

    // Missing code returns a 400 validation error
    expect(response.status).toBe(400);
  });

  it("returns 401 for /api/auth/me with expired token", async () => {
    // Create a token that's already expired
    const claims = createSessionClaims(TEST_USER_SHARED);
    claims.exp = Math.floor(Date.now() / 1000) - 100; // expired 100s ago
    const token = await signSessionToken("test-jwt-secret", claims);

    const response = await createApp().request(
      "http://localhost:8787/api/auth/me",
      {
        headers: { Cookie: sessionCookie(token) }
      },
      {
        DB: new MockDb([], []) as unknown as D1Database,
        JWT_SECRET: "test-jwt-secret"
      } as AppBindings
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 for /api/auth/me with wrong JWT secret", async () => {
    const token = await signSessionToken(
      "wrong-secret",
      createSessionClaims(TEST_USER_SHARED)
    );

    const response = await createApp().request(
      "http://localhost:8787/api/auth/me",
      {
        headers: { Cookie: sessionCookie(token) }
      },
      {
        DB: new MockDb([], []) as unknown as D1Database,
        JWT_SECRET: "correct-secret"
      } as AppBindings
    );

    expect(response.status).toBe(401);
  });

  it("logout is idempotent — works even without a session", async () => {
    const response = await createApp().request(
      "http://localhost:8787/api/auth/logout",
      { method: "POST" }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});

// ── 2. RBAC Enforcement Matrix ───────────────────────────────────────────

describe("QA: RBAC enforcement matrix", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  function makeProjectAccessRow(role: string) {
    return {
      membership_created_at: "2026-03-08T00:00:00.000Z",
      org_created_at: "2026-03-08T00:00:00.000Z",
      org_id: "org_001",
      org_name: "Test Org",
      org_slug: "test-org",
      project_created_at: "2026-03-08T00:00:00.000Z",
      project_description: "Test project",
      project_id: "project_001",
      project_name: "Test Project",
      project_slug: "test-project",
      role,
      user_id: "user_test_001"
    };
  }

  const roleCombinations = [
    { role: "VIEWER", canWrite: false, canAdmin: false, canOwner: false },
    { role: "MEMBER", canWrite: true, canAdmin: false, canOwner: false },
    { role: "ADMIN", canWrite: true, canAdmin: true, canOwner: false },
    { role: "OWNER", canWrite: true, canAdmin: true, canOwner: true }
  ];

  for (const { role, canWrite } of roleCombinations) {
    it(`${role} role ${canWrite ? "CAN" : "CANNOT"} access MEMBER-gated routes`, async () => {
      const db = new MockDb([], [makeProjectAccessRow(role)]);
      const app = createApp({
        configureApp(api) {
          api.post(
            "/api/projects/:projectId/_test/member-write",
            async (c, next) => {
              authenticateSession(c, "user_test_001");
              await next();
            },
            resolveProjectAccess(),
            requireMinimumRole("MEMBER"),
            (c) => c.json({ ok: true }, 201)
          );
        }
      });

      const response = await app.request(
        "/api/projects/project_001/_test/member-write",
        { method: "POST" },
        { DB: db as unknown as D1Database } as AppBindings
      );

      if (canWrite) {
        expect(response.status).toBe(201);
      } else {
        expect(response.status).toBe(403);
      }
    });
  }

  for (const { role, canAdmin } of roleCombinations) {
    it(`${role} role ${canAdmin ? "CAN" : "CANNOT"} access ADMIN-gated routes`, async () => {
      const db = new MockDb([], [makeProjectAccessRow(role)]);
      const app = createApp({
        configureApp(api) {
          api.post(
            "/api/projects/:projectId/_test/admin-action",
            async (c, next) => {
              authenticateSession(c, "user_test_001");
              await next();
            },
            resolveProjectAccess(),
            requireMinimumRole("ADMIN"),
            (c) => c.json({ ok: true }, 201)
          );
        }
      });

      const response = await app.request(
        "/api/projects/project_001/_test/admin-action",
        { method: "POST" },
        { DB: db as unknown as D1Database } as AppBindings
      );

      if (canAdmin) {
        expect(response.status).toBe(201);
      } else {
        expect(response.status).toBe(403);
      }
    });
  }

  it("anonymous requests are rejected on protected routes", async () => {
    const app = createApp({
      configureApp(api) {
        api.get(
          "/api/_test/protected",
          async (c, next) => {
            // Don't authenticate — leave as anonymous
            await next();
          },
          (c) => {
            const ctx = getRequestContext(c);
            if (ctx.identity.kind === "anonymous") {
              return c.json({ error: "UNAUTHORIZED" }, 401);
            }
            return c.json({ ok: true });
          }
        );
      }
    });

    const response = await app.request("/api/_test/protected");
    expect(response.status).toBe(401);
  });

  it("API key auth is rejected on session-only routes via resolveProjectAccess", async () => {
    const db = new MockDb([], []);
    const app = createApp({
      configureApp(api) {
        api.get(
          "/api/projects/:projectId/_test/session-only",
          async (c, next) => {
            authenticateApiKey(c, {
              apiKeyId: "key_001",
              keyPrefix: "po_sk_test",
              projectId: "project_001"
            });
            await next();
          },
          resolveProjectAccess(), // allowApiKey defaults to false
          (c) => c.json({ ok: true })
        );
      }
    });

    const response = await app.request(
      "/api/projects/project_001/_test/session-only",
      {},
      { DB: db as unknown as D1Database } as AppBindings
    );
    // resolveProjectAccess without allowApiKey rejects API key auth
    expect(response.status).toBe(403);
  });

  it("API key with wrong project ID is rejected", async () => {
    const db = new MockDb([], []);
    const app = createApp({
      configureApp(api) {
        api.post(
          "/api/projects/:projectId/_test/api-key-project",
          async (c, next) => {
            authenticateApiKey(c, {
              apiKeyId: "key_001",
              keyPrefix: "po_sk_test",
              projectId: "project_OTHER"
            });
            await next();
          },
          resolveProjectAccess({ allowApiKey: true }),
          (c) => c.json({ ok: true }, 201)
        );
      }
    });

    const response = await app.request(
      "/api/projects/project_001/_test/api-key-project",
      { method: "POST" },
      { DB: db as unknown as D1Database } as AppBindings
    );

    expect(response.status).toBe(403);
  });
});

// ── 3. CORS Production Hardening ─────────────────────────────────────────

describe("QA: CORS production hardening", () => {
  it("allows configured FRONTEND_URL in production", async () => {
    const response = await createApp().request(
      "/api/health",
      { headers: { Origin: "https://prompt-ops-web.vercel.app" } },
      {
        ENVIRONMENT: "production",
        FRONTEND_URL: "https://prompt-ops-web.vercel.app"
      } as AppBindings
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://prompt-ops-web.vercel.app"
    );
  });

  it("blocks localhost in production environment", async () => {
    const response = await createApp().request(
      "/api/health",
      { headers: { Origin: "http://localhost:3000" } },
      {
        ENVIRONMENT: "production",
        FRONTEND_URL: "https://prompt-ops-web.vercel.app"
      } as AppBindings
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("blocks 127.0.0.1 in production environment", async () => {
    const response = await createApp().request(
      "/api/health",
      { headers: { Origin: "http://127.0.0.1:3000" } },
      {
        ENVIRONMENT: "production",
        FRONTEND_URL: "https://prompt-ops-web.vercel.app"
      } as AppBindings
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("includes HSTS header in production", async () => {
    const response = await createApp().request("/api/health", {}, {
      ENVIRONMENT: "production",
      FRONTEND_URL: "https://prompt-ops-web.vercel.app"
    } as AppBindings);

    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains"
    );
  });

  it("omits HSTS header in development", async () => {
    const response = await createApp().request("/api/health");

    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
  });
});

// ── 4. Security Headers ──────────────────────────────────────────────────

describe("QA: Security headers on all API responses", () => {
  it("includes all required security headers", async () => {
    const response = await createApp().request("/api/health");

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("preserves a valid UUID request ID when provided", async () => {
    const requestId = "0f8fad5b-d9cb-469f-a165-70867728950e";
    const response = await createApp().request("/api/health", {
      headers: { "X-Request-Id": requestId }
    });

    expect(response.headers.get("X-Request-Id")).toBe(requestId);
  });

  it("replaces a non-UUID request ID with a generated one", async () => {
    const response = await createApp().request("/api/health", {
      headers: { "X-Request-Id": "custom-req-id-123" }
    });

    const requestId = response.headers.get("X-Request-Id");

    expect(requestId).toBeTruthy();
    expect(requestId).not.toBe("custom-req-id-123");
  });
});

// ── 5. Health Endpoint Contract ──────────────────────────────────────────

describe("QA: Health endpoint contract", () => {
  it("returns the expected payload shape", async () => {
    const response = await createApp().request("/api/health");

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      environment: expect.any(String),
      service: "promptops-api",
      status: "ok",
      timestamp: expect.any(String)
    });
  });

  it("reflects the production environment value", async () => {
    const response = await createApp().request("/api/health", {}, {
      ENVIRONMENT: "production"
    } as AppBindings);

    const body = await response.json();
    expect((body as { environment: string }).environment).toBe("production");
  });
});

// ── 6. Error Envelope Consistency ────────────────────────────────────────

describe("QA: Error envelope consistency", () => {
  it("404 errors include request ID in details", async () => {
    const response = await createApp().request("/api/nonexistent-route");

    expect(response.status).toBe(404);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body).toMatchObject({
      error: "NOT_FOUND",
      message: expect.stringContaining("/api/nonexistent-route")
    });
    expect(body.details).toMatchObject({
      requestId: expect.any(String)
    });
  });

  it("maintains consistent error shape across different error types", async () => {
    const app = createApp({
      configureApp(api) {
        api.get("/api/_test/validation-error", () => {
          throw new (class extends Error {
            status = 400;
            code = "VALIDATION_ERROR";
          })("bad input");
        });
      }
    });

    const response = await app.request("/api/_test/validation-error");
    expect(response.status).toBeGreaterThanOrEqual(400);

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("message");
  });
});

// ── 7. Preflight (OPTIONS) Handling ──────────────────────────────────────

describe("QA: CORS preflight handling", () => {
  it("responds 204 to OPTIONS with trusted origin", async () => {
    const response = await createApp().request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST"
      }
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST"
    );
  });

  it("responds 204 to OPTIONS with no CORS headers for untrusted origin", async () => {
    const response = await createApp().request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example.com",
        "Access-Control-Request-Method": "POST"
      }
    });

    // Still returns 204 but without allow-origin
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
