import { describe, expect, it } from "vitest";
import {
  addOrgMember,
  countOrgMembersByRole,
  createOrgWithOwner,
  createProject,
  getOrgMembership,
  getProjectByOrgAndSlug,
  getProjectAccess,
  getUserById,
  listOrgAuditEvents,
  listOrgMembers,
  listOrgProjects,
  listUserOrgMemberships,
  removeOrgMember,
  updateOrgMemberRole,
  updateProject,
  upsertUser
} from "./queries";

type MockResult<T> = D1Result<T>;

function createResult<T>(results: T[]): MockResult<T> {
  return {
    meta: {},
    results,
    success: true
  } as MockResult<T>;
}

class MockPreparedStatement {
  boundValues: unknown[] = [];
  private readonly resolveAll: () => unknown[];
  private readonly resolveFirst: () => unknown;
  private readonly resolveRun: () => D1Result<unknown>;

  constructor(
    readonly query: string,
    options: {
      resolveAll?: () => unknown[];
      resolveFirst?: () => unknown;
      resolveRun?: () => D1Result<unknown>;
    } = {}
  ) {
    this.resolveAll = options.resolveAll ?? (() => []);
    this.resolveFirst = options.resolveFirst ?? (() => null);
    this.resolveRun = options.resolveRun ?? (() => createResult<never>([]));
  }

  bind(...values: unknown[]) {
    this.boundValues = values;
    return this;
  }

  async first<T>() {
    return this.resolveFirst() as T | null;
  }

  async all<T>() {
    return createResult<T>(this.resolveAll() as T[]);
  }

  async raw<T>() {
    return [] as T[];
  }

  async run<T>() {
    return this.resolveRun() as D1Result<T>;
  }
}

class MockSession {
  batchCalls: MockPreparedStatement[][] = [];
  preparedStatements: MockPreparedStatement[] = [];

  constructor(private readonly batchResponses: Array<D1Result<unknown>[]>) {}

  prepare(query: string) {
    const statement = new MockPreparedStatement(query);
    this.preparedStatements.push(statement);
    return statement;
  }

  async batch<T>(statements: D1PreparedStatement[]) {
    this.batchCalls.push(statements as unknown as MockPreparedStatement[]);
    const nextResponse = this.batchResponses.shift();

    if (!nextResponse) {
      throw new Error("No mock batch response configured.");
    }

    return nextResponse as D1Result<T>[];
  }

  getBookmark() {
    return null;
  }
}

class MockDb {
  prepareCalls: MockPreparedStatement[] = [];
  sessions: MockSession[] = [];
  sessionConstraints: string[] = [];
  private readonly allResponses: unknown[][];
  private readonly firstResponses: unknown[];
  private readonly runResponses: Array<D1Result<unknown>>;

  constructor(
    private readonly batchResponses: Array<D1Result<unknown>[]>,
    firstResponses: unknown[] = [],
    options: {
      allResponses?: unknown[][];
      runResponses?: Array<D1Result<unknown>>;
    } = {}
  ) {
    this.allResponses = [...(options.allResponses ?? [])];
    this.firstResponses = [...firstResponses];
    this.runResponses = [...(options.runResponses ?? [])];
  }

  withSession(constraint?: string) {
    this.sessionConstraints.push(constraint ?? "");
    const session = new MockSession(this.batchResponses);
    this.sessions.push(session);
    return session;
  }

  prepare(query: string) {
    const statement = new MockPreparedStatement(query, {
      resolveAll: () => (this.allResponses.shift() ?? []) as unknown[],
      resolveFirst: () => this.firstResponses.shift() ?? null,
      resolveRun: () =>
        (this.runResponses.shift() ??
          createResult<never>([])) as D1Result<unknown>
    });
    this.prepareCalls.push(statement);
    return statement;
  }
}

describe("db query helpers", () => {
  it("upserts users in a sequentially consistent batch and returns the row", async () => {
    const expectedUser = {
      avatar_url: "https://avatars.example/alice.png",
      created_at: "2026-03-07T10:00:00.000Z",
      email: "alice@example.com",
      github_id: 42,
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      name: "Alice"
    };
    const db = new MockDb([
      [createResult([]), createResult([expectedUser])]
    ]) as unknown as D1Database & {
      sessionConstraints: string[];
      withSession: (constraint?: string) => MockSession;
    };
    const user = await upsertUser(
      db,
      {
        avatarUrl: expectedUser.avatar_url,
        email: expectedUser.email,
        githubId: expectedUser.github_id,
        name: expectedUser.name
      },
      {
        createId: () => expectedUser.id
      }
    );

    expect(user).toEqual(expectedUser);
    expect((db as unknown as MockDb).sessionConstraints).toEqual([
      "first-primary"
    ]);
    expect((db as unknown as MockDb).sessions[0]?.batchCalls).toHaveLength(1);
    expect(
      ((db as unknown as MockDb).sessions[0]?.batchCalls[0] ??
        []) as unknown as MockPreparedStatement[]
    ).toHaveLength(2);
  });

  it("creates an org and owner membership in one batch", async () => {
    const org = {
      created_at: "2026-03-07T10:00:00.000Z",
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      name: "Acme",
      slug: "acme"
    };
    const membership = {
      created_at: "2026-03-07T10:00:00.000Z",
      org_id: org.id,
      role: "OWNER" as const,
      user_id: "01ARZ3NDEKTSV4RRFFQ69G5FAB"
    };
    const mockDb = new MockDb([
      [
        createResult([]),
        createResult([]),
        createResult([org]),
        createResult([membership])
      ]
    ]);

    const result = await createOrgWithOwner(
      mockDb as unknown as D1Database,
      {
        name: org.name,
        ownerUserId: membership.user_id,
        slug: org.slug
      },
      {
        createId: () => org.id
      }
    );

    expect(result).toEqual({
      membership,
      org
    });
    expect(mockDb.sessionConstraints).toEqual(["first-primary"]);
  });

  it("creates projects in a batch and preserves nullable descriptions", async () => {
    const project = {
      created_at: "2026-03-07T10:00:00.000Z",
      description: null,
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAC",
      name: "PromptOps",
      org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      slug: "promptops"
    };
    const mockDb = new MockDb([[createResult([]), createResult([project])]]);

    const result = await createProject(
      mockDb as unknown as D1Database,
      {
        name: project.name,
        orgId: project.org_id,
        slug: project.slug
      },
      {
        createId: () => project.id
      }
    );

    expect(result).toEqual(project);
    expect(mockDb.sessionConstraints).toEqual(["first-primary"]);
  });

  it("resolves org membership reads with org metadata", async () => {
    const row = {
      membership_created_at: "2026-03-07T10:00:00.000Z",
      org_created_at: "2026-03-07T09:00:00.000Z",
      org_id: "org_1",
      org_name: "Acme",
      org_slug: "acme",
      role: "ADMIN" as const,
      user_id: "user_1"
    };
    const mockDb = new MockDb([], [row]);

    const result = await getOrgMembership(mockDb as unknown as D1Database, {
      orgId: "org_1",
      userId: "user_1"
    });

    expect(result).toEqual({
      membership: {
        created_at: row.membership_created_at,
        org_id: row.org_id,
        role: row.role,
        user_id: row.user_id
      },
      org: {
        created_at: row.org_created_at,
        id: row.org_id,
        name: row.org_name,
        slug: row.org_slug
      }
    });
    expect(mockDb.prepareCalls[0]?.boundValues).toEqual(["org_1", "user_1"]);
  });

  it("lists a user's org memberships with org metadata", async () => {
    const rows = [
      {
        membership_created_at: "2026-03-07T10:00:00.000Z",
        org_created_at: "2026-03-07T09:00:00.000Z",
        org_id: "org_1",
        org_name: "Acme",
        org_slug: "acme",
        role: "ADMIN" as const,
        user_id: "user_1"
      },
      {
        membership_created_at: "2026-03-07T11:00:00.000Z",
        org_created_at: "2026-03-07T09:30:00.000Z",
        org_id: "org_2",
        org_name: "Beta",
        org_slug: "beta",
        role: "VIEWER" as const,
        user_id: "user_1"
      }
    ];
    const mockDb = new MockDb([], [], {
      allResponses: [rows]
    });

    const result = await listUserOrgMemberships(
      mockDb as unknown as D1Database,
      { userId: "user_1" }
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      membership: {
        role: "ADMIN",
        user_id: "user_1"
      },
      org: {
        id: "org_1",
        name: "Acme"
      }
    });
  });

  it("loads a user by id for session-backed auth endpoints", async () => {
    const user = {
      avatar_url: "https://avatars.example/alice.png",
      created_at: "2026-03-07T10:00:00.000Z",
      email: "alice@example.com",
      github_id: 42,
      id: "user_1",
      name: "Alice"
    };
    const mockDb = new MockDb([], [user]);

    const result = await getUserById(mockDb as unknown as D1Database, {
      userId: "user_1"
    });

    expect(result).toEqual(user);
    expect(mockDb.prepareCalls[0]?.boundValues).toEqual(["user_1"]);
  });

  it("lists org members with user records", async () => {
    const rows = [
      {
        membership_created_at: "2026-03-07T10:00:00.000Z",
        org_id: "org_1",
        role: "ADMIN" as const,
        user_avatar_url: "https://avatars.example/alice.png",
        user_created_at: "2026-03-07T09:00:00.000Z",
        user_email: "alice@example.com",
        user_github_id: 42,
        user_id: "user_1",
        user_name: "Alice"
      }
    ];
    const mockDb = new MockDb([], [], {
      allResponses: [rows]
    });

    const result = await listOrgMembers(mockDb as unknown as D1Database, {
      orgId: "org_1"
    });

    expect(result).toEqual([
      {
        membership: {
          created_at: "2026-03-07T10:00:00.000Z",
          org_id: "org_1",
          role: "ADMIN",
          user_id: "user_1"
        },
        user: {
          avatar_url: "https://avatars.example/alice.png",
          created_at: "2026-03-07T09:00:00.000Z",
          email: "alice@example.com",
          github_id: 42,
          id: "user_1",
          name: "Alice"
        }
      }
    ]);
  });

  it("adds and updates org members in sequentially consistent batches", async () => {
    const memberRow = {
      membership_created_at: "2026-03-07T10:00:00.000Z",
      org_id: "org_1",
      role: "ADMIN" as const,
      user_avatar_url: "https://avatars.example/alice.png",
      user_created_at: "2026-03-07T09:00:00.000Z",
      user_email: "alice@example.com",
      user_github_id: 42,
      user_id: "user_1",
      user_name: "Alice"
    };
    const mockDb = new MockDb([
      [createResult([]), createResult([memberRow])],
      [createResult([]), createResult([{ ...memberRow, role: "MEMBER" }])]
    ]);

    const created = await addOrgMember(mockDb as unknown as D1Database, {
      orgId: "org_1",
      role: "ADMIN",
      userId: "user_1"
    });
    const updated = await updateOrgMemberRole(mockDb as unknown as D1Database, {
      orgId: "org_1",
      role: "MEMBER",
      userId: "user_1"
    });

    expect(created.membership.role).toBe("ADMIN");
    expect(updated.membership.role).toBe("MEMBER");
    expect(mockDb.sessionConstraints).toEqual([
      "first-primary",
      "first-primary"
    ]);
  });

  it("counts org members by role and deletes memberships", async () => {
    const mockDb = new MockDb([], [{ total: 2 }], {
      runResponses: [createResult([])]
    });

    const totalOwners = await countOrgMembersByRole(
      mockDb as unknown as D1Database,
      {
        orgId: "org_1",
        role: "OWNER"
      }
    );

    await removeOrgMember(mockDb as unknown as D1Database, {
      orgId: "org_1",
      userId: "user_1"
    });

    expect(totalOwners).toBe(2);
    expect(mockDb.prepareCalls[1]?.boundValues).toEqual(["org_1", "user_1"]);
  });

  it("resolves project access with the project, org, and caller role", async () => {
    const row = {
      membership_created_at: "2026-03-07T10:00:00.000Z",
      org_created_at: "2026-03-07T09:00:00.000Z",
      org_id: "org_1",
      org_name: "Acme",
      org_slug: "acme",
      project_created_at: "2026-03-07T11:00:00.000Z",
      project_description: "Core app",
      project_id: "project_1",
      project_name: "PromptOps",
      project_slug: "promptops",
      role: "MEMBER" as const,
      user_id: "user_1"
    };
    const mockDb = new MockDb([], [row]);

    const result = await getProjectAccess(mockDb as unknown as D1Database, {
      projectId: "project_1",
      userId: "user_1"
    });

    expect(result).toEqual({
      membership: {
        created_at: row.membership_created_at,
        org_id: row.org_id,
        role: row.role,
        user_id: row.user_id
      },
      org: {
        created_at: row.org_created_at,
        id: row.org_id,
        name: row.org_name,
        slug: row.org_slug
      },
      project: {
        created_at: row.project_created_at,
        description: row.project_description,
        id: row.project_id,
        name: row.project_name,
        org_id: row.org_id,
        slug: row.project_slug
      }
    });
    expect(mockDb.prepareCalls[0]?.boundValues).toEqual([
      "project_1",
      "user_1"
    ]);
  });

  it("loads org-scoped project lookups and lists org projects", async () => {
    const project = {
      created_at: "2026-03-07T11:00:00.000Z",
      description: "Core app",
      id: "project_1",
      name: "PromptOps",
      org_id: "org_1",
      slug: "promptops"
    };
    const mockDb = new MockDb([[]], [project], {
      allResponses: [[project]]
    });

    const bySlug = await getProjectByOrgAndSlug(
      mockDb as unknown as D1Database,
      {
        orgId: "org_1",
        slug: "promptops"
      }
    );
    const listed = await listOrgProjects(mockDb as unknown as D1Database, {
      orgId: "org_1"
    });

    expect(bySlug).toEqual(project);
    expect(listed).toEqual([project]);
  });

  it("updates projects and lists audit events with parsed metadata", async () => {
    const updatedProject = {
      created_at: "2026-03-07T11:00:00.000Z",
      description: "Renamed",
      id: "project_1",
      name: "PromptOps 2",
      org_id: "org_1",
      slug: "promptops"
    };
    const mockDb = new MockDb(
      [[createResult([]), createResult([updatedProject])]],
      [{ total: 1 }],
      {
        allResponses: [
          [
            {
              action: "project.updated",
              actor_user_id: "user_1",
              created_at: "2026-03-07T12:00:00.000Z",
              entity_id: "project_1",
              entity_type: "project",
              id: "audit_1",
              metadata: '{"name":"PromptOps 2"}',
              org_id: "org_1"
            }
          ]
        ]
      }
    );

    const project = await updateProject(mockDb as unknown as D1Database, {
      description: "Renamed",
      name: "PromptOps 2",
      projectId: "project_1"
    });
    const auditPage = await listOrgAuditEvents(
      mockDb as unknown as D1Database,
      {
        limit: 50,
        orgId: "org_1",
        page: 1
      }
    );

    expect(project).toEqual(updatedProject);
    expect(auditPage).toEqual({
      events: [
        {
          action: "project.updated",
          actor_user_id: "user_1",
          created_at: "2026-03-07T12:00:00.000Z",
          entity_id: "project_1",
          entity_type: "project",
          id: "audit_1",
          metadata: {
            name: "PromptOps 2"
          },
          org_id: "org_1"
        }
      ],
      total: 1
    });
  });
});
