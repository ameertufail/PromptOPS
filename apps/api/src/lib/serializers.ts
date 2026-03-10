import type {
  AuditEvent,
  Org,
  OrgMemberSummary,
  OrgMembership,
  OrgMembershipSummary,
  Project,
  User
} from "@promptops/shared";
import type {
  DbAuditEvent,
  DbOrg,
  DbOrgMember,
  DbProject,
  DbUser,
  OrgMemberRecord,
  OrgMembershipRecord
} from "../db/queries";

export function toUser(user: DbUser): User {
  return {
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    email: user.email,
    githubId: user.github_id,
    id: user.id,
    name: user.name
  };
}

export function toOrg(org: DbOrg): Org {
  return {
    createdAt: org.created_at,
    id: org.id,
    name: org.name,
    slug: org.slug
  };
}

export function toOrgMembership(membership: DbOrgMember): OrgMembership {
  return {
    createdAt: membership.created_at,
    orgId: membership.org_id,
    role: membership.role,
    userId: membership.user_id
  };
}

export function toOrgMembershipSummary(
  membership: OrgMembershipRecord
): OrgMembershipSummary {
  return {
    joinedAt: membership.membership.created_at,
    org: toOrg(membership.org),
    role: membership.membership.role
  };
}

export function toOrgMemberSummary(member: OrgMemberRecord): OrgMemberSummary {
  return {
    joinedAt: member.membership.created_at,
    role: member.membership.role,
    user: toUser(member.user)
  };
}

export function toProject(project: DbProject): Project {
  return {
    createdAt: project.created_at,
    description: project.description,
    id: project.id,
    name: project.name,
    orgId: project.org_id,
    slug: project.slug
  };
}

export function toAuditEvent(event: DbAuditEvent): AuditEvent {
  return {
    action: event.action,
    actorUserId: event.actor_user_id,
    createdAt: event.created_at,
    entityId: event.entity_id,
    entityType: event.entity_type,
    id: event.id,
    metadata: event.metadata,
    orgId: event.org_id
  };
}
