import {
  AUTH_SESSION_COOKIE_NAME,
  type ApiErrorResponse
} from "@promptops/shared";
import { describe, expect, it } from "vitest";
import { createApp, type AppBindings } from "../index";
import { createSessionClaims, signSessionToken } from "../lib/session";
import { createResult, MockDb } from "../test-utils/d1";

const sessionUser = {
  avatar_url: "https://avatars.example/alice.png",
  created_at: "2026-03-09T08:00:00.000Z",
  email: "alice@example.com",
  github_id: 42,
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  name: "Alice"
};

async function createSessionCookie() {
  const token = await signSessionToken(
    "jwt-secret",
    createSessionClaims({
      avatarUrl: sessionUser.avatar_url,
      createdAt: sessionUser.created_at,
      email: sessionUser.email,
      githubId: sessionUser.github_id,
      id: sessionUser.id,
      name: sessionUser.name
    })
  );

  return `${AUTH_SESSION_COOKIE_NAME}=${token}`;
}

function createOrgMembershipRow(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") {
  return {
    membership_created_at: "2026-03-09T08:05:00.000Z",
    org_created_at: "2026-03-09T08:00:00.000Z",
    org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
    org_name: "Acme",
    org_slug: "acme",
    role,
    user_id: sessionUser.id
  };
}

function createProjectAccessRow(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") {
  return {
    membership_created_at: "2026-03-09T08:05:00.000Z",
    org_created_at: "2026-03-09T08:00:00.000Z",
    org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
    org_name: "Acme",
    org_slug: "acme",
    project_created_at: "2026-03-09T08:10:00.000Z",
    project_description: "Core app",
    project_id: "01ARZ3NDEKTSV4RRFFQ69G5FAB",
    project_name: "PromptOps",
    project_slug: "promptops",
    role,
    user_id: sessionUser.id
  };
}

describe("project routes", () => {
  it("creates a project inside the caller organization and writes an audit event", async () => {
    const project = {
      created_at: "2026-03-09T09:00:00.000Z",
      description: "Core app",
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAB",
      name: "PromptOps",
      org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      slug: "promptops"
    };
    const db = new MockDb(
      [[createResult([]), createResult([project])]],
      [sessionUser, createOrgMembershipRow("MEMBER"), null]
    );
    const response = await createApp().request(
      "/api/orgs/01ARZ3NDEKTSV4RRFFQ69G5FAA/projects",
      {
        body: JSON.stringify({
          description: "Core app",
          name: "PromptOps",
          slug: "promptops"
        }),
        headers: {
          "Content-Type": "application/json",
          Cookie: await createSessionCookie()
        },
        method: "POST"
      },
      {
        DB: db as unknown as D1Database,
        JWT_SECRET: "jwt-secret"
      } as AppBindings
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      project: {
        createdAt: project.created_at,
        description: project.description,
        id: project.id,
        name: project.name,
        orgId: project.org_id,
        slug: project.slug
      }
    });
    expect(db.batchCalls).toHaveLength(1);
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      project.org_id,
      sessionUser.id,
      "project.created",
      "project",
      project.id,
      JSON.stringify({ slug: project.slug })
    ]);
  });

  it("blocks viewers from updating projects", async () => {
    const db = new MockDb([], [sessionUser, createProjectAccessRow("VIEWER")]);
    const response = await createApp().request(
      "/api/projects/01ARZ3NDEKTSV4RRFFQ69G5FAB",
      {
        body: JSON.stringify({
          name: "Renamed"
        }),
        headers: {
          "Content-Type": "application/json",
          Cookie: await createSessionCookie()
        },
        method: "PATCH"
      },
      {
        DB: db as unknown as D1Database,
        JWT_SECRET: "jwt-secret"
      } as AppBindings
    );

    expect(response.status).toBe(403);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "FORBIDDEN",
      message: "You do not have permission to perform this action."
    });
  });

  it("returns project details for authorized viewers", async () => {
    const project = {
      created_at: "2026-03-09T09:00:00.000Z",
      description: "Core app",
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAB",
      name: "PromptOps",
      org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      slug: "promptops"
    };
    const db = new MockDb(
      [],
      [sessionUser, createProjectAccessRow("VIEWER"), project]
    );
    const response = await createApp().request(
      "/api/projects/01ARZ3NDEKTSV4RRFFQ69G5FAB",
      {
        headers: {
          Cookie: await createSessionCookie()
        }
      },
      {
        DB: db as unknown as D1Database,
        JWT_SECRET: "jwt-secret"
      } as AppBindings
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      project: {
        createdAt: project.created_at,
        description: project.description,
        id: project.id,
        name: project.name,
        orgId: project.org_id,
        slug: project.slug
      }
    });
  });

  it("lets owners delete projects and records the audit event", async () => {
    const project = {
      created_at: "2026-03-09T09:00:00.000Z",
      description: "Core app",
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAB",
      name: "PromptOps",
      org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      slug: "promptops"
    };
    const db = new MockDb(
      [],
      [sessionUser, createProjectAccessRow("OWNER"), project]
    );
    const response = await createApp().request(
      "/api/projects/01ARZ3NDEKTSV4RRFFQ69G5FAB",
      {
        headers: {
          Cookie: await createSessionCookie()
        },
        method: "DELETE"
      },
      {
        DB: db as unknown as D1Database,
        JWT_SECRET: "jwt-secret"
      } as AppBindings
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      projectId: project.id,
      success: true
    });
    expect(db.batchCalls).toHaveLength(1);
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      project.org_id,
      sessionUser.id,
      "project.deleted",
      "project",
      project.id,
      JSON.stringify({ slug: project.slug })
    ]);
  });
});
