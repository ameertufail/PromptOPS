import type { JsonValue, User, UserRole } from "@promptops/shared";

export type AppBindings = {
  BACKEND_URL?: string;
  DB?: D1Database;
  ENCRYPTION_KEY?: string;
  ENVIRONMENT?: string;
  FRONTEND_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  JWT_SECRET?: string;
  STORAGE?: R2Bucket;
};

export type AnonymousIdentity = {
  kind: "anonymous";
};

export type SessionIdentity = {
  kind: "session";
  userId: string;
};

export type ApiKeyIdentity = {
  apiKeyId: string;
  keyPrefix: string;
  kind: "api_key";
  projectId: string;
};

export type RequestIdentity =
  | AnonymousIdentity
  | ApiKeyIdentity
  | SessionIdentity;

export type RequestOrgContext = {
  id: string;
  role: UserRole;
  source: "membership";
};

export type RequestProjectContext = {
  id: string;
  orgId: string;
  role?: UserRole;
  source: "api_key" | "membership";
};

export type PendingAuditEvent = {
  action: string;
  actorUserId?: string | null;
  entityId: string;
  entityType: string;
  metadata?: JsonValue;
  orgId?: string;
};

export type RequestContext = {
  auditEvents: PendingAuditEvent[];
  identity: RequestIdentity;
  org?: RequestOrgContext;
  project?: RequestProjectContext;
  requestId: string;
  sessionExpiresAt?: string;
  user?: User;
};

export type AppVariables = {
  requestContext: RequestContext;
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
