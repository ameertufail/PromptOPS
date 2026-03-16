import {
  API_BASE_PATH,
  createDatasetItemRequestSchema,
  createDatasetRequestSchema,
  createDatasetResponseSchema,
  datasetDetailsResponseSchema,
  datasetDetailQuerySchema,
  datasetIdParamsSchema,
  datasetItemIdParamsSchema,
  datasetItemResponseSchema,
  datasetItemSchema,
  datasetItemsBulkImportResponseSchema,
  datasetJsonlImportLineSchema,
  datasetSchema,
  deleteDatasetItemResponseSchema,
  deleteDatasetResponseSchema,
  listDatasetsResponseSchema,
  projectIdParamsSchema,
  updateDatasetItemRequestSchema,
  updateDatasetRequestSchema,
  updateDatasetResponseSchema,
  type Dataset,
  type DatasetItem
} from "@promptops/shared";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import {
  bulkCreateDatasetItems,
  createDataset,
  createDatasetItem,
  deleteDataset,
  deleteDatasetItem,
  getDatasetById,
  getDatasetItemById,
  getItemDatasetProjectId,
  listDatasetItems,
  listProjectDatasets,
  updateDataset,
  updateDatasetItem,
  type DbDataset,
  type DbDatasetItem
} from "../db/dataset-queries";
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
import type { AppEnv } from "../types";

export const datasetRoutes = new Hono<AppEnv>();

// ── Shared Helpers ──────────────────────────────────────────────────────

function toSharedDataset(dataset: DbDataset): Dataset {
  return datasetSchema.parse({
    createdAt: dataset.created_at,
    createdBy: dataset.created_by,
    description: dataset.description,
    id: dataset.id,
    itemCount: dataset.item_count,
    name: dataset.name,
    projectId: dataset.project_id,
    type: dataset.type
  });
}

function toSharedDatasetItem(item: DbDatasetItem): DatasetItem {
  return datasetItemSchema.parse({
    createdAt: item.created_at,
    datasetId: item.dataset_id,
    expectedOutput: item.expected_output
      ? JSON.parse(item.expected_output)
      : null,
    id: item.id,
    input: JSON.parse(item.input),
    rubric: item.rubric ? JSON.parse(item.rubric) : null,
    sortOrder: item.sort_order,
    tags: item.tags ? JSON.parse(item.tags) : []
  });
}

function resolveDatasetAccess() {
  return (async (c, next) => {
    await requireSessionIdentity()(c, async () => {
      const datasetId = requireRouteParam(
        "datasetId",
        c.req.param("datasetId")
      );
      const db = requireDatabaseBinding(c);
      const dataset = await getDatasetById(db, { datasetId });

      if (!dataset) {
        throw new NotFoundError("Dataset not found.");
      }

      const requestContext = getRequestContext(c);
      const userId =
        requestContext.identity.kind === "session"
          ? requestContext.identity.userId
          : "";
      const access = await getProjectAccess(db, {
        projectId: dataset.project_id,
        userId
      });

      if (!access) {
        throw new AuthorizationError("You do not have access to this dataset.");
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

function resolveDatasetItemAccess() {
  return (async (c, next) => {
    await requireSessionIdentity()(c, async () => {
      const itemId = requireRouteParam("itemId", c.req.param("itemId"));
      const db = requireDatabaseBinding(c);
      const itemContext = await getItemDatasetProjectId(db, { itemId });

      if (!itemContext) {
        throw new NotFoundError("Dataset item not found.");
      }

      const requestContext = getRequestContext(c);
      const userId =
        requestContext.identity.kind === "session"
          ? requestContext.identity.userId
          : "";
      const access = await getProjectAccess(db, {
        projectId: itemContext.project_id,
        userId
      });

      if (!access) {
        throw new AuthorizationError(
          "You do not have access to this dataset item."
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

// ── Task 15.1: Dataset CRUD ─────────────────────────────────────────────

datasetRoutes.post(
  `${API_BASE_PATH}/projects/:projectId/datasets`,
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
      createDatasetRequestSchema,
      "Dataset payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const requestContext = getRequestContext(c);
    const createdBy =
      requestContext.identity.kind === "session"
        ? requestContext.identity.userId
        : null;

    const dataset = await createDataset(db, {
      createdBy,
      description: body.description ?? null,
      name: body.name,
      projectId,
      type: body.type
    });

    queueAuditEvent(c, {
      action: "dataset.created",
      entityId: dataset.id,
      entityType: "dataset",
      metadata: { name: dataset.name, type: dataset.type }
    });

    return c.json(
      createDatasetResponseSchema.parse({
        dataset: toSharedDataset(dataset)
      }),
      201
    );
  }
);

datasetRoutes.get(
  `${API_BASE_PATH}/projects/:projectId/datasets`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const results = await listProjectDatasets(requireDatabaseBinding(c), {
      projectId
    });

    return c.json(
      listDatasetsResponseSchema.parse({
        datasets: results.map(toSharedDataset)
      })
    );
  }
);

datasetRoutes.get(
  `${API_BASE_PATH}/datasets/:datasetId`,
  validateRequestParams(datasetIdParamsSchema),
  resolveDatasetAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { datasetId } = parseRequestParams(
      c,
      datasetIdParamsSchema,
      "Dataset path validation failed."
    );
    const query = parseRequestQuery(
      c,
      datasetDetailQuerySchema,
      "Dataset detail query validation failed."
    );
    const db = requireDatabaseBinding(c);
    const dataset = await getDatasetById(db, { datasetId });

    if (!dataset) {
      throw new NotFoundError("Dataset not found.");
    }

    const { items, nextCursor } = await listDatasetItems(db, {
      cursor: query.cursor,
      datasetId,
      limit: query.limit ?? 50
    });

    return c.json(
      datasetDetailsResponseSchema.parse({
        dataset: toSharedDataset(dataset),
        items: items.map(toSharedDatasetItem),
        nextCursor
      })
    );
  }
);

datasetRoutes.patch(
  `${API_BASE_PATH}/datasets/:datasetId`,
  validateRequestParams(datasetIdParamsSchema),
  resolveDatasetAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { datasetId } = parseRequestParams(
      c,
      datasetIdParamsSchema,
      "Dataset path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      updateDatasetRequestSchema,
      "Dataset update payload validation failed."
    );
    const db = requireDatabaseBinding(c);

    const existing = await getDatasetById(db, { datasetId });

    if (!existing) {
      throw new NotFoundError("Dataset not found.");
    }

    const dataset = await updateDataset(db, {
      datasetId,
      description: body.description,
      name: body.name,
      type: body.type
    });

    if (!dataset) {
      throw new NotFoundError("Dataset not found after update.");
    }

    queueAuditEvent(c, {
      action: "dataset.updated",
      entityId: dataset.id,
      entityType: "dataset",
      metadata: { name: dataset.name }
    });

    return c.json(
      updateDatasetResponseSchema.parse({
        dataset: toSharedDataset(dataset)
      })
    );
  }
);

datasetRoutes.delete(
  `${API_BASE_PATH}/datasets/:datasetId`,
  validateRequestParams(datasetIdParamsSchema),
  resolveDatasetAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { datasetId } = parseRequestParams(
      c,
      datasetIdParamsSchema,
      "Dataset path validation failed."
    );
    const db = requireDatabaseBinding(c);

    const existing = await getDatasetById(db, { datasetId });

    if (!existing) {
      throw new NotFoundError("Dataset not found.");
    }

    await deleteDataset(db, { datasetId });

    queueAuditEvent(c, {
      action: "dataset.deleted",
      entityId: datasetId,
      entityType: "dataset",
      metadata: { name: existing.name }
    });

    return c.json(
      deleteDatasetResponseSchema.parse({
        datasetId,
        success: true
      })
    );
  }
);

// ── Task 15.2: Dataset Item CRUD ────────────────────────────────────────

datasetRoutes.post(
  `${API_BASE_PATH}/datasets/:datasetId/items`,
  validateRequestParams(datasetIdParamsSchema),
  resolveDatasetAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { datasetId } = parseRequestParams(
      c,
      datasetIdParamsSchema,
      "Dataset path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      createDatasetItemRequestSchema,
      "Dataset item payload validation failed."
    );
    const db = requireDatabaseBinding(c);

    const dataset = await getDatasetById(db, { datasetId });

    if (!dataset) {
      throw new NotFoundError("Dataset not found.");
    }

    const item = await createDatasetItem(db, {
      datasetId,
      expectedOutput: body.expectedOutput
        ? JSON.stringify(body.expectedOutput)
        : null,
      input: JSON.stringify(body.input),
      rubric: body.rubric ? JSON.stringify(body.rubric) : null,
      sortOrder: body.sortOrder,
      tags: body.tags ? JSON.stringify(body.tags) : null
    });

    queueAuditEvent(c, {
      action: "dataset_item.created",
      entityId: item.id,
      entityType: "dataset_item",
      metadata: { datasetId }
    });

    return c.json(
      datasetItemResponseSchema.parse({
        item: toSharedDatasetItem(item)
      }),
      201
    );
  }
);

datasetRoutes.patch(
  `${API_BASE_PATH}/dataset-items/:itemId`,
  validateRequestParams(datasetItemIdParamsSchema),
  resolveDatasetItemAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { itemId } = parseRequestParams(
      c,
      datasetItemIdParamsSchema,
      "Dataset item path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      updateDatasetItemRequestSchema,
      "Dataset item update payload validation failed."
    );
    const db = requireDatabaseBinding(c);

    const existing = await getDatasetItemById(db, { itemId });

    if (!existing) {
      throw new NotFoundError("Dataset item not found.");
    }

    const item = await updateDatasetItem(db, {
      expectedOutput:
        body.expectedOutput !== undefined
          ? body.expectedOutput !== null
            ? JSON.stringify(body.expectedOutput)
            : null
          : undefined,
      input: body.input ? JSON.stringify(body.input) : undefined,
      itemId,
      rubric:
        body.rubric !== undefined
          ? body.rubric !== null
            ? JSON.stringify(body.rubric)
            : null
          : undefined,
      sortOrder: body.sortOrder,
      tags: body.tags !== undefined ? JSON.stringify(body.tags) : undefined
    });

    if (!item) {
      throw new NotFoundError("Dataset item not found after update.");
    }

    queueAuditEvent(c, {
      action: "dataset_item.updated",
      entityId: item.id,
      entityType: "dataset_item",
      metadata: { datasetId: item.dataset_id }
    });

    return c.json(
      datasetItemResponseSchema.parse({
        item: toSharedDatasetItem(item)
      })
    );
  }
);

datasetRoutes.delete(
  `${API_BASE_PATH}/dataset-items/:itemId`,
  validateRequestParams(datasetItemIdParamsSchema),
  resolveDatasetItemAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { itemId } = parseRequestParams(
      c,
      datasetItemIdParamsSchema,
      "Dataset item path validation failed."
    );
    const db = requireDatabaseBinding(c);

    const existing = await getDatasetItemById(db, { itemId });

    if (!existing) {
      throw new NotFoundError("Dataset item not found.");
    }

    await deleteDatasetItem(db, {
      datasetId: existing.dataset_id,
      itemId
    });

    queueAuditEvent(c, {
      action: "dataset_item.deleted",
      entityId: itemId,
      entityType: "dataset_item",
      metadata: { datasetId: existing.dataset_id }
    });

    return c.json(
      deleteDatasetItemResponseSchema.parse({
        itemId,
        success: true
      })
    );
  }
);

// ── Task 15.3: JSONL Bulk Import ────────────────────────────────────────

datasetRoutes.post(
  `${API_BASE_PATH}/datasets/:datasetId/items/bulk`,
  validateRequestParams(datasetIdParamsSchema),
  resolveDatasetAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { datasetId } = parseRequestParams(
      c,
      datasetIdParamsSchema,
      "Dataset path validation failed."
    );
    const db = requireDatabaseBinding(c);

    const dataset = await getDatasetById(db, { datasetId });

    if (!dataset) {
      throw new NotFoundError("Dataset not found.");
    }

    const contentType = c.req.header("content-type") ?? "";
    let rawText: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        throw new ValidationError(
          "A file field is required in the multipart upload."
        );
      }

      rawText = await file.text();
    } else {
      rawText = await c.req.text();
    }

    if (!rawText.trim()) {
      throw new ValidationError("Import body is empty.");
    }

    const lines = rawText.trim().split("\n");
    const validItems: Array<{
      expectedOutput?: string | null;
      input: string;
      rubric?: string | null;
      tags?: string | null;
    }> = [];
    const errors: Array<{ error: string; line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i].trim();

      if (!lineText) {
        continue;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(lineText);
      } catch {
        errors.push({ error: "Invalid JSON.", line: i + 1 });
        continue;
      }

      const result = datasetJsonlImportLineSchema.safeParse(parsed);

      if (!result.success) {
        const issues = result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        errors.push({ error: issues, line: i + 1 });
        continue;
      }

      validItems.push({
        expectedOutput: result.data.expectedOutput
          ? JSON.stringify(result.data.expectedOutput)
          : null,
        input: JSON.stringify(result.data.input),
        rubric: result.data.rubric ? JSON.stringify(result.data.rubric) : null,
        tags: result.data.tags ? JSON.stringify(result.data.tags) : null
      });
    }

    let imported = 0;

    if (validItems.length > 0) {
      imported = await bulkCreateDatasetItems(db, {
        datasetId,
        items: validItems
      });
    }

    queueAuditEvent(c, {
      action: "dataset.items_imported",
      entityId: datasetId,
      entityType: "dataset",
      metadata: { failed: errors.length, imported }
    });

    return c.json(
      datasetItemsBulkImportResponseSchema.parse({
        errors,
        failed: errors.length,
        imported
      })
    );
  }
);
