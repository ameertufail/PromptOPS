import {
  API_BASE_PATH,
  addOrgMemberRequestSchema,
  auditEventsQuerySchema,
  createOrgRequestSchema,
  createOrgResponseSchema,
  getOrgResponseSchema,
  listAuditEventsResponseSchema,
  listOrgsResponseSchema,
  orgIdParamsSchema,
  orgMemberParamsSchema,
  orgMemberResponseSchema,
  removeOrgMemberResponseSchema,
  updateOrgMemberRequestSchema,
  type OrgMemberSummary,
  type OrgMembershipSummary,
  type Org,
  type User
} from "@promptops/shared";
import { Hono } from "hono";
import {
  addOrgMember,
  countOrgMembersByRole,
  createOrgWithOwner,
  getOrgById,
  getOrgBySlug,
  getOrgMember,
  getUserByEmail,
  listOrgAuditEvents,
  listOrgMembers,
  listUserOrgMemberships,
  removeOrgMember,
  type DbOrg,
  type DbOrgMember,
  type DbUser,
  type OrgMemberRecord,
  type OrgMembershipRecord,
  updateOrgMemberRole
} from "../db/queries";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError
} from "../lib/errors";
import {
  parseJsonRequestBody,
  parseRequestParams,
  parseRequestQuery,
  validateRequestParams,
  validateRequestQuery
} from "../lib/requests";
import { getRequestContext } from "../lib/request-context";
import { queueAuditEvent } from "../middleware/audit";
import {
  requireSessionIdentity,
  requireDatabaseBinding
} from "../middleware/auth";
import {
  assertCanManageOrgMember,
  getResolvedRole,
  requireMinimumRole,
  resolveOrgAccess
} from "../middleware/rbac";
import type { AppEnv } from "../types";

export const orgRoutes = new Hono<AppEnv>();

function toSharedUser(user: DbUser): User {
  return {
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    email: user.email,
    githubId: user.github_id,
    id: user.id,
    name: user.name
  };
}

function toSharedOrg(org: DbOrg): Org {
  return {
    createdAt: org.created_at,
    id: org.id,
    name: org.name,
    slug: org.slug
  };
}

function toSharedOrgMembershipSummary(
  record: OrgMembershipRecord
): OrgMembershipSummary {
  return {
    joinedAt: record.membership.created_at,
    org: toSharedOrg(record.org),
    role: record.membership.role
  };
}

function toSharedOrgMemberSummary(record: OrgMemberRecord): OrgMemberSummary {
  return {
    joinedAt: record.membership.created_at,
    role: record.membership.role,
    user: toSharedUser(record.user)
  };
}

function toOwnerRoleCountConflict() {
  return new ConflictError("Organizations must retain at least one owner.");
}

async function assertOrgRetainsOwner(db: D1Database, membership: DbOrgMember) {
  if (membership.role !== "OWNER") {
    return;
  }

  const ownerCount = await countOrgMembersByRole(db, {
    orgId: membership.org_id,
    role: "OWNER"
  });

  if (ownerCount <= 1) {
    throw toOwnerRoleCountConflict();
  }
}

orgRoutes.post(`${API_BASE_PATH}/orgs`, requireSessionIdentity(), async (c) => {
  const requestContext = getRequestContext(c);
  const db = requireDatabaseBinding(c);
  const body = await parseJsonRequestBody(
    c,
    createOrgRequestSchema,
    "Organization payload validation failed."
  );

  if (requestContext.identity.kind !== "session") {
    throw new AuthorizationError("A dashboard session is required.");
  }

  const existingOrg = await getOrgBySlug(db, {
    slug: body.slug
  });

  if (existingOrg) {
    throw new ConflictError("An organization with this slug already exists.");
  }

  const created = await createOrgWithOwner(db, {
    name: body.name,
    ownerUserId: requestContext.identity.userId,
    slug: body.slug
  });

  queueAuditEvent(c, {
    action: "org.created",
    entityId: created.org.id,
    entityType: "org",
    metadata: {
      slug: created.org.slug
    },
    orgId: created.org.id
  });

  return c.json(
    createOrgResponseSchema.parse({
      membership: {
        createdAt: created.membership.created_at,
        orgId: created.membership.org_id,
        role: created.membership.role,
        userId: created.membership.user_id
      },
      org: toSharedOrg(created.org)
    }),
    201
  );
});

orgRoutes.get(`${API_BASE_PATH}/orgs`, requireSessionIdentity(), async (c) => {
  const requestContext = getRequestContext(c);

  if (requestContext.identity.kind !== "session") {
    throw new AuthorizationError("A dashboard session is required.");
  }

  const memberships = await listUserOrgMemberships(requireDatabaseBinding(c), {
    userId: requestContext.identity.userId
  });

  return c.json(
    listOrgsResponseSchema.parse({
      orgs: memberships.map(toSharedOrgMembershipSummary)
    })
  );
});

orgRoutes.get(
  `${API_BASE_PATH}/orgs/:orgId`,
  validateRequestParams(orgIdParamsSchema),
  resolveOrgAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { orgId } = parseRequestParams(
      c,
      orgIdParamsSchema,
      "Organization path validation failed."
    );
    const db = requireDatabaseBinding(c);
    const [org, members] = await Promise.all([
      getOrgById(db, {
        orgId
      }),
      listOrgMembers(db, {
        orgId
      })
    ]);

    if (!org) {
      throw new NotFoundError("Organization not found.");
    }

    return c.json(
      getOrgResponseSchema.parse({
        members: members.map(toSharedOrgMemberSummary),
        org: toSharedOrg(org)
      })
    );
  }
);

orgRoutes.post(
  `${API_BASE_PATH}/orgs/:orgId/members`,
  validateRequestParams(orgIdParamsSchema),
  resolveOrgAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { orgId } = parseRequestParams(
      c,
      orgIdParamsSchema,
      "Organization path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      addOrgMemberRequestSchema,
      "Organization member payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    assertCanManageOrgMember({
      actorRole: getResolvedRole(c),
      nextRole: body.role
    });

    const user = await getUserByEmail(db, {
      email: body.email
    });

    if (!user) {
      throw new NotFoundError(
        "The invited user must sign in before they can be added to this organization."
      );
    }

    const existingMembership = await getOrgMember(db, {
      orgId,
      userId: user.id
    });

    if (existingMembership) {
      throw new ConflictError(
        "This user is already a member of the organization."
      );
    }

    const member = await addOrgMember(db, {
      orgId,
      role: body.role,
      userId: user.id
    });

    queueAuditEvent(c, {
      action: "org_member.added",
      entityId: member.user.id,
      entityType: "org_member",
      metadata: {
        role: member.membership.role,
        userEmail: member.user.email
      }
    });

    return c.json(
      orgMemberResponseSchema.parse({
        member: toSharedOrgMemberSummary(member)
      }),
      201
    );
  }
);

orgRoutes.patch(
  `${API_BASE_PATH}/orgs/:orgId/members/:userId`,
  validateRequestParams(orgMemberParamsSchema),
  resolveOrgAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { orgId, userId } = parseRequestParams(
      c,
      orgMemberParamsSchema,
      "Organization member path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      updateOrgMemberRequestSchema,
      "Organization member payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const existingMembership = await getOrgMember(db, {
      orgId,
      userId
    });

    if (!existingMembership) {
      throw new NotFoundError("Organization member not found.");
    }

    assertCanManageOrgMember({
      actorRole: getResolvedRole(c),
      nextRole: body.role,
      targetRole: existingMembership.membership.role
    });

    if (
      existingMembership.membership.role === "OWNER" &&
      body.role !== "OWNER"
    ) {
      await assertOrgRetainsOwner(db, existingMembership.membership);
    }

    if (existingMembership.membership.role === body.role) {
      return c.json(
        orgMemberResponseSchema.parse({
          member: toSharedOrgMemberSummary(existingMembership)
        })
      );
    }

    const member = await updateOrgMemberRole(db, {
      orgId,
      role: body.role,
      userId
    });

    queueAuditEvent(c, {
      action: "org_member.updated",
      entityId: member.user.id,
      entityType: "org_member",
      metadata: {
        nextRole: member.membership.role,
        previousRole: existingMembership.membership.role,
        userEmail: member.user.email
      }
    });

    return c.json(
      orgMemberResponseSchema.parse({
        member: toSharedOrgMemberSummary(member)
      })
    );
  }
);

orgRoutes.delete(
  `${API_BASE_PATH}/orgs/:orgId/members/:userId`,
  validateRequestParams(orgMemberParamsSchema),
  resolveOrgAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { orgId, userId } = parseRequestParams(
      c,
      orgMemberParamsSchema,
      "Organization member path validation failed."
    );
    const db = requireDatabaseBinding(c);
    const existingMembership = await getOrgMember(db, {
      orgId,
      userId
    });

    if (!existingMembership) {
      throw new NotFoundError("Organization member not found.");
    }

    assertCanManageOrgMember({
      actorRole: getResolvedRole(c),
      targetRole: existingMembership.membership.role
    });
    await assertOrgRetainsOwner(db, existingMembership.membership);
    await removeOrgMember(db, {
      orgId,
      userId
    });

    queueAuditEvent(c, {
      action: "org_member.removed",
      entityId: existingMembership.user.id,
      entityType: "org_member",
      metadata: {
        previousRole: existingMembership.membership.role,
        userEmail: existingMembership.user.email
      }
    });

    return c.json(
      removeOrgMemberResponseSchema.parse({
        orgId,
        success: true,
        userId
      })
    );
  }
);

orgRoutes.get(
  `${API_BASE_PATH}/orgs/:orgId/audit-events`,
  validateRequestParams(orgIdParamsSchema),
  validateRequestQuery(auditEventsQuerySchema),
  resolveOrgAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { orgId } = parseRequestParams(
      c,
      orgIdParamsSchema,
      "Organization path validation failed."
    );
    const query = parseRequestQuery(
      c,
      auditEventsQuerySchema,
      "Audit events query validation failed."
    );
    const page = await listOrgAuditEvents(requireDatabaseBinding(c), {
      limit: query.limit ?? 50,
      orgId,
      page: query.page ?? 1
    });

    return c.json(
      listAuditEventsResponseSchema.parse({
        events: page.events.map((event) => ({
          action: event.action,
          actorUserId: event.actor_user_id,
          createdAt: event.created_at,
          entityId: event.entity_id,
          entityType: event.entity_type,
          id: event.id,
          metadata: event.metadata,
          orgId: event.org_id
        })),
        limit: query.limit ?? 50,
        page: query.page ?? 1,
        total: page.total
      })
    );
  }
);
