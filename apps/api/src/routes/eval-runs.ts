import {
  API_BASE_PATH,
  DEFAULT_PAGE_SIZE,
  createEvalRunItemRequestSchema,
  createEvalRunItemResponseSchema,
  createEvalRunRequestSchema,
  createEvalRunResponseSchema,
  completeEvalRunRequestSchema,
  completeEvalRunResponseSchema,
  datasetItemSchema,
  datasetSchema,
  evalConfigSchema,
  evalRunDetailsResponseSchema,
  evalRunIdParamsSchema,
  evalRunItemSchema,
  evalRunItemsQuerySchema,
  evalRunItemsResponseSchema,
  evalRunSchema,
  listProjectEvalRunsQuerySchema,
  listProjectEvalRunsResponseSchema,
  projectIdParamsSchema,
  promptVersionSchema,
  type DatasetItem,
  type EvalConfig,
  type EvalRun,
  type EvalRunItem,
  type PromptVersion
} from "@promptops/shared";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { getAllDatasetItems, getDatasetById } from "../db/dataset-queries";
import type { DbDatasetItem } from "../db/dataset-queries";
import { getEvalConfigById } from "../db/eval-config-queries";
import type { DbEvalConfig } from "../db/eval-config-queries";
import {
  completeEvalRun,
  createEvalRun,
  createEvalRunItem,
  getAllEvalRunItems,
  getEvalRunById,
  getEvalRunItemByDatasetItem,
  listEvalRunItems,
  listProjectEvalRuns,
  type DbEvalRun,
  type DbEvalRunItem
} from "../db/eval-run-queries";
import {
  getPromptVersionById,
  type DbPromptVersion
} from "../db/prompt-queries";
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
  parseRequestQuery,
  validateRequestParams
} from "../lib/requests";
import { queueAuditEvent } from "../middleware/audit";
import {
  requireDatabaseBinding,
  requireRouteParam,
  requireSessionIdentity
} from "../middleware/auth";
import { requireMinimumRole, resolveProjectAccess } from "../middleware/rbac";
import { computeEvalRunSummary } from "../services/eval-summary";
import type { AppEnv } from "../types";

export const evalRunRoutes = new Hono<AppEnv>();

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ── Shared Helpers ──────────────────────────────────────────────────────

function toSharedEvalRun(run: DbEvalRun): EvalRun {
  return evalRunSchema.parse({
    baseVersionId: run.base_version_id,
    candidateVersionId: run.candidate_version_id,
    createdAt: run.created_at,
    createdBy: run.created_by,
    errorMessage: run.error_message,
    evalConfigId: run.eval_config_id,
    finishedAt: run.finished_at,
    id: run.id,
    progressCurrent: run.progress_current,
    progressTotal: run.progress_total,
    status: run.status,
    summary: safeJsonParse(run.summary)
  });
}

function toSharedEvalRunItem(item: DbEvalRunItem): EvalRunItem {
  return evalRunItemSchema.parse({
    baseMetrics: safeJsonParse(item.base_metrics),
    baseOutput: item.base_output,
    candidateMetrics: safeJsonParse(item.candidate_metrics),
    candidateOutput: item.candidate_output,
    createdAt: item.created_at,
    datasetItemId: item.dataset_item_id,
    delta: safeJsonParse(item.delta),
    evalRunId: item.eval_run_id,
    id: item.id,
    verdict: item.verdict
  });
}

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

function toSharedPromptVersion(v: DbPromptVersion): PromptVersion {
  return promptVersionSchema.parse({
    content: v.content,
    createdAt: v.created_at,
    createdBy: v.created_by,
    id: v.id,
    modelConfig: safeJsonParse(v.model_config),
    promptId: v.prompt_id,
    status: v.status,
    variablesSchema: safeJsonParse(v.variables_schema),
    versionNumber: v.version_number
  });
}

function toSharedDatasetItem(item: DbDatasetItem): DatasetItem {
  return datasetItemSchema.parse({
    createdAt: item.created_at,
    datasetId: item.dataset_id,
    expectedOutput: item.expected_output,
    id: item.id,
    input: item.input,
    rubric: item.rubric,
    sortOrder: item.sort_order,
    tags: safeJsonParse(item.tags) ?? []
  });
}

function resolveEvalRunAccess() {
  return (async (c, next) => {
    await requireSessionIdentity()(c, async () => {
      const runId = requireRouteParam("runId", c.req.param("runId"));
      const db = requireDatabaseBinding(c);
      const run = await getEvalRunById(db, { runId });

      if (!run) {
        throw new NotFoundError("Eval run not found.");
      }

      const config = await getEvalConfigById(db, {
        configId: run.eval_config_id
      });

      if (!config) {
        throw new NotFoundError("Eval config for this run not found.");
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
          "You do not have access to this eval run."
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

// ── Create Eval Run ─────────────────────────────────────────────────────

evalRunRoutes.post(
  `${API_BASE_PATH}/eval-runs`,
  requireSessionIdentity(),
  async (c) => {
    const body = await parseJsonRequestBody(
      c,
      createEvalRunRequestSchema,
      "Eval run payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const requestContext = getRequestContext(c);
    const createdBy =
      requestContext.identity.kind === "session"
        ? requestContext.identity.userId
        : null;

    // Validate eval config exists
    const config = await getEvalConfigById(db, {
      configId: body.evalConfigId
    });

    if (!config) {
      throw new NotFoundError("Eval config not found.");
    }

    // Validate project access
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
        "You do not have access to this eval config's project."
      );
    }

    // Set resolved context for standard RBAC checks
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

    // Check minimum role (MEMBER) using the standard middleware helper
    await requireMinimumRole("MEMBER")(c, async () => {});

    // Validate both prompt versions exist
    const [baseVersion, candidateVersion] = await Promise.all([
      getPromptVersionById(db, { versionId: body.baseVersionId }),
      getPromptVersionById(db, { versionId: body.candidateVersionId })
    ]);

    if (!baseVersion) {
      throw new NotFoundError("Base prompt version not found.");
    }
    if (!candidateVersion) {
      throw new NotFoundError("Candidate prompt version not found.");
    }

    // Load dataset and items
    const dataset = await getDatasetById(db, {
      datasetId: config.dataset_id
    });

    if (!dataset) {
      throw new NotFoundError("Dataset referenced by eval config not found.");
    }

    const datasetItems = await getAllDatasetItems(db, {
      datasetId: config.dataset_id
    });

    if (datasetItems.length === 0) {
      throw new ValidationError(
        "Dataset has no items. Add items before running an eval."
      );
    }

    // Create the run record
    const run = await createEvalRun(db, {
      baseVersionId: body.baseVersionId,
      candidateVersionId: body.candidateVersionId,
      createdBy,
      evalConfigId: body.evalConfigId,
      progressTotal: datasetItems.length
    });

    // Audit
    queueAuditEvent(c, {
      action: "eval_run.started",
      entityId: run.id,
      entityType: "eval_run",
      metadata: {
        baseVersionId: body.baseVersionId,
        candidateVersionId: body.candidateVersionId,
        evalConfigId: body.evalConfigId,
        totalItems: datasetItems.length
      }
    });

    return c.json(
      createEvalRunResponseSchema.parse({
        run: toSharedEvalRun(run),
        config: toSharedEvalConfig(config),
        baseVersion: toSharedPromptVersion(baseVersion),
        candidateVersion: toSharedPromptVersion(candidateVersion),
        dataset: datasetSchema.parse({
          createdAt: dataset.created_at,
          createdBy: dataset.created_by,
          description: dataset.description,
          id: dataset.id,
          itemCount: dataset.item_count,
          name: dataset.name,
          projectId: dataset.project_id,
          type: dataset.type
        }),
        items: datasetItems.map(toSharedDatasetItem)
      }),
      201
    );
  }
);

// ── Get Eval Run Detail ─────────────────────────────────────────────────

evalRunRoutes.get(
  `${API_BASE_PATH}/eval-runs/:runId`,
  validateRequestParams(evalRunIdParamsSchema),
  resolveEvalRunAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { runId } = parseRequestParams(
      c,
      evalRunIdParamsSchema,
      "Eval run path validation failed."
    );
    const db = requireDatabaseBinding(c);
    const run = await getEvalRunById(db, { runId });

    if (!run) {
      throw new NotFoundError("Eval run not found.");
    }

    return c.json(
      evalRunDetailsResponseSchema.parse({
        run: toSharedEvalRun(run)
      })
    );
  }
);

// ── List Eval Run Items ─────────────────────────────────────────────────

evalRunRoutes.get(
  `${API_BASE_PATH}/eval-runs/:runId/items`,
  validateRequestParams(evalRunIdParamsSchema),
  resolveEvalRunAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { runId } = parseRequestParams(
      c,
      evalRunIdParamsSchema,
      "Eval run path validation failed."
    );
    const query = parseRequestQuery(
      c,
      evalRunItemsQuerySchema,
      "Eval run items query validation failed."
    );
    const db = requireDatabaseBinding(c);
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const page = query.page ?? 1;

    const { items, total } = await listEvalRunItems(db, {
      evalRunId: runId,
      verdict: query.verdict,
      limit,
      page
    });

    return c.json(
      evalRunItemsResponseSchema.parse({
        items: items.map(toSharedEvalRunItem),
        limit,
        page,
        total
      })
    );
  }
);

// ── Create Eval Run Item (idempotent) ───────────────────────────────────

evalRunRoutes.post(
  `${API_BASE_PATH}/eval-runs/:runId/items`,
  validateRequestParams(evalRunIdParamsSchema),
  resolveEvalRunAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { runId } = parseRequestParams(
      c,
      evalRunIdParamsSchema,
      "Eval run path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      createEvalRunItemRequestSchema,
      "Eval run item payload validation failed."
    );
    const db = requireDatabaseBinding(c);

    const run = await getEvalRunById(db, { runId });

    if (!run) {
      throw new NotFoundError("Eval run not found.");
    }

    if (run.status !== "RUNNING") {
      throw new ValidationError(
        `Cannot add items to a run with status ${run.status}.`
      );
    }

    // Idempotency: if this dataset item already has a result, return it
    const existing = await getEvalRunItemByDatasetItem(db, {
      evalRunId: runId,
      datasetItemId: body.datasetItemId
    });

    if (existing) {
      const updatedRun = await getEvalRunById(db, { runId });
      return c.json(
        createEvalRunItemResponseSchema.parse({
          item: toSharedEvalRunItem(existing),
          progress: {
            current: updatedRun?.progress_current ?? 0,
            total: updatedRun?.progress_total ?? 0
          }
        })
      );
    }

    const { item, progress } = await createEvalRunItem(db, {
      baseMetrics: body.baseMetrics ? JSON.stringify(body.baseMetrics) : null,
      baseOutput: body.baseOutput ?? null,
      candidateMetrics: body.candidateMetrics
        ? JSON.stringify(body.candidateMetrics)
        : null,
      candidateOutput: body.candidateOutput ?? null,
      delta: body.delta ? JSON.stringify(body.delta) : null,
      datasetItemId: body.datasetItemId,
      evalRunId: runId,
      verdict: body.verdict
    });

    return c.json(
      createEvalRunItemResponseSchema.parse({
        item: toSharedEvalRunItem(item),
        progress
      }),
      201
    );
  }
);

// ── Complete Eval Run ───────────────────────────────────────────────────

evalRunRoutes.patch(
  `${API_BASE_PATH}/eval-runs/:runId/complete`,
  validateRequestParams(evalRunIdParamsSchema),
  resolveEvalRunAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { runId } = parseRequestParams(
      c,
      evalRunIdParamsSchema,
      "Eval run path validation failed."
    );
    // Parse body (empty object) to validate format
    await parseJsonRequestBody(
      c,
      completeEvalRunRequestSchema,
      "Complete eval run payload validation failed."
    );
    const db = requireDatabaseBinding(c);

    const run = await getEvalRunById(db, { runId });

    if (!run) {
      throw new NotFoundError("Eval run not found.");
    }

    if (run.status !== "RUNNING") {
      throw new ValidationError(
        `Cannot complete a run with status ${run.status}.`
      );
    }

    // Compute summary from all items
    const items = await getAllEvalRunItems(db, { evalRunId: runId });
    const summary = computeEvalRunSummary(items);

    const completedRun = await completeEvalRun(db, {
      runId,
      summary: JSON.stringify(summary),
      status: "COMPLETED"
    });

    // Audit
    queueAuditEvent(c, {
      action: "eval_run.completed",
      entityId: completedRun.id,
      entityType: "eval_run",
      metadata: {
        improved: summary.improved,
        regressed: summary.regressed,
        same: summary.same,
        totalItems: summary.totalItems
      }
    });

    return c.json(
      completeEvalRunResponseSchema.parse({
        run: toSharedEvalRun(completedRun)
      })
    );
  }
);

// ── List Project Eval Runs ──────────────────────────────────────────────

evalRunRoutes.get(
  `${API_BASE_PATH}/projects/:projectId/eval-runs`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const query = parseRequestQuery(
      c,
      listProjectEvalRunsQuerySchema,
      "Eval runs query validation failed."
    );
    const db = requireDatabaseBinding(c);
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const page = query.page ?? 1;

    const { runs, total } = await listProjectEvalRuns(db, {
      projectId,
      status: query.status,
      limit,
      page
    });

    return c.json(
      listProjectEvalRunsResponseSchema.parse({
        runs: runs.map(toSharedEvalRun),
        limit,
        page,
        total
      })
    );
  }
);
