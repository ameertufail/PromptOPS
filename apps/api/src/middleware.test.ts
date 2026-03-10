import type { ApiErrorResponse } from "@promptops/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp, type AppBindings } from "./index";
import { getRequestContext } from "./lib/request-context";
import { parseWithSchema } from "./lib/validation";
import { queueAuditEvent } from "./middleware/audit";
import {
  authenticateApiKey,
  authenticateSession,
  requireApiKeyIdentity,
  requireSessionIdentity
} from "./middleware/auth";
import {
  createApiKeyRateLimitMiddleware,
  resetRateLimitState
} from "./middleware/rate-limit";
import { requireMinimumRole, resolveProjectAccess } from "./middleware/rbac";

class MockPreparedStatement {
  boundValues: unknown[] = [];
  row: unknown;
  sql: string;

  constructor(sql: string, row?: unknown) {
    this.row = row;
    this.sql = sql;
  }

  bind(...values: unknown[]) {
    this.boundValues = values;

    return this;
  }

  async first<T>() {
    return (this.row ?? null) as T | null;
  }
}

class MockDatabase {
  batchCalls: MockPreparedStatement[][] = [];
  preparedStatements: MockPreparedStatement[] = [];
  private readonly rows: unknown[];

  constructor(rows: unknown[] = []) {
    this.rows = [...rows];
  }

  prepare(sql: string) {
    const statement = new MockPreparedStatement(sql, this.rows.shift());
    this.preparedStatements.push(statement);

    return statement;
  }

  async batch(statements: MockPreparedStatement[]) {
    this.batchCalls.push(stmtsToArray(statements));

    return statements.map(() => ({ results: [] })) as unknown as D1Result<
      Record<string, unknown>
    >[];
  }
}

function stmtsToArray(statements: MockPreparedStatement[]) {
  return [...statements];
}

describe("Phase 9 middleware scaffolding", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("returns 401 for session-protected routes without identity", async () => {
    const app = createApp({
      configureApp(api) {
        api.get("/api/_test/session", requireSessionIdentity(), (c) =>
          c.json({ status: "ok" })
        );
      }
    });
    const response = await app.request("/api/_test/session");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "UNAUTHORIZED"
    });
  });

  it("lets session-authenticated routes read the request context", async () => {
    const app = createApp({
      configureApp(api) {
        api.get(
          "/api/_test/session-ok",
          async (c, next) => {
            authenticateSession(c, "user_123");
            await next();
          },
          requireSessionIdentity(),
          (c) =>
            c.json({
              identity: getRequestContext(c).identity
            })
        );
      }
    });
    const response = await app.request("/api/_test/session-ok");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      identity: {
        kind: "session",
        userId: "user_123"
      }
    });
  });

  it("resolves project membership and blocks insufficient RBAC roles", async () => {
    const db = new MockDatabase([
      {
        membership_created_at: "2026-03-08T00:00:00.000Z",
        org_created_at: "2026-03-08T00:00:00.000Z",
        org_id: "org_123",
        org_name: "Acme",
        org_slug: "acme",
        project_created_at: "2026-03-08T00:00:00.000Z",
        project_description: "Core app",
        project_id: "project_123",
        project_name: "PromptOps",
        project_slug: "promptops",
        role: "MEMBER",
        user_id: "user_123"
      }
    ]);
    const app = createApp({
      configureApp(api) {
        api.get(
          "/api/projects/:projectId/_test/admin-only",
          async (c, next) => {
            authenticateSession(c, "user_123");
            await next();
          },
          resolveProjectAccess(),
          requireMinimumRole("ADMIN"),
          (c) => c.json(getRequestContext(c))
        );
      }
    });
    const response = await app.request(
      "/api/projects/project_123/_test/admin-only",
      undefined,
      {
        DB: db as unknown as D1Database
      } as AppBindings
    );

    expect(response.status).toBe(403);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "FORBIDDEN",
      message: "You do not have permission to perform this action."
    });
  });

  it("writes queued audit events after successful responses", async () => {
    const db = new MockDatabase();
    const app = createApp({
      configureApp(api) {
        api.post(
          "/api/_test/audit",
          async (c, next) => {
            authenticateSession(c, "user_123");
            await next();
          },
          (c) => {
            queueAuditEvent(c, {
              action: "project.created",
              entityId: "project_123",
              entityType: "project",
              metadata: {
                source: "test"
              },
              orgId: "org_123"
            });

            return c.json({ status: "ok" }, 201);
          }
        );
      }
    });
    const response = await app.request(
      "/api/_test/audit",
      {
        method: "POST"
      },
      {
        DB: db as unknown as D1Database
      } as AppBindings
    );

    expect(response.status).toBe(201);
    expect(db.batchCalls).toHaveLength(1);
    expect(db.batchCalls[0]).toHaveLength(1);
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      "org_123",
      "user_123",
      "project.created",
      "project",
      "project_123",
      JSON.stringify({ source: "test" })
    ]);
  });

  it("rate limits SDK-style API key traffic and preserves rate headers", async () => {
    const app = createApp({
      configureApp(api) {
        api.post(
          "/api/_test/runs",
          async (c, next) => {
            authenticateApiKey(c, {
              apiKeyId: "key_123",
              keyPrefix: "po_sk_demo",
              projectId: "project_123"
            });
            await next();
          },
          requireApiKeyIdentity(),
          createApiKeyRateLimitMiddleware({
            limit: 1,
            windowMs: 60_000
          }),
          (c) => c.json({ status: "logged" }, 201)
        );
      }
    });
    const firstResponse = await app.request("/api/_test/runs", {
      method: "POST"
    });
    const secondResponse = await app.request("/api/_test/runs", {
      method: "POST"
    });

    expect(firstResponse.status).toBe(201);
    expect(firstResponse.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(firstResponse.headers.get("X-RateLimit-Remaining")).toBe("0");

    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("Retry-After")).toEqual(
      expect.any(String)
    );

    const payload = (await secondResponse.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "RATE_LIMITED",
      message: "Rate limit exceeded."
    });
  });

  it("normalizes validation helper failures into the shared error envelope", async () => {
    const app = createApp({
      configureApp(api) {
        api.post("/api/_test/validate", async (c) => {
          const body = await c.req.json();

          parseWithSchema(
            {
              safeParse(value: unknown) {
                if (
                  typeof value === "object" &&
                  value !== null &&
                  "name" in value &&
                  typeof (value as { name?: unknown }).name === "string"
                ) {
                  return {
                    data: value as { name: string },
                    success: true as const
                  };
                }

                return {
                  error: {
                    issues: [
                      {
                        code: "invalid_type",
                        message: "Expected an object with a string name.",
                        path: ["name"]
                      }
                    ]
                  },
                  success: false as const
                };
              }
            },
            body,
            "Body validation failed."
          );

          return c.json({ status: "ok" });
        });
      }
    });
    const response = await app.request("/api/_test/validate", {
      body: JSON.stringify({ wrong: true }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    expect(response.status).toBe(400);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "VALIDATION_ERROR",
      message: "Body validation failed."
    });
    expect(payload.details).toMatchObject({
      issues: [
        {
          code: "invalid_type",
          message: "Expected an object with a string name.",
          path: ["name"]
        }
      ],
      requestId: expect.any(String)
    });
  });
});
