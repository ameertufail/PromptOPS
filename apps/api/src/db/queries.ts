import type { JsonObject, UserRole } from "@promptops/shared";
import { createUlid } from "../lib/ulid";

export type DbUser = {
  avatar_url: string | null;
  created_at: string;
  email: string;
  github_id: number;
  id: string;
  name: string;
};

export type DbOrg = {
  created_at: string;
  id: string;
  name: string;
  slug: string;
};

export type DbOrgMember = {
  created_at: string;
  org_id: string;
  role: UserRole;
  user_id: string;
};

export type DbProject = {
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  org_id: string;
  slug: string;
};

export type DbAuditEvent = {
  action: string;
  actor_user_id: string | null;
  created_at: string;
  entity_id: string;
  entity_type: string;
  id: string;
  metadata: JsonObject | null;
  org_id: string;
};

export type OrgMembershipRecord = {
  membership: DbOrgMember;
  org: DbOrg;
};

export type OrgMemberRecord = {
  membership: DbOrgMember;
  user: DbUser;
};

export type ProjectAccessRecord = {
  membership: DbOrgMember;
  org: DbOrg;
  project: DbProject;
};

export type AuditEventsPage = {
  events: DbAuditEvent[];
  total: number;
};

export type UpsertUserInput = {
  avatarUrl?: string | null;
  email: string;
  githubId: number;
  name: string;
};

export type CreateOrgWithOwnerInput = {
  name: string;
  ownerUserId: string;
  slug: string;
};

export type CreateProjectInput = {
  description?: string | null;
  name: string;
  orgId: string;
  slug: string;
};

type IdFactoryOptions = {
  createId?: () => string;
};

type OrgMembershipRow = {
  membership_created_at: string;
  org_created_at: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  role: UserRole;
  user_id: string;
};

type OrgMemberRow = {
  membership_created_at: string;
  org_id: string;
  role: UserRole;
  user_avatar_url: string | null;
  user_created_at: string;
  user_email: string;
  user_github_id: number;
  user_id: string;
  user_name: string;
};

type ProjectAccessRow = {
  membership_created_at: string;
  org_created_at: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  project_created_at: string;
  project_description: string | null;
  project_id: string;
  project_name: string;
  project_slug: string;
  role: UserRole;
  user_id: string;
};

type AuditEventRow = {
  action: string;
  actor_user_id: string | null;
  created_at: string;
  entity_id: string;
  entity_type: string;
  id: string;
  metadata: string | null;
  org_id: string;
};

function buildOrgMembershipRecord(row: OrgMembershipRow): OrgMembershipRecord {
  return {
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
  };
}

function buildOrgMemberRecord(row: OrgMemberRow): OrgMemberRecord {
  return {
    membership: {
      created_at: row.membership_created_at,
      org_id: row.org_id,
      role: row.role,
      user_id: row.user_id
    },
    user: {
      avatar_url: row.user_avatar_url,
      created_at: row.user_created_at,
      email: row.user_email,
      github_id: row.user_github_id,
      id: row.user_id,
      name: row.user_name
    }
  };
}

function buildProjectAccessRecord(row: ProjectAccessRow): ProjectAccessRecord {
  return {
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
  };
}

function parseAuditMetadata(metadata: string | null) {
  if (metadata === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
  } catch {
    return null;
  }

  return null;
}

function buildAuditEventRecord(row: AuditEventRow): DbAuditEvent {
  return {
    action: row.action,
    actor_user_id: row.actor_user_id,
    created_at: row.created_at,
    entity_id: row.entity_id,
    entity_type: row.entity_type,
    id: row.id,
    metadata: parseAuditMetadata(row.metadata),
    org_id: row.org_id
  };
}

function requireFirstResult<T>(result: D1Result<T>, message: string) {
  const row = result.results[0];

  if (!row) {
    throw new Error(message);
  }

  return row;
}

function getIdFactory(options?: IdFactoryOptions) {
  return options?.createId ?? createUlid;
}

export async function upsertUser(
  db: D1Database,
  input: UpsertUserInput,
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const session = db.withSession("first-primary");
  const [, selectResult] = await session.batch<DbUser>([
    session
      .prepare(
        `
          INSERT INTO users (id, github_id, email, name, avatar_url)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(github_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            avatar_url = excluded.avatar_url
        `
      )
      .bind(
        createId(),
        input.githubId,
        input.email,
        input.name,
        input.avatarUrl ?? null
      ),
    session
      .prepare(
        `
          SELECT id, github_id, email, name, avatar_url, created_at
          FROM users
          WHERE github_id = ?
          LIMIT 1
        `
      )
      .bind(input.githubId)
  ]);

  return requireFirstResult(
    selectResult,
    `Expected to load user ${input.githubId} after upsert.`
  );
}

export async function createOrgWithOwner(
  db: D1Database,
  input: CreateOrgWithOwnerInput,
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const orgId = createId();
  const session = db.withSession("first-primary");
  const [, , orgResult, membershipResult] = await session.batch<
    DbOrg | DbOrgMember
  >([
    session
      .prepare(
        `
          INSERT INTO orgs (id, name, slug)
          VALUES (?, ?, ?)
        `
      )
      .bind(orgId, input.name, input.slug),
    session
      .prepare(
        `
          INSERT INTO org_members (org_id, user_id, role)
          VALUES (?, ?, 'OWNER')
        `
      )
      .bind(orgId, input.ownerUserId),
    session
      .prepare(
        `
          SELECT id, name, slug, created_at
          FROM orgs
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(orgId),
    session
      .prepare(
        `
          SELECT org_id, user_id, role, created_at
          FROM org_members
          WHERE org_id = ? AND user_id = ?
          LIMIT 1
        `
      )
      .bind(orgId, input.ownerUserId)
  ]);

  return {
    membership: requireFirstResult(
      membershipResult as D1Result<DbOrgMember>,
      `Expected OWNER membership for org ${orgId}.`
    ),
    org: requireFirstResult(
      orgResult as D1Result<DbOrg>,
      `Expected to load org ${orgId} after creation.`
    )
  };
}

export async function createProject(
  db: D1Database,
  input: CreateProjectInput,
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const projectId = createId();
  const session = db.withSession("first-primary");
  const [, projectResult] = await session.batch<DbProject>([
    session
      .prepare(
        `
          INSERT INTO projects (id, org_id, name, slug, description)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .bind(
        projectId,
        input.orgId,
        input.name,
        input.slug,
        input.description ?? null
      ),
    session
      .prepare(
        `
          SELECT id, org_id, name, slug, description, created_at
          FROM projects
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(projectId)
  ]);

  return requireFirstResult(
    projectResult,
    `Expected to load project ${projectId} after creation.`
  );
}

export async function getOrgMembership(
  db: D1Database,
  input: { orgId: string; userId: string }
) {
  const row = await db
    .prepare(
      `
        SELECT
          o.id AS org_id,
          o.name AS org_name,
          o.slug AS org_slug,
          o.created_at AS org_created_at,
          om.user_id,
          om.role,
          om.created_at AS membership_created_at
        FROM org_members om
        INNER JOIN orgs o ON o.id = om.org_id
        WHERE om.org_id = ? AND om.user_id = ?
        LIMIT 1
      `
    )
    .bind(input.orgId, input.userId)
    .first<OrgMembershipRow>();

  return row ? buildOrgMembershipRecord(row) : null;
}

export async function listUserOrgMemberships(
  db: D1Database,
  input: { userId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT
          o.id AS org_id,
          o.name AS org_name,
          o.slug AS org_slug,
          o.created_at AS org_created_at,
          om.user_id,
          om.role,
          om.created_at AS membership_created_at
        FROM org_members om
        INNER JOIN orgs o ON o.id = om.org_id
        WHERE om.user_id = ?
        ORDER BY LOWER(o.name) ASC, o.created_at ASC
      `
    )
    .bind(input.userId)
    .all<OrgMembershipRow>();

  return result.results.map(buildOrgMembershipRecord);
}

export async function getOrgById(db: D1Database, input: { orgId: string }) {
  return db
    .prepare(
      `
        SELECT id, name, slug, created_at
        FROM orgs
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.orgId)
    .first<DbOrg>();
}

export async function getOrgBySlug(db: D1Database, input: { slug: string }) {
  return db
    .prepare(
      `
        SELECT id, name, slug, created_at
        FROM orgs
        WHERE slug = ?
        LIMIT 1
      `
    )
    .bind(input.slug)
    .first<DbOrg>();
}

export async function getUserByEmail(db: D1Database, input: { email: string }) {
  return db
    .prepare(
      `
        SELECT id, github_id, email, name, avatar_url, created_at
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `
    )
    .bind(input.email)
    .first<DbUser>();
}

export async function getUserById(db: D1Database, input: { userId: string }) {
  return db
    .prepare(
      `
        SELECT id, github_id, email, name, avatar_url, created_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.userId)
    .first<DbUser>();
}

export async function getOrgMember(
  db: D1Database,
  input: { orgId: string; userId: string }
) {
  const row = await db
    .prepare(
      `
        SELECT
          om.org_id,
          om.created_at AS membership_created_at,
          om.role,
          u.id AS user_id,
          u.github_id AS user_github_id,
          u.email AS user_email,
          u.name AS user_name,
          u.avatar_url AS user_avatar_url,
          u.created_at AS user_created_at
        FROM org_members om
        INNER JOIN users u ON u.id = om.user_id
        WHERE om.org_id = ? AND om.user_id = ?
        LIMIT 1
      `
    )
    .bind(input.orgId, input.userId)
    .first<OrgMemberRow>();

  if (!row) {
    return null;
  }

  const record = buildOrgMemberRecord(row);

  return record;
}

export async function listOrgMembers(db: D1Database, input: { orgId: string }) {
  const result = await db
    .prepare(
      `
        SELECT
          om.org_id,
          om.created_at AS membership_created_at,
          om.role,
          u.id AS user_id,
          u.github_id AS user_github_id,
          u.email AS user_email,
          u.name AS user_name,
          u.avatar_url AS user_avatar_url,
          u.created_at AS user_created_at
        FROM org_members om
        INNER JOIN users u ON u.id = om.user_id
        WHERE om.org_id = ?
        ORDER BY LOWER(u.name) ASC, LOWER(u.email) ASC
        LIMIT 200
      `
    )
    .bind(input.orgId)
    .all<OrgMemberRow>();

  return result.results.map(buildOrgMemberRecord);
}

export async function addOrgMember(
  db: D1Database,
  input: { orgId: string; role: UserRole; userId: string }
) {
  const session = db.withSession("first-primary");
  const [, memberResult] = await session.batch<OrgMemberRow>([
    session
      .prepare(
        `
          INSERT INTO org_members (org_id, user_id, role)
          VALUES (?, ?, ?)
        `
      )
      .bind(input.orgId, input.userId, input.role),
    session
      .prepare(
        `
        SELECT
            om.org_id,
            om.created_at AS membership_created_at,
            om.role,
            u.id AS user_id,
            u.github_id AS user_github_id,
            u.email AS user_email,
            u.name AS user_name,
            u.avatar_url AS user_avatar_url,
            u.created_at AS user_created_at
          FROM org_members om
          INNER JOIN users u ON u.id = om.user_id
          WHERE om.org_id = ? AND om.user_id = ?
          LIMIT 1
        `
      )
      .bind(input.orgId, input.userId)
  ]);

  const row = requireFirstResult(
    memberResult,
    `Expected to load member ${input.userId} in org ${input.orgId} after creation.`
  );

  return buildOrgMemberRecord(row);
}

export async function updateOrgMemberRole(
  db: D1Database,
  input: { orgId: string; role: UserRole; userId: string }
) {
  const session = db.withSession("first-primary");
  const [, memberResult] = await session.batch<OrgMemberRow>([
    session
      .prepare(
        `
          UPDATE org_members
          SET role = ?
          WHERE org_id = ? AND user_id = ?
        `
      )
      .bind(input.role, input.orgId, input.userId),
    session
      .prepare(
        `
        SELECT
            om.org_id,
            om.created_at AS membership_created_at,
            om.role,
            u.id AS user_id,
            u.github_id AS user_github_id,
            u.email AS user_email,
            u.name AS user_name,
            u.avatar_url AS user_avatar_url,
            u.created_at AS user_created_at
          FROM org_members om
          INNER JOIN users u ON u.id = om.user_id
          WHERE om.org_id = ? AND om.user_id = ?
          LIMIT 1
        `
      )
      .bind(input.orgId, input.userId)
  ]);

  const row = requireFirstResult(
    memberResult,
    `Expected to load member ${input.userId} in org ${input.orgId} after role update.`
  );

  return buildOrgMemberRecord(row);
}

export async function removeOrgMember(
  db: D1Database,
  input: { orgId: string; userId: string }
) {
  await db
    .prepare(
      `
        DELETE FROM org_members
        WHERE org_id = ? AND user_id = ?
      `
    )
    .bind(input.orgId, input.userId)
    .run();
}

export async function countOrgMembersByRole(
  db: D1Database,
  input: { orgId: string; role: UserRole }
) {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM org_members
        WHERE org_id = ? AND role = ?
      `
    )
    .bind(input.orgId, input.role)
    .first<{ total: number | string }>();

  return Number(row?.total ?? 0);
}

export async function getProjectById(
  db: D1Database,
  input: { projectId: string }
) {
  return db
    .prepare(
      `
        SELECT id, org_id, name, slug, description, created_at
        FROM projects
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.projectId)
    .first<DbProject>();
}

export async function getProjectByOrgAndSlug(
  db: D1Database,
  input: { orgId: string; slug: string }
) {
  return db
    .prepare(
      `
        SELECT id, org_id, name, slug, description, created_at
        FROM projects
        WHERE org_id = ? AND slug = ?
        LIMIT 1
      `
    )
    .bind(input.orgId, input.slug)
    .first<DbProject>();
}

export async function listOrgProjects(
  db: D1Database,
  input: { orgId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT id, org_id, name, slug, description, created_at
        FROM projects
        WHERE org_id = ?
        ORDER BY LOWER(name) ASC, created_at ASC
        LIMIT 200
      `
    )
    .bind(input.orgId)
    .all<DbProject>();

  return result.results;
}

export async function getProjectAccess(
  db: D1Database,
  input: { projectId: string; userId: string }
) {
  const row = await db
    .prepare(
      `
        SELECT
          p.id AS project_id,
          p.name AS project_name,
          p.slug AS project_slug,
          p.description AS project_description,
          p.created_at AS project_created_at,
          o.id AS org_id,
          o.name AS org_name,
          o.slug AS org_slug,
          o.created_at AS org_created_at,
          om.user_id,
          om.role,
          om.created_at AS membership_created_at
        FROM projects p
        INNER JOIN orgs o ON o.id = p.org_id
        INNER JOIN org_members om ON om.org_id = o.id
        WHERE p.id = ? AND om.user_id = ?
        LIMIT 1
      `
    )
    .bind(input.projectId, input.userId)
    .first<ProjectAccessRow>();

  return row ? buildProjectAccessRecord(row) : null;
}

export async function updateProject(
  db: D1Database,
  input: {
    description?: string | null;
    name?: string;
    projectId: string;
  }
) {
  const assignments: string[] = [];
  const values: Array<string | null> = [];

  if (input.name !== undefined) {
    assignments.push("name = ?");
    values.push(input.name);
  }

  if (input.description !== undefined) {
    assignments.push("description = ?");
    values.push(input.description);
  }

  if (assignments.length === 0) {
    throw new Error("Expected at least one project field to update.");
  }

  const session = db.withSession("first-primary");
  const [, projectResult] = await session.batch<DbProject>([
    session
      .prepare(
        `
          UPDATE projects
          SET ${assignments.join(", ")}
          WHERE id = ?
        `
      )
      .bind(...values, input.projectId),
    session
      .prepare(
        `
          SELECT id, org_id, name, slug, description, created_at
          FROM projects
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(input.projectId)
  ]);

  return requireFirstResult(
    projectResult,
    `Expected to load project ${input.projectId} after update.`
  );
}

export async function deleteProject(
  db: D1Database,
  input: { projectId: string }
) {
  await db
    .prepare(
      `
        DELETE FROM projects
        WHERE id = ?
      `
    )
    .bind(input.projectId)
    .run();
}

export async function listOrgAuditEvents(
  db: D1Database,
  input: { limit: number; orgId: string; page: number }
): Promise<AuditEventsPage> {
  const offset = (input.page - 1) * input.limit;
  const eventsResult = await db
    .prepare(
      `
        SELECT
          id,
          org_id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          metadata,
          created_at
        FROM audit_events
        WHERE org_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
      `
    )
    .bind(input.orgId, input.limit, offset)
    .all<AuditEventRow>();
  const totalResult = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM audit_events
        WHERE org_id = ?
      `
    )
    .bind(input.orgId)
    .first<{ total: number | string }>();

  return {
    events: eventsResult.results.map(buildAuditEventRecord),
    total: Number(totalResult?.total ?? 0)
  };
}
