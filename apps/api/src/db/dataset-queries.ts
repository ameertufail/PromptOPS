import type { DATASET_TYPES } from "@promptops/shared";
import { createUlid } from "../lib/ulid";

export type DbDataset = {
  created_at: string;
  created_by: string | null;
  description: string | null;
  id: string;
  item_count: number;
  name: string;
  project_id: string;
  type: (typeof DATASET_TYPES)[number];
};

export type DbDatasetItem = {
  created_at: string;
  dataset_id: string;
  expected_output: string | null;
  id: string;
  input: string;
  rubric: string | null;
  sort_order: number;
  tags: string | null;
};

type ItemDatasetRow = {
  dataset_id: string;
  item_id: string;
  project_id: string;
};

type IdFactoryOptions = {
  createId?: () => string;
};

function getIdFactory(options?: IdFactoryOptions) {
  return options?.createId ?? createUlid;
}

function requireFirstResult<T>(result: D1Result<T>, message: string) {
  const row = result.results[0];

  if (!row) {
    throw new Error(message);
  }

  return row;
}

// ── Dataset CRUD ────────────────────────────────────────────────────────

export async function createDataset(
  db: D1Database,
  input: {
    createdBy: string | null;
    description?: string | null;
    name: string;
    projectId: string;
    type: string;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const datasetId = createId();
  const session = db.withSession("first-primary");
  const [, datasetResult] = await session.batch<DbDataset>([
    session
      .prepare(
        `
          INSERT INTO datasets (id, project_id, name, description, type, item_count, created_by)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `
      )
      .bind(
        datasetId,
        input.projectId,
        input.name,
        input.description ?? null,
        input.type,
        input.createdBy
      ),
    session
      .prepare(
        `
          SELECT id, project_id, name, description, type, item_count, created_by, created_at
          FROM datasets
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(datasetId)
  ]);

  return requireFirstResult(
    datasetResult,
    `Expected dataset ${datasetId} after creation.`
  );
}

export async function getDatasetById(
  db: D1Database,
  input: { datasetId: string }
) {
  return db
    .prepare(
      `
        SELECT id, project_id, name, description, type, item_count, created_by, created_at
        FROM datasets
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.datasetId)
    .first<DbDataset>();
}

export async function listProjectDatasets(
  db: D1Database,
  input: { projectId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT id, project_id, name, description, type, item_count, created_by, created_at
        FROM datasets
        WHERE project_id = ?
        ORDER BY LOWER(name) ASC, created_at ASC
      `
    )
    .bind(input.projectId)
    .all<DbDataset>();

  return result.results;
}

export async function updateDataset(
  db: D1Database,
  input: {
    datasetId: string;
    description?: string | null;
    name?: string;
    type?: string;
  }
) {
  const setClauses: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) {
    setClauses.push("name = ?");
    values.push(input.name);
  }

  if (input.description !== undefined) {
    setClauses.push("description = ?");
    values.push(input.description);
  }

  if (input.type !== undefined) {
    setClauses.push("type = ?");
    values.push(input.type);
  }

  if (setClauses.length === 0) {
    return getDatasetById(db, { datasetId: input.datasetId });
  }

  values.push(input.datasetId);

  const session = db.withSession("first-primary");
  const [, datasetResult] = await session.batch<DbDataset>([
    session
      .prepare(`UPDATE datasets SET ${setClauses.join(", ")} WHERE id = ?`)
      .bind(...values),
    session
      .prepare(
        `
          SELECT id, project_id, name, description, type, item_count, created_by, created_at
          FROM datasets
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(input.datasetId)
  ]);

  return requireFirstResult(
    datasetResult,
    `Expected dataset ${input.datasetId} after update.`
  );
}

export async function deleteDataset(
  db: D1Database,
  input: { datasetId: string }
) {
  await db
    .prepare(`DELETE FROM datasets WHERE id = ?`)
    .bind(input.datasetId)
    .run();
}

// ── Dataset Item CRUD ───────────────────────────────────────────────────

export async function createDatasetItem(
  db: D1Database,
  input: {
    datasetId: string;
    expectedOutput?: string | null;
    input: string;
    rubric?: string | null;
    sortOrder?: number;
    tags?: string | null;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const itemId = createId();
  const session = db.withSession("first-primary");

  const sortOrder = input.sortOrder ?? 0;

  const [, , itemResult] = await session.batch<DbDatasetItem>([
    session
      .prepare(
        `
          INSERT INTO dataset_items (id, dataset_id, input, expected_output, rubric, tags, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        itemId,
        input.datasetId,
        input.input,
        input.expectedOutput ?? null,
        input.rubric ?? null,
        input.tags ?? null,
        sortOrder
      ),
    session
      .prepare(`UPDATE datasets SET item_count = item_count + 1 WHERE id = ?`)
      .bind(input.datasetId),
    session
      .prepare(
        `
          SELECT id, dataset_id, input, expected_output, rubric, tags, sort_order, created_at
          FROM dataset_items
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(itemId)
  ]);

  return requireFirstResult(
    itemResult,
    `Expected dataset item ${itemId} after creation.`
  );
}

export async function getDatasetItemById(
  db: D1Database,
  input: { itemId: string }
) {
  return db
    .prepare(
      `
        SELECT id, dataset_id, input, expected_output, rubric, tags, sort_order, created_at
        FROM dataset_items
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.itemId)
    .first<DbDatasetItem>();
}

export async function getAllDatasetItems(
  db: D1Database,
  input: { datasetId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT id, dataset_id, input, expected_output, rubric, tags, sort_order, created_at
        FROM dataset_items
        WHERE dataset_id = ?
        ORDER BY sort_order ASC, id ASC
      `
    )
    .bind(input.datasetId)
    .all<DbDatasetItem>();

  return result.results;
}

export async function listDatasetItems(
  db: D1Database,
  input: { cursor?: string; datasetId: string; limit: number }
) {
  const limit = Math.min(input.limit, 100);

  if (input.cursor) {
    const result = await db
      .prepare(
        `
          SELECT id, dataset_id, input, expected_output, rubric, tags, sort_order, created_at
          FROM dataset_items
          WHERE dataset_id = ?
            AND (sort_order, id) > (
              SELECT sort_order, id FROM dataset_items WHERE id = ?
            )
          ORDER BY sort_order ASC, id ASC
          LIMIT ?
        `
      )
      .bind(input.datasetId, input.cursor, limit + 1)
      .all<DbDatasetItem>();

    const items = result.results.slice(0, limit);
    const nextCursor =
      result.results.length > limit
        ? (items[items.length - 1]?.id ?? null)
        : null;

    return { items, nextCursor };
  }

  const result = await db
    .prepare(
      `
        SELECT id, dataset_id, input, expected_output, rubric, tags, sort_order, created_at
        FROM dataset_items
        WHERE dataset_id = ?
        ORDER BY sort_order ASC, id ASC
        LIMIT ?
      `
    )
    .bind(input.datasetId, limit + 1)
    .all<DbDatasetItem>();

  const items = result.results.slice(0, limit);
  const nextCursor =
    result.results.length > limit
      ? (items[items.length - 1]?.id ?? null)
      : null;

  return { items, nextCursor };
}

export async function updateDatasetItem(
  db: D1Database,
  input: {
    expectedOutput?: string | null;
    input?: string;
    itemId: string;
    rubric?: string | null;
    sortOrder?: number;
    tags?: string | null;
  }
) {
  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.input !== undefined) {
    setClauses.push("input = ?");
    values.push(input.input);
  }

  if (input.expectedOutput !== undefined) {
    setClauses.push("expected_output = ?");
    values.push(input.expectedOutput);
  }

  if (input.rubric !== undefined) {
    setClauses.push("rubric = ?");
    values.push(input.rubric);
  }

  if (input.tags !== undefined) {
    setClauses.push("tags = ?");
    values.push(input.tags);
  }

  if (input.sortOrder !== undefined) {
    setClauses.push("sort_order = ?");
    values.push(input.sortOrder);
  }

  if (setClauses.length === 0) {
    return getDatasetItemById(db, { itemId: input.itemId });
  }

  values.push(input.itemId);

  const session = db.withSession("first-primary");
  const [, itemResult] = await session.batch<DbDatasetItem>([
    session
      .prepare(`UPDATE dataset_items SET ${setClauses.join(", ")} WHERE id = ?`)
      .bind(...values),
    session
      .prepare(
        `
          SELECT id, dataset_id, input, expected_output, rubric, tags, sort_order, created_at
          FROM dataset_items
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(input.itemId)
  ]);

  return requireFirstResult(
    itemResult,
    `Expected dataset item ${input.itemId} after update.`
  );
}

export async function deleteDatasetItem(
  db: D1Database,
  input: { datasetId: string; itemId: string }
) {
  const session = db.withSession("first-primary");
  await session.batch([
    session
      .prepare(`DELETE FROM dataset_items WHERE id = ?`)
      .bind(input.itemId),
    session
      .prepare(
        `UPDATE datasets SET item_count = item_count - 1 WHERE id = ? AND item_count > 0`
      )
      .bind(input.datasetId)
  ]);
}

export async function getItemDatasetProjectId(
  db: D1Database,
  input: { itemId: string }
) {
  return db
    .prepare(
      `
        SELECT di.id AS item_id, di.dataset_id, d.project_id
        FROM dataset_items di
        INNER JOIN datasets d ON d.id = di.dataset_id
        WHERE di.id = ?
        LIMIT 1
      `
    )
    .bind(input.itemId)
    .first<ItemDatasetRow>();
}

// ── Bulk Import ─────────────────────────────────────────────────────────

const BATCH_SIZE = 20;

export async function bulkCreateDatasetItems(
  db: D1Database,
  input: {
    datasetId: string;
    items: Array<{
      expectedOutput?: string | null;
      input: string;
      rubric?: string | null;
      tags?: string | null;
    }>;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  let totalInserted = 0;

  for (let i = 0; i < input.items.length; i += BATCH_SIZE) {
    const batch = input.items.slice(i, i + BATCH_SIZE);
    const statements: D1PreparedStatement[] = [];

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const itemId = createId();
      const sortOrder = i + j;

      statements.push(
        db
          .prepare(
            `
              INSERT INTO dataset_items (id, dataset_id, input, expected_output, rubric, tags, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `
          )
          .bind(
            itemId,
            input.datasetId,
            item.input,
            item.expectedOutput ?? null,
            item.rubric ?? null,
            item.tags ?? null,
            sortOrder
          )
      );
    }

    statements.push(
      db
        .prepare(`UPDATE datasets SET item_count = item_count + ? WHERE id = ?`)
        .bind(batch.length, input.datasetId)
    );

    await db.batch(statements);
    totalInserted += batch.length;
  }

  return totalInserted;
}
