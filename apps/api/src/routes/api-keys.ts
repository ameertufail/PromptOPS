import {
  API_BASE_PATH,
  apiKeyIdParamsSchema,
  apiKeySchema,
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  listApiKeysResponseSchema,
  projectIdParamsSchema,
  revokeApiKeyResponseSchema,
  type ApiKey
} from "@promptops/shared";
import { Hono } from "hono";
import {
  createApiKey,
  getApiKeyById,
  listApiKeysByProject,
  revokeApiKey,
  type DbApiKey
} from "../db/api-key-queries";
import { getProjectAccess } from "../db/queries";
import { AuthorizationError, NotFoundError } from "../lib/errors";
import { getRequestContext } from "../lib/request-context";
import {
  parseJsonRequestBody,
  parseRequestParams,
  validateRequestParams
} from "../lib/requests";
import { queueAuditEvent } from "../middleware/audit";
import {
  requireDatabaseBinding,
  requireSessionIdentity
} from "../middleware/auth";
import { requireMinimumRole, resolveProjectAccess } from "../middleware/rbac";
import type { AppEnv } from "../types";

export const apiKeyRoutes = new Hono<AppEnv>();

function toSharedApiKey(key: DbApiKey): ApiKey {
  return apiKeySchema.parse({
    createdAt: key.created_at,
    createdBy: key.created_by,
    id: key.id,
    keyPrefix: key.key_prefix,
    lastUsedAt: key.last_used_at,
    name: key.name,
    projectId: key.project_id
  });
}

// ── Create API Key ──────────────────────────────────────────────────────

apiKeyRoutes.post(
  `${API_BASE_PATH}/projects/:projectId/api-keys`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      createApiKeyRequestSchema,
      "API key creation payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const requestContext = getRequestContext(c);
    const createdBy =
      requestContext.identity.kind === "session"
        ? requestContext.identity.userId
        : null;

    const { apiKey, plaintextKey } = await createApiKey(db, {
      createdBy,
      name: body.name,
      projectId
    });

    queueAuditEvent(c, {
      action: "api_key.created",
      entityId: apiKey.id,
      entityType: "api_key",
      metadata: { keyPrefix: apiKey.key_prefix, name: body.name }
    });

    return c.json(
      createApiKeyResponseSchema.parse({
        apiKey: toSharedApiKey(apiKey),
        plaintextKey
      }),
      201
    );
  }
);

// ── List API Keys ───────────────────────────────────────────────────────

apiKeyRoutes.get(
  `${API_BASE_PATH}/projects/:projectId/api-keys`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const db = requireDatabaseBinding(c);

    const keys = await listApiKeysByProject(db, { projectId });

    return c.json(
      listApiKeysResponseSchema.parse({
        apiKeys: keys.map(toSharedApiKey)
      })
    );
  }
);

// ── Revoke API Key ──────────────────────────────────────────────────────

apiKeyRoutes.delete(
  `${API_BASE_PATH}/api-keys/:keyId`,
  requireSessionIdentity(),
  async (c) => {
    const { keyId } = parseRequestParams(
      c,
      apiKeyIdParamsSchema,
      "API key path validation failed."
    );
    const db = requireDatabaseBinding(c);

    const existingKey = await getApiKeyById(db, { keyId });

    if (!existingKey) {
      throw new NotFoundError("API key not found.");
    }

    const requestContext = getRequestContext(c);
    const userId =
      requestContext.identity.kind === "session"
        ? requestContext.identity.userId
        : "";

    const access = await getProjectAccess(db, {
      projectId: existingKey.project_id,
      userId
    });

    if (!access) {
      throw new NotFoundError("API key not found.");
    }

    const roleRank: Record<string, number> = {
      ADMIN: 3,
      MEMBER: 2,
      OWNER: 4,
      VIEWER: 1
    };

    if ((roleRank[access.membership.role] ?? 0) < roleRank.ADMIN) {
      throw new AuthorizationError(
        "You do not have permission to revoke API keys."
      );
    }

    await revokeApiKey(db, { keyId });

    queueAuditEvent(c, {
      action: "api_key.revoked",
      entityId: keyId,
      entityType: "api_key",
      metadata: { keyPrefix: existingKey.key_prefix, name: existingKey.name }
    });

    return c.json(
      revokeApiKeyResponseSchema.parse({
        keyId,
        success: true
      })
    );
  }
);
