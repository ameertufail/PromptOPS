import { type UserRole } from "@promptops/shared";
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

export type OrgMembershipRecord = {
  membership: DbOrgMember;
  org: DbOrg;
};

export type ProjectAccessRecord = {
  membership: DbOrgMember;
  org: DbOrg;
  project: DbProject;
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

function buildProjectAccessRecord(
  row: ProjectAccessRow
): ProjectAccessRecord {
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

export async function getUserById(
  db: D1Database,
  input: { userId: string }
) {
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
