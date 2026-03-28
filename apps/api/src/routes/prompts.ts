import {
  API_BASE_PATH,
  createPromptRequestSchema,
  createPromptResponseSchema,
  createPromptVersionRequestSchema,
  createPromptVersionResponseSchema,
  listPromptsResponseSchema,
  promptDetailsResponseSchema,
  promptDiffQuerySchema,
  promptDiffResponseSchema,
  promptIdParamsSchema,
  promptSchema,
  promptVersionDetailsResponseSchema,
  promptVersionIdParamsSchema,
  promptVersionSchema,
  promptVersionStateResponseSchema,
  projectIdParamsSchema,
  type Prompt,
  type PromptVersion
} from "@promptops/shared";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import {
  archivePromptVersion as archiveVersion,
  createPrompt,
  createPromptVersion,
  getPromptById,
  getPromptVersionById,
  getPromptVersionPair,
  getVersionProjectId,
  listProjectPrompts,
  listPromptVersions,
  releasePromptVersion as releaseVersion,
  type DbPrompt,
  type DbPromptVersion
} from "../db/prompt-queries";
import { getProjectAccess } from "../db/queries";
import { computeLineDiff } from "../lib/diff";
import {
  AuthorizationError,
  ConflictError,
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
import type { AppEnv } from "../types";

export const promptRoutes = new Hono<AppEnv>();

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toSharedPrompt(prompt: DbPrompt): Prompt {
  return promptSchema.parse({
    createdAt: prompt.created_at,
    createdBy: prompt.created_by,
    description: prompt.description,
    id: prompt.id,
    name: prompt.name,
    projectId: prompt.project_id
  });
}

function toSharedPromptVersion(version: DbPromptVersion): PromptVersion {
  return promptVersionSchema.parse({
    content: version.content,
    createdAt: version.created_at,
    createdBy: version.created_by,
    id: version.id,
    modelConfig: safeJsonParse(version.model_config),
    promptId: version.prompt_id,
    status: version.status,
    variablesSchema: safeJsonParse(version.variables_schema),
    versionNumber: version.version_number
  });
}

function resolvePromptAccess() {
  return (async (c, next) => {
    await requireSessionIdentity()(c, async () => {
      const promptId = requireRouteParam("promptId", c.req.param("promptId"));
      const db = requireDatabaseBinding(c);
      const prompt = await getPromptById(db, { promptId });

      if (!prompt) {
        throw new NotFoundError("Prompt not found.");
      }

      const requestContext = getRequestContext(c);
      const userId =
        requestContext.identity.kind === "session"
          ? requestContext.identity.userId
          : "";
      const access = await getProjectAccess(db, {
        projectId: prompt.project_id,
        userId
      });

      if (!access) {
        throw new AuthorizationError("You do not have access to this prompt.");
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

function resolveVersionAccess() {
  return (async (c, next) => {
    await requireSessionIdentity()(c, async () => {
      const versionId = requireRouteParam(
        "versionId",
        c.req.param("versionId")
      );
      const db = requireDatabaseBinding(c);
      const versionContext = await getVersionProjectId(db, { versionId });

      if (!versionContext) {
        throw new NotFoundError("Prompt version not found.");
      }

      const requestContext = getRequestContext(c);
      const userId =
        requestContext.identity.kind === "session"
          ? requestContext.identity.userId
          : "";
      const access = await getProjectAccess(db, {
        projectId: versionContext.project_id,
        userId
      });

      if (!access) {
        throw new AuthorizationError(
          "You do not have access to this prompt version."
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

// ── Task 13.1: Prompt CRUD ──────────────────────────────────────────────

promptRoutes.post(
  `${API_BASE_PATH}/projects/:projectId/prompts`,
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
      createPromptRequestSchema,
      "Prompt payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const requestContext = getRequestContext(c);
    const createdBy =
      requestContext.identity.kind === "session"
        ? requestContext.identity.userId
        : null;

    const prompt = await createPrompt(db, {
      createdBy,
      description: body.description ?? null,
      name: body.name,
      projectId
    });

    queueAuditEvent(c, {
      action: "prompt.created",
      entityId: prompt.id,
      entityType: "prompt",
      metadata: { name: prompt.name }
    });

    return c.json(
      createPromptResponseSchema.parse({
        prompt: toSharedPrompt(prompt)
      }),
      201
    );
  }
);

promptRoutes.get(
  `${API_BASE_PATH}/projects/:projectId/prompts`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const results = await listProjectPrompts(requireDatabaseBinding(c), {
      projectId
    });

    return c.json(
      listPromptsResponseSchema.parse({
        prompts: results.map((item) => ({
          latestVersion: item.latestVersion
            ? toSharedPromptVersion(item.latestVersion)
            : null,
          prompt: toSharedPrompt(item.prompt)
        }))
      })
    );
  }
);

promptRoutes.get(
  `${API_BASE_PATH}/prompts/:promptId`,
  validateRequestParams(promptIdParamsSchema),
  resolvePromptAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { promptId } = parseRequestParams(
      c,
      promptIdParamsSchema,
      "Prompt path validation failed."
    );
    const db = requireDatabaseBinding(c);
    const prompt = await getPromptById(db, { promptId });

    if (!prompt) {
      throw new NotFoundError("Prompt not found.");
    }

    const versions = await listPromptVersions(db, { promptId });

    return c.json(
      promptDetailsResponseSchema.parse({
        prompt: toSharedPrompt(prompt),
        versions: versions.map(toSharedPromptVersion)
      })
    );
  }
);

// ── Task 13.2: Immutable Prompt Versions ────────────────────────────────

promptRoutes.post(
  `${API_BASE_PATH}/prompts/:promptId/versions`,
  validateRequestParams(promptIdParamsSchema),
  resolvePromptAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { promptId } = parseRequestParams(
      c,
      promptIdParamsSchema,
      "Prompt path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      createPromptVersionRequestSchema,
      "Version payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const requestContext = getRequestContext(c);
    const createdBy =
      requestContext.identity.kind === "session"
        ? requestContext.identity.userId
        : null;

    const prompt = await getPromptById(db, { promptId });

    if (!prompt) {
      throw new NotFoundError("Prompt not found.");
    }

    const version = await createPromptVersion(db, {
      content: body.content,
      createdBy,
      modelConfig: body.modelConfig ? JSON.stringify(body.modelConfig) : null,
      promptId,
      variablesSchema: body.variablesSchema
        ? JSON.stringify(body.variablesSchema)
        : null
    });

    queueAuditEvent(c, {
      action: "prompt_version.created",
      entityId: version.id,
      entityType: "prompt_version",
      metadata: {
        promptId,
        versionNumber: version.version_number
      }
    });

    return c.json(
      createPromptVersionResponseSchema.parse({
        version: toSharedPromptVersion(version)
      }),
      201
    );
  }
);

promptRoutes.get(
  `${API_BASE_PATH}/prompt-versions/:versionId`,
  validateRequestParams(promptVersionIdParamsSchema),
  resolveVersionAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { versionId } = parseRequestParams(
      c,
      promptVersionIdParamsSchema,
      "Version path validation failed."
    );
    const version = await getPromptVersionById(requireDatabaseBinding(c), {
      versionId
    });

    if (!version) {
      throw new NotFoundError("Prompt version not found.");
    }

    return c.json(
      promptVersionDetailsResponseSchema.parse({
        version: toSharedPromptVersion(version)
      })
    );
  }
);

// ── Task 13.3: Release, Archive, and Diff ───────────────────────────────

promptRoutes.patch(
  `${API_BASE_PATH}/prompt-versions/:versionId/release`,
  validateRequestParams(promptVersionIdParamsSchema),
  resolveVersionAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { versionId } = parseRequestParams(
      c,
      promptVersionIdParamsSchema,
      "Version path validation failed."
    );
    const db = requireDatabaseBinding(c);
    const existing = await getPromptVersionById(db, { versionId });

    if (!existing) {
      throw new NotFoundError("Prompt version not found.");
    }

    if (existing.status === "RELEASED") {
      return c.json(
        promptVersionStateResponseSchema.parse({
          version: toSharedPromptVersion(existing)
        })
      );
    }

    if (existing.status === "ARCHIVED") {
      throw new ConflictError("Cannot release an archived prompt version.");
    }

    const version = await releaseVersion(db, {
      promptId: existing.prompt_id,
      versionId
    });

    queueAuditEvent(c, {
      action: "prompt_version.released",
      entityId: version.id,
      entityType: "prompt_version",
      metadata: {
        promptId: version.prompt_id,
        versionNumber: version.version_number
      }
    });

    return c.json(
      promptVersionStateResponseSchema.parse({
        version: toSharedPromptVersion(version)
      })
    );
  }
);

promptRoutes.patch(
  `${API_BASE_PATH}/prompt-versions/:versionId/archive`,
  validateRequestParams(promptVersionIdParamsSchema),
  resolveVersionAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { versionId } = parseRequestParams(
      c,
      promptVersionIdParamsSchema,
      "Version path validation failed."
    );
    const db = requireDatabaseBinding(c);
    const existing = await getPromptVersionById(db, { versionId });

    if (!existing) {
      throw new NotFoundError("Prompt version not found.");
    }

    if (existing.status === "ARCHIVED") {
      return c.json(
        promptVersionStateResponseSchema.parse({
          version: toSharedPromptVersion(existing)
        })
      );
    }

    const version = await archiveVersion(db, { versionId });

    queueAuditEvent(c, {
      action: "prompt_version.archived",
      entityId: version.id,
      entityType: "prompt_version",
      metadata: {
        promptId: version.prompt_id,
        versionNumber: version.version_number
      }
    });

    return c.json(
      promptVersionStateResponseSchema.parse({
        version: toSharedPromptVersion(version)
      })
    );
  }
);

promptRoutes.get(
  `${API_BASE_PATH}/prompts/:promptId/diff`,
  validateRequestParams(promptIdParamsSchema),
  resolvePromptAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { promptId } = parseRequestParams(
      c,
      promptIdParamsSchema,
      "Prompt path validation failed."
    );
    const query = parseRequestQuery(
      c,
      promptDiffQuerySchema,
      "Diff query validation failed."
    );
    const db = requireDatabaseBinding(c);
    const { base, candidate } = await getPromptVersionPair(db, {
      baseId: query.base,
      candidateId: query.candidate
    });

    if (!base) {
      throw new NotFoundError("Base version not found.");
    }

    if (!candidate) {
      throw new NotFoundError("Candidate version not found.");
    }

    if (base.prompt_id !== promptId || candidate.prompt_id !== promptId) {
      throw new ValidationError(
        "Both versions must belong to the specified prompt."
      );
    }

    const hunks = computeLineDiff(base.content, candidate.content);

    return c.json(
      promptDiffResponseSchema.parse({
        baseVersionId: base.id,
        candidateVersionId: candidate.id,
        hunks,
        promptId
      })
    );
  }
);
