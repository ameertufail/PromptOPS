import type { MiddlewareHandler } from "hono";
import type { UserRole } from "@promptops/shared";
import {
  getOrgMembership,
  getProjectAccess,
  getProjectById
} from "../db/queries";
import {
  AuthorizationError,
  InternalServerError,
  NotFoundError
} from "../lib/errors";
import {
  getRequestContext,
  setResolvedOrgContext,
  setResolvedProjectContext
} from "../lib/request-context";
import {
  requireDatabaseBinding,
  requireRouteParam,
  requireSessionIdentity
} from "./auth";
import type { AppEnv } from "../types";

const ROLE_RANK: Record<UserRole, number> = {
  ADMIN: 3,
  MEMBER: 2,
  OWNER: 4,
  VIEWER: 1
};

type OrgAccessOptions = {
  orgIdParam?: string;
};

type ProjectAccessOptions = {
  allowApiKey?: boolean;
  projectIdParam?: string;
};

export function resolveOrgAccess(options: OrgAccessOptions = {}) {
  return (async (c, next) => {
    await requireSessionIdentity()(c, async () => {
      const requestContext = getRequestContext(c);
      const orgId = requireRouteParam(
        options.orgIdParam ?? "orgId",
        c.req.param(options.orgIdParam ?? "orgId")
      );
      const membership = await getOrgMembership(requireDatabaseBinding(c), {
        orgId,
        userId:
          requestContext.identity.kind === "session"
            ? requestContext.identity.userId
            : ""
      });

      if (!membership) {
        throw new AuthorizationError(
          "You do not have access to this organization."
        );
      }

      setResolvedOrgContext(c, {
        id: membership.org.id,
        role: membership.membership.role,
        source: "membership"
      });

      await next();
    });
  }) satisfies MiddlewareHandler<AppEnv>;
}

export function resolveProjectAccess(options: ProjectAccessOptions = {}) {
  return (async (c, next) => {
    const requestContext = getRequestContext(c);
    const projectId = requireRouteParam(
      options.projectIdParam ?? "projectId",
      c.req.param(options.projectIdParam ?? "projectId")
    );
    const db = requireDatabaseBinding(c);

    if (requestContext.identity.kind === "api_key") {
      if (!options.allowApiKey) {
        throw new AuthorizationError(
          "API key access is not allowed for this route."
        );
      }

      if (requestContext.identity.projectId !== projectId) {
        throw new AuthorizationError(
          "This API key does not grant access to the requested project."
        );
      }

      const project = await getProjectById(db, { projectId });

      if (!project) {
        throw new NotFoundError("Project not found.");
      }

      setResolvedProjectContext(c, {
        id: project.id,
        orgId: project.org_id,
        source: "api_key"
      });

      await next();

      return;
    }

    await requireSessionIdentity()(c, async () => {
      const sessionRequestContext = getRequestContext(c);
      const access = await getProjectAccess(db, {
        projectId,
        userId:
          sessionRequestContext.identity.kind === "session"
            ? sessionRequestContext.identity.userId
            : ""
      });

      if (!access) {
        throw new AuthorizationError("You do not have access to this project.");
      }

      setResolvedOrgContext(c, {
        id: access.org.id,
        role: access.membership.role,
        source: "membership"
      });
      setResolvedProjectContext(c, {
        id: access.project.id,
        orgId: access.project.org_id,
        role: access.membership.role,
        source: "membership"
      });

      await next();
    });
  }) satisfies MiddlewareHandler<AppEnv>;
}

export function requireMinimumRole(role: UserRole) {
  return (async (c, next) => {
    if (ROLE_RANK[getResolvedRole(c)] < ROLE_RANK[role]) {
      throw new AuthorizationError(
        "You do not have permission to perform this action."
      );
    }

    await next();
  }) satisfies MiddlewareHandler<AppEnv>;
}

export function getResolvedRole(c: Parameters<MiddlewareHandler<AppEnv>>[0]) {
  const requestContext = getRequestContext(c);
  const resolvedRole = requestContext.project?.role ?? requestContext.org?.role;

  if (!resolvedRole) {
    throw new InternalServerError(
      "RBAC role resolution must run before permission checks."
    );
  }

  return resolvedRole;
}

export function assertCanManageOrgMember(options: {
  actorRole: UserRole;
  nextRole?: UserRole;
  targetRole?: UserRole;
}) {
  if (ROLE_RANK[options.actorRole] < ROLE_RANK.ADMIN) {
    throw new AuthorizationError(
      "You do not have permission to manage organization members."
    );
  }

  if (
    options.actorRole !== "OWNER" &&
    (options.targetRole === "OWNER" || options.nextRole === "OWNER")
  ) {
    throw new AuthorizationError(
      "Only organization owners can assign or manage owner memberships."
    );
  }
}
