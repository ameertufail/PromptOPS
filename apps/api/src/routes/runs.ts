import {
  API_RUNS_PATH,
  API_BASE_PATH,
  DEFAULT_PAGE_SIZE,
  createRunLogRequestSchema,
  createRunLogResponseSchema,
  listProjectRunsQuerySchema,
  listProjectRunsResponseSchema,
  projectIdParamsSchema,
  runSchema,
  runStatsQuerySchema,
  runStatsResponseSchema,
  type Run
} from "@promptops/shared";
import { Hono } from "hono";
import {
  createRun,
  listRunsByProject,
  getRunStats,
  type DbRun
} from "../db/run-queries";
import { getRequestContext } from "../lib/request-context";
import {
  parseJsonRequestBody,
  parseRequestParams,
  parseRequestQuery,
  validateRequestParams
} from "../lib/requests";
import {
  requireApiKeyIdentity,
  requireDatabaseBinding
} from "../middleware/auth";
import { createApiKeyRateLimitMiddleware } from "../middleware/rate-limit";
import { requireMinimumRole, resolveProjectAccess } from "../middleware/rbac";
import type { AppEnv } from "../types";

export const runRoutes = new Hono<AppEnv>();

function toSharedRun(run: DbRun): Run {
  return runSchema.parse({
    createdAt: run.created_at,
    id: run.id,
    input: JSON.parse(run.input),
    metrics: run.metrics ? JSON.parse(run.metrics) : null,
    output: run.output,
    projectId: run.project_id,
    promptVersionId: run.prompt_version_id,
    source: run.source
  });
}

// ── Log Run (SDK / API key auth) ────────────────────────────────────────

runRoutes.post(
  API_RUNS_PATH,
  requireApiKeyIdentity(),
  createApiKeyRateLimitMiddleware(),
  async (c) => {
    const body = await parseJsonRequestBody(
      c,
      createRunLogRequestSchema,
      "Run log payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const requestContext = getRequestContext(c);

    if (requestContext.identity.kind !== "api_key") {
      throw new Error("Expected API key identity.");
    }

    const { id } = await createRun(db, {
      input: JSON.stringify(body.input),
      metrics: body.metrics ? JSON.stringify(body.metrics) : null,
      output: body.output,
      projectId: requestContext.identity.projectId,
      promptVersionId: body.promptVersionId ?? null,
      source: "SDK"
    });

    return c.json(
      createRunLogResponseSchema.parse({
        id,
        status: "logged"
      }),
      201
    );
  }
);

// ── List Project Runs (session auth) ────────────────────────────────────

runRoutes.get(
  `${API_BASE_PATH}/projects/:projectId/runs`,
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
      listProjectRunsQuerySchema,
      "Runs query validation failed."
    );
    const db = requireDatabaseBinding(c);
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const page = query.page ?? 1;

    const { runs, total } = await listRunsByProject(db, {
      projectId,
      promptVersionId: query.promptVersionId,
      source: query.source,
      from: query.from,
      to: query.to,
      limit,
      page
    });

    return c.json(
      listProjectRunsResponseSchema.parse({
        runs: runs.map(toSharedRun),
        limit,
        page,
        total
      })
    );
  }
);

// ── Project Run Stats (session auth) ────────────────────────────────────

runRoutes.get(
  `${API_BASE_PATH}/projects/:projectId/runs/stats`,
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
      runStatsQuerySchema,
      "Run stats query validation failed."
    );
    const db = requireDatabaseBinding(c);

    const stats = await getRunStats(db, {
      projectId,
      promptVersionId: query.promptVersionId,
      source: query.source,
      from: query.from,
      to: query.to
    });

    return c.json(runStatsResponseSchema.parse(stats));
  }
);
