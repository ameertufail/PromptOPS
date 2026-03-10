import { AUTH_SESSION_COOKIE_NAME, type ApiErrorResponse } from "@promptops/shared";
import { describe, expect, it } from "vitest";
import { createApp, type AppBindings } from "../index";
import {
  createSessionClaims,
  signSessionToken
} from "../lib/session";
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

function createOrgMemberRow(
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER",
  overrides: Partial<typeof sessionUser> = {}
) {
  const user = {
    ...sessionUser,
    ...overrides
  };

  return {
    membership_created_at: "2026-03-09T08:05:00.000Z",
    org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
    role,
    user_avatar_url: user.avatar_url,
    user_created_at: user.created_at,
    user_email: user.email,
    user_github_id: user.github_id,
    user_id: user.id,
    user_name: user.name
  };
}

describe("org routes", () => {
  it("creates an organization, adds the creator as owner, and writes an audit event", async () => {
    const createdOrg = {
      created_at: "2026-03-09T09:00:00.000Z",
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      name: "Acme",
      slug: "acme"
    };
    const createdMembership = {
      created_at: "2026-03-09T09:00:00.000Z",
      org_id: createdOrg.id,
      role: "OWNER" as const,
      user_id: sessionUser.id
    };
    const db = new MockDb(
      [
        [
          createResult([]),
          createResult([]),
          createResult([createdOrg]),
          createResult([createdMembership])
        ]
      ],
      [sessionUser, null]
    );
    const response = await createApp().request(
      "/api/orgs",
      {
        body: JSON.stringify({
          name: "Acme",
          slug: "acme"
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
      membership: {
        createdAt: createdMembership.created_at,
        orgId: createdMembership.org_id,
        role: "OWNER",
        userId: sessionUser.id
      },
      org: {
        createdAt: createdOrg.created_at,
        id: createdOrg.id,
        name: createdOrg.name,
        slug: createdOrg.slug
      }
    });
    expect(db.batchCalls).toHaveLength(1);
    expect(db.batchCalls[0]?.[0]?.boundValues).toEqual([
      expect.any(String),
      createdOrg.id,
      sessionUser.id,
      "org.created",
      "org",
      createdOrg.id,
      JSON.stringify({ slug: createdOrg.slug })
    ]);
  });

  it("blocks admins from assigning owner membership", async () => {
    const db = new MockDb([], [sessionUser, createOrgMembershipRow("ADMIN")]);
    const response = await createApp().request(
      "/api/orgs/01ARZ3NDEKTSV4RRFFQ69G5FAA/members",
      {
        body: JSON.stringify({
          email: "owner@example.com",
          role: "OWNER"
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

    expect(response.status).toBe(403);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "FORBIDDEN",
      message: "Only organization owners can assign or manage owner memberships."
    });
  });

  it("prevents removing the last remaining organization owner", async () => {
    const db = new MockDb([], [
      sessionUser,
      createOrgMembershipRow("OWNER"),
      createOrgMemberRow("OWNER"),
      { total: 1 }
    ]);
    const response = await createApp().request(
      `/api/orgs/01ARZ3NDEKTSV4RRFFQ69G5FAA/members/${sessionUser.id}`,
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

    expect(response.status).toBe(409);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "CONFLICT",
      message: "Organizations must retain at least one owner."
    });
  });

  it("restricts audit-event listing to admins and owners", async () => {
    const db = new MockDb([], [sessionUser, createOrgMembershipRow("MEMBER")]);
    const response = await createApp().request(
      "/api/orgs/01ARZ3NDEKTSV4RRFFQ69G5FAA/audit-events?page=1&limit=10",
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

    expect(response.status).toBe(403);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "FORBIDDEN",
      message: "You do not have permission to perform this action."
    });
  });
});
