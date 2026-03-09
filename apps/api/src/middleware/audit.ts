import type { Context, MiddlewareHandler } from "hono";
import { createUlid } from "../lib/ulid";
import {
  appendAuditEvent,
  clearAuditEvents,
  getRequestContext
} from "../lib/request-context";
import type { AppEnv, PendingAuditEvent } from "../types";

export function queueAuditEvent(c: Context<AppEnv>, auditEvent: PendingAuditEvent) {
  appendAuditEvent(c, auditEvent);
}

export const auditMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();

  const db = c.env?.DB;

  if (c.res.status >= 400 || !db) {
    return;
  }

  const requestContext = getRequestContext(c);

  if (requestContext.auditEvents.length === 0) {
    return;
  }

  const statements = requestContext.auditEvents.map((auditEvent) => {
    const orgId = auditEvent.orgId ?? requestContext.org?.id ?? requestContext.project?.orgId;
    const actorUserId =
      auditEvent.actorUserId ??
      (requestContext.identity.kind === "session"
        ? requestContext.identity.userId
        : null);

    return db.prepare(
      `
        INSERT INTO audit_events (
          id,
          org_id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    ).bind(
      createUlid(),
      orgId ?? null,
      actorUserId,
      auditEvent.action,
      auditEvent.entityType,
      auditEvent.entityId,
      auditEvent.metadata === undefined ? null : JSON.stringify(auditEvent.metadata)
    );
  });

  await db.batch(statements);
  clearAuditEvents(c);
};
