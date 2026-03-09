import type { Context } from "hono";
import type {
  AppEnv,
  PendingAuditEvent,
  RequestContext,
  RequestIdentity,
  RequestOrgContext,
  RequestProjectContext
} from "../types";
import type { User } from "@promptops/shared";

export function createRequestContext(requestId: string): RequestContext {
  return {
    auditEvents: [],
    identity: { kind: "anonymous" },
    requestId
  };
}

export function getRequestContext(c: Context<AppEnv>) {
  return c.get("requestContext");
}

export function maybeGetRequestContext(c: Context<AppEnv>) {
  try {
    return getRequestContext(c);
  } catch {
    return null;
  }
}

export function setRequestIdentity(
  c: Context<AppEnv>,
  identity: RequestIdentity
) {
  const requestContext = getRequestContext(c);

  c.set("requestContext", {
    ...requestContext,
    identity,
    org: identity.kind === "session" ? requestContext.org : undefined,
    project:
      identity.kind === "session" || identity.kind === "api_key"
        ? requestContext.project
        : undefined,
    sessionExpiresAt:
      identity.kind === "session" ? requestContext.sessionExpiresAt : undefined,
    user: identity.kind === "session" ? requestContext.user : undefined
  });
}

export function setResolvedOrgContext(
  c: Context<AppEnv>,
  org: RequestOrgContext | undefined
) {
  const requestContext = getRequestContext(c);

  c.set("requestContext", {
    ...requestContext,
    org
  });
}

export function setResolvedProjectContext(
  c: Context<AppEnv>,
  project: RequestProjectContext | undefined
) {
  const requestContext = getRequestContext(c);

  c.set("requestContext", {
    ...requestContext,
    project
  });
}

export function appendAuditEvent(
  c: Context<AppEnv>,
  auditEvent: PendingAuditEvent
) {
  const requestContext = getRequestContext(c);

  c.set("requestContext", {
    ...requestContext,
    auditEvents: [...requestContext.auditEvents, auditEvent]
  });
}

export function clearAuditEvents(c: Context<AppEnv>) {
  const requestContext = getRequestContext(c);

  c.set("requestContext", {
    ...requestContext,
    auditEvents: []
  });
}

export function setAuthenticatedUser(
  c: Context<AppEnv>,
  user: User,
  sessionExpiresAt: string
) {
  const requestContext = getRequestContext(c);

  c.set("requestContext", {
    ...requestContext,
    sessionExpiresAt,
    user
  });
}

export function clearAuthenticatedUser(c: Context<AppEnv>) {
  const requestContext = getRequestContext(c);

  c.set("requestContext", {
    ...requestContext,
    sessionExpiresAt: undefined,
    user: undefined
  });
}
