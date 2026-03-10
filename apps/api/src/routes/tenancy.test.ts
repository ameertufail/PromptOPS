import {
  AUTH_SESSION_COOKIE_NAME,
  type ApiErrorResponse
} from "@promptops/shared";
import { describe, expect, it } from "vitest";
import { createApp, type AppBindings } from "../index";
import {
  createSessionClaims,
  signSessionToken
} from "../lib/session";
import { createResult, MockDb } from "../test-utils/d1";

const ORG_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAA";
const USER_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAB";
const PROJECT_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAC";
const INVITED_USER_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAD";
const AUDIT_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAE";

const sessionUser = {
  avatar_url: "https://avatars.example/alice.png",
  created_at: "2026-03-09T08:00:00.000Z",
  email: "alice@example.com",
  github_id: 42,
  id: USER_ID,
  name: "Alice"
};

const invitedUser = {
  avatar_url: "https://avatars.example/bob.png",
  created_at: "2026-03-09T09:00:00.000Z",
  email: "bob@example.com",
  github_id: 43,
  id: INVITED_USER_ID,
  name: "Bob"
};

function createOrgAccessRow(role: "ADMIN" | "MEMBER" | "OWNER" | "VIEWER") {
  return {
    membership_created_at: "2026-03-09T08:30:00.000Z",
    org_created_at: "2026-03-09T08:15:00.000Z",
    org_id: ORG_ID,
    org_name: "Acme",
    org_slug: "acme",
    role,
    user_id: USER_ID
  };
}

function createProjectAccessRow(role: "ADMIN" | "MEMBER" | "OWNER" | "VIEWER") {
  return {
    membership_created_at: "2026-03-09T08:30:00.000Z",
    org_created_at: "2026-03-09T08:15:00.000Z",
    org_id: ORG_ID,
    org_name: "Acme",
    org_slug: "acme",
    project_created_at: "2026-03-09T09:15:00.000Z",
    project_description: "Core app",
    project_id: PROJECT_ID,
    project_name: "PromptOps",
    project_slug: "promptops",
    role,
    user_id: USER_ID
  };
}

function createOrgMemberRow(
  role: "ADMIN" | "MEMBER" | "OWNER" | "VIEWER",
  overrides: Partial<typeof invitedUser> = {}
) {
  return {
    membership_created_at: "2026-03-09T09:30:00.000Z",
    org_id: ORG_ID,
    role,
    user_avatar_url: overrides.avatar_url ?? invitedUser.avatar_url,
    user_created_at: overrides.created_at ?? invitedUser.created_at,
    user_email: overrides.email ?? invitedUser.email,
    user_github_id: overrides.github_id ?? invitedUser.github_id,
    user_id: overrides.id ?? invitedUser.id,
    user_name: overrides.name ?? invitedUser.name
  };
}

function createProjectRow(overrides: Partial<{
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  org_id: string;
  slug: string;
}> = {}) {
  return {
    created_at: "2026-03-09T09:15:00.000Z",
    description: "Core app",
    id: PROJECT_ID,
    name: "PromptOps",
    org_id: ORG_ID,
    slug: "promptops",
    ...overrides
  };
}

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

function createBindings(db: MockDb): AppBindings {
  return {
    DB: db as unknown as D1Database,
    JWT_SECRET: "jwt-secret"
  };
}

describe("Phase 11 tenancy routes", () => {
  it("creates orgs for authenticated users and writes an audit event", async () => {
    const org = {
      created_at: "2026-03-09T10:00:00.000Z",
      id: ORG_ID,
      name: "Acme",
      slug: "acme"
    };
    const membership = {
      created_at: "2026-03-09T10:00:00.000Z",
      org_id: ORG_ID,
      role: "OWNER" as const,
      user_id: USER_ID
    };
    const db = new MockDb(
      [[createResult([]), createResult([]), createResult([org]), createResult([membership])]],
      [sessionUser, null]
    );
    const response = await createApp().request(
      "http://localhost:8787/api/orgs",
      {
        body: JSON.stringify({
          name: "Acme",
          slug: "acme"
        }),
        headers: {
          Cookie: await createSessionCookie(),
          "Content-Type": "application/json"
        },
        method: "POST"
      },
      createBindings(db)
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      membership: {
        orgId: ORG_ID,
        role: "OWNER",
        userId: USER_ID
      },
      org: {
        id: ORG_ID,
        slug: "acme"
      }
    });
    expect(db.batchCalls).toHaveLength(1);
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      ORG_ID,
      USER_ID,
      "org.created",
      "org",
      ORG_ID,
      JSON.stringify({ slug: "acme" })
    ]);
  });

  it("lists the caller's organizations", async () => {
    const db = new MockDb(
      [],
      [sessionUser],
      {
        allResponses: [[
          createOrgAccessRow("ADMIN"),
          {
            ...createOrgAccessRow("VIEWER"),
            org_created_at: "2026-03-09T09:15:00.000Z",
            org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAF",
            org_name: "Beta",
            org_slug: "beta"
          }
        ]]
      }
    );
    const response = await createApp().request(
      "http://localhost:8787/api/orgs",
      {
        headers: {
          Cookie: await createSessionCookie()
        }
      },
      createBindings(db)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      orgs: [
        {
          org: {
            id: ORG_ID,
            name: "Acme"
          },
          role: "ADMIN"
        },
        {
          org: {
            id: "01ARZ3NDEKTSV4RRFFQ69G5FAF",
            name: "Beta"
          },
          role: "VIEWER"
        }
      ]
    });
  });

  it("adds org members for admin users and audits the mutation", async () => {
    const db = new MockDb(
      [[createResult([]), createResult([createOrgMemberRow("MEMBER")])]],
      [sessionUser, createOrgAccessRow("ADMIN"), invitedUser, null]
    );
    const response = await createApp().request(
      `http://localhost:8787/api/orgs/${ORG_ID}/members`,
      {
        body: JSON.stringify({
          email: invitedUser.email,
          role: "MEMBER"
        }),
        headers: {
          Cookie: await createSessionCookie(),
          "Content-Type": "application/json"
        },
        method: "POST"
      },
      createBindings(db)
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      member: {
        role: "MEMBER",
        user: {
          email: invitedUser.email,
          id: INVITED_USER_ID
        }
      }
    });
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      ORG_ID,
      USER_ID,
      "org_member.added",
      "org_member",
      INVITED_USER_ID,
      JSON.stringify({
        role: "MEMBER",
        userEmail: invitedUser.email
      })
    ]);
  });

  it("blocks admins from promoting members to owner", async () => {
    const db = new MockDb(
      [],
      [sessionUser, createOrgAccessRow("ADMIN"), createOrgMemberRow("MEMBER")]
    );
    const response = await createApp().request(
      `http://localhost:8787/api/orgs/${ORG_ID}/members/${INVITED_USER_ID}`,
      {
        body: JSON.stringify({
          role: "OWNER"
        }),
        headers: {
          Cookie: await createSessionCookie(),
          "Content-Type": "application/json"
        },
        method: "PATCH"
      },
      createBindings(db)
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "FORBIDDEN",
      message: "Only organization owners can assign or manage owner memberships."
    });
  });

  it("prevents removing the last owner from an organization", async () => {
    const ownerMember = createOrgMemberRow("OWNER", sessionUser);
    const db = new MockDb(
      [],
      [sessionUser, createOrgAccessRow("OWNER"), ownerMember, { total: 1 }]
    );
    const response = await createApp().request(
      `http://localhost:8787/api/orgs/${ORG_ID}/members/${USER_ID}`,
      {
        headers: {
          Cookie: await createSessionCookie()
        },
        method: "DELETE"
      },
      createBindings(db)
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "CONFLICT",
      message: "Organizations must retain at least one owner."
    });
  });

  it("returns org audit events for admin users", async () => {
    const db = new MockDb(
      [],
      [sessionUser, createOrgAccessRow("ADMIN"), { total: 1 }],
      {
        allResponses: [[
          {
            action: "project.created",
            actor_user_id: USER_ID,
            created_at: "2026-03-09T10:30:00.000Z",
            entity_id: PROJECT_ID,
            entity_type: "project",
            id: AUDIT_ID,
            metadata: "{\"slug\":\"promptops\"}",
            org_id: ORG_ID
          }
        ]]
      }
    );
    const response = await createApp().request(
      `http://localhost:8787/api/orgs/${ORG_ID}/audit-events?page=1&limit=10`,
      {
        headers: {
          Cookie: await createSessionCookie()
        }
      },
      createBindings(db)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      events: [
        {
          action: "project.created",
          actorUserId: USER_ID,
          entityId: PROJECT_ID,
          metadata: {
            slug: "promptops"
          }
        }
      ],
      limit: 10,
      page: 1,
      total: 1
    });
  });

  it("creates org-scoped projects for member users and audits the mutation", async () => {
    const project = createProjectRow();
    const db = new MockDb(
      [[createResult([]), createResult([project])]],
      [sessionUser, createOrgAccessRow("MEMBER"), null]
    );
    const response = await createApp().request(
      `http://localhost:8787/api/orgs/${ORG_ID}/projects`,
      {
        body: JSON.stringify({
          description: "Core app",
          name: "PromptOps",
          slug: "promptops"
        }),
        headers: {
          Cookie: await createSessionCookie(),
          "Content-Type": "application/json"
        },
        method: "POST"
      },
      createBindings(db)
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      project: {
        id: PROJECT_ID,
        orgId: ORG_ID,
        slug: "promptops"
      }
    });
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      ORG_ID,
      USER_ID,
      "project.created",
      "project",
      PROJECT_ID,
      JSON.stringify({ slug: "promptops" })
    ]);
  });

  it("updates projects for admin users and records an audit event", async () => {
    const updatedProject = createProjectRow({
      description: "Renamed project",
      name: "PromptOps 2"
    });
    const db = new MockDb(
      [[createResult([]), createResult([updatedProject])]],
      [sessionUser, createProjectAccessRow("ADMIN")]
    );
    const response = await createApp().request(
      `http://localhost:8787/api/projects/${PROJECT_ID}`,
      {
        body: JSON.stringify({
          description: "Renamed project",
          name: "PromptOps 2"
        }),
        headers: {
          Cookie: await createSessionCookie(),
          "Content-Type": "application/json"
        },
        method: "PATCH"
      },
      createBindings(db)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      project: {
        description: "Renamed project",
        id: PROJECT_ID,
        name: "PromptOps 2"
      }
    });
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      ORG_ID,
      USER_ID,
      "project.updated",
      "project",
      PROJECT_ID,
      JSON.stringify({
        description: "Renamed project",
        name: "PromptOps 2"
      })
    ]);
  });

  it("deletes projects for owners and records the deletion audit event", async () => {
    const project = createProjectRow();
    const db = new MockDb(
      [],
      [sessionUser, createProjectAccessRow("OWNER"), project],
      {
        runResponses: [createResult([])]
      }
    );
    const response = await createApp().request(
      `http://localhost:8787/api/projects/${PROJECT_ID}`,
      {
        headers: {
          Cookie: await createSessionCookie()
        },
        method: "DELETE"
      },
      createBindings(db)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      projectId: PROJECT_ID,
      success: true
    });
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      ORG_ID,
      USER_ID,
      "project.deleted",
      "project",
      PROJECT_ID,
      JSON.stringify({ slug: "promptops" })
    ]);
  });

  it("rejects project updates for members without admin access", async () => {
    const db = new MockDb([], [sessionUser, createProjectAccessRow("MEMBER")]);
    const response = await createApp().request(
      `http://localhost:8787/api/projects/${PROJECT_ID}`,
      {
        body: JSON.stringify({
          name: "PromptOps 2"
        }),
        headers: {
          Cookie: await createSessionCookie(),
          "Content-Type": "application/json"
        },
        method: "PATCH"
      },
      createBindings(db)
    );

    expect(response.status).toBe(403);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "FORBIDDEN",
      message: "You do not have permission to perform this action."
    });
  });
});
