import {
  API_BASE_PATH,
  createEvalConfigRequestSchema,
  createEvalConfigResponseSchema,
  evalConfigDetailsResponseSchema,
  evalConfigIdParamsSchema,
  evalConfigSchema,
  listEvalConfigsResponseSchema,
  projectIdParamsSchema,
  updateEvalConfigRequestSchema,
  updateEvalConfigResponseSchema,
  type EvalConfig
} from "@promptops/shared";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { getDatasetById } from "../db/dataset-queries";
import {
  createEvalConfig,
  getEvalConfigById,
  hasEvalRunsForConfig,
  listProjectEvalConfigs,
  updateEvalConfig,
  type DbEvalConfig
} from "../db/eval-config-queries";
import { getProjectAccess } from "../db/queries";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError
} from "../lib/errors";
import {
  getRequestContext,
  setResolvedOrgContext,
  setResolvedProjectContext
} from "../lib/request-context";
import {
  parseJsonRequestBody,
  parseRequestParams,
  validateRequestParams
} from "../lib/requests";
import { queueAuditEvent } from "../middleware/audit";
import {
  requireDatabaseBinding,
  requireRouteParam,
  requireSessionIdentity
} from "../middleware/auth";
import { requireMinimumRole, resolveProjectAccess } from "../middleware/rbac";
import type { AppEnv } from "../types";

export const evalConfigRoutes = new Hono<AppEnv>();

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ── Shared Helpers ──────────────────────────────────────────────────────

function toSharedEvalConfig(config: DbEvalConfig): EvalConfig {
  return evalConfigSchema.parse({
    createdAt: config.created_at,
    createdBy: config.created_by,
    datasetId: config.dataset_id,
    id: config.id,
    name: config.name,
    projectId: config.project_id,
    rules: safeJsonParse(config.rules)
  });
}

function resolveEvalConfigAccess() {
  return (async (c, next) => {
    await requireSessionIdentity()(c, async () => {
      const configId = requireRouteParam("configId", c.req.param("configId"));
      const db = requireDatabaseBinding(c);
      const config = await getEvalConfigById(db, { configId });

      if (!config) {
        throw new NotFoundError("Eval config not found.");
      }

      const requestContext = getRequestContext(c);
      const userId =
        requestContext.identity.kind === "session"
          ? requestContext.identity.userId
          : "";
      const access = await getProjectAccess(db, {
        projectId: config.project_id,
        userId
      });

      if (!access) {
        throw new AuthorizationError(
          "You do not have access to this eval config."
        );
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

// ── Task 17.1: Eval Config CRUD ─────────────────────────────────────────

evalConfigRoutes.post(
  `${API_BASE_PATH}/projects/:projectId/eval-configs`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      createEvalConfigRequestSchema,
      "Eval config payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const requestContext = getRequestContext(c);
    const createdBy =
      requestContext.identity.kind === "session"
        ? requestContext.identity.userId
        : null;

    // Task 17.2: Validate that the referenced dataset exists in the same project
    const dataset = await getDatasetById(db, { datasetId: body.datasetId });

    if (!dataset) {
      throw new ValidationError("The referenced dataset does not exist.");
    }

    if (dataset.project_id !== projectId) {
      throw new ValidationError(
        "The referenced dataset does not belong to this project."
      );
    }

    const config = await createEvalConfig(db, {
      createdBy,
      datasetId: body.datasetId,
      name: body.name,
      projectId,
      rules: JSON.stringify(body.rules)
    });

    // Task 17.3: Audit event for config creation
    queueAuditEvent(c, {
      action: "eval_config.created",
      entityId: config.id,
      entityType: "eval_config",
      metadata: { datasetId: body.datasetId, name: body.name }
    });

    return c.json(
      createEvalConfigResponseSchema.parse({
        config: toSharedEvalConfig(config)
      }),
      201
    );
  }
);

evalConfigRoutes.get(
  `${API_BASE_PATH}/projects/:projectId/eval-configs`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const results = await listProjectEvalConfigs(requireDatabaseBinding(c), {
      projectId
    });

    return c.json(
      listEvalConfigsResponseSchema.parse({
        configs: results.map(toSharedEvalConfig)
      })
    );
  }
);

evalConfigRoutes.get(
  `${API_BASE_PATH}/eval-configs/:configId`,
  validateRequestParams(evalConfigIdParamsSchema),
  resolveEvalConfigAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { configId } = parseRequestParams(
      c,
      evalConfigIdParamsSchema,
      "Eval config path validation failed."
    );
    const db = requireDatabaseBinding(c);
    const config = await getEvalConfigById(db, { configId });

    if (!config) {
      throw new NotFoundError("Eval config not found.");
    }

    return c.json(
      evalConfigDetailsResponseSchema.parse({
        config: toSharedEvalConfig(config)
      })
    );
  }
);

// ── Task 17.2 + 17.3: Update with rules validation, compatibility checks, and audit ──

evalConfigRoutes.patch(
  `${API_BASE_PATH}/eval-configs/:configId`,
  validateRequestParams(evalConfigIdParamsSchema),
  resolveEvalConfigAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { configId } = parseRequestParams(
      c,
      evalConfigIdParamsSchema,
      "Eval config path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      updateEvalConfigRequestSchema,
      "Eval config update payload validation failed."
    );
    const db = requireDatabaseBinding(c);

    const existing = await getEvalConfigById(db, { configId });

    if (!existing) {
      throw new NotFoundError("Eval config not found.");
    }

    // Task 17.2: Validate dataset reference if being changed
    if (body.datasetId !== undefined) {
      const dataset = await getDatasetById(db, {
        datasetId: body.datasetId
      });

      if (!dataset) {
        throw new ValidationError("The referenced dataset does not exist.");
      }

      if (dataset.project_id !== existing.project_id) {
        throw new ValidationError(
          "The referenced dataset does not belong to this project."
        );
      }
    }

    // Task 17.3: Compatibility check — warn-level metadata when existing runs exist
    const hasRuns = await hasEvalRunsForConfig(db, { configId });
    const changedFields: string[] = [];

    if (body.name !== undefined) {
      changedFields.push("name");
    }

    if (body.datasetId !== undefined) {
      changedFields.push("datasetId");
    }

    if (body.rules !== undefined) {
      changedFields.push("rules");
    }

    const config = await updateEvalConfig(db, {
      configId,
      datasetId: body.datasetId,
      name: body.name,
      rules: body.rules ? JSON.stringify(body.rules) : undefined
    });

    if (!config) {
      throw new NotFoundError("Eval config not found after update.");
    }

    // Task 17.3: Audit event for config update with compatibility context
    queueAuditEvent(c, {
      action: "eval_config.updated",
      entityId: config.id,
      entityType: "eval_config",
      metadata: {
        changedFields,
        hasExistingRuns: hasRuns,
        name: config.name
      }
    });

    return c.json(
      updateEvalConfigResponseSchema.parse({
        config: toSharedEvalConfig(config)
      })
    );
  }
);
