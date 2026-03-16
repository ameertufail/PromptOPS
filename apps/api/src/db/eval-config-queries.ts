import { createUlid } from "../lib/ulid";

export type DbEvalConfig = {
  created_at: string;
  created_by: string | null;
  dataset_id: string;
  id: string;
  name: string;
  project_id: string;
  rules: string;
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

// ── Eval Config CRUD ─────────────────────────────────────────────────────

export async function createEvalConfig(
  db: D1Database,
  input: {
    createdBy: string | null;
    datasetId: string;
    name: string;
    projectId: string;
    rules: string;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const configId = createId();
  const session = db.withSession("first-primary");
  const [, configResult] = await session.batch<DbEvalConfig>([
    session
      .prepare(
        `
          INSERT INTO eval_configs (id, project_id, name, dataset_id, rules, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        configId,
        input.projectId,
        input.name,
        input.datasetId,
        input.rules,
        input.createdBy
      ),
    session
      .prepare(
        `
          SELECT id, project_id, name, dataset_id, rules, created_by, created_at
          FROM eval_configs
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(configId)
  ]);

  return requireFirstResult(
    configResult,
    `Expected eval config ${configId} after creation.`
  );
}

export async function getEvalConfigById(
  db: D1Database,
  input: { configId: string }
) {
  return db
    .prepare(
      `
        SELECT id, project_id, name, dataset_id, rules, created_by, created_at
        FROM eval_configs
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.configId)
    .first<DbEvalConfig>();
}

export async function listProjectEvalConfigs(
  db: D1Database,
  input: { projectId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT id, project_id, name, dataset_id, rules, created_by, created_at
        FROM eval_configs
        WHERE project_id = ?
        ORDER BY LOWER(name) ASC, created_at ASC
      `
    )
    .bind(input.projectId)
    .all<DbEvalConfig>();

  return result.results;
}

export async function updateEvalConfig(
  db: D1Database,
  input: {
    configId: string;
    datasetId?: string;
    name?: string;
    rules?: string;
  }
) {
  const setClauses: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) {
    setClauses.push("name = ?");
    values.push(input.name);
  }

  if (input.datasetId !== undefined) {
    setClauses.push("dataset_id = ?");
    values.push(input.datasetId);
  }

  if (input.rules !== undefined) {
    setClauses.push("rules = ?");
    values.push(input.rules);
  }

  if (setClauses.length === 0) {
    return getEvalConfigById(db, { configId: input.configId });
  }

  values.push(input.configId);

  const session = db.withSession("first-primary");
  const [, configResult] = await session.batch<DbEvalConfig>([
    session
      .prepare(`UPDATE eval_configs SET ${setClauses.join(", ")} WHERE id = ?`)
      .bind(...values),
    session
      .prepare(
        `
          SELECT id, project_id, name, dataset_id, rules, created_by, created_at
          FROM eval_configs
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(input.configId)
  ]);

  return requireFirstResult(
    configResult,
    `Expected eval config ${input.configId} after update.`
  );
}

export async function hasEvalRunsForConfig(
  db: D1Database,
  input: { configId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT COUNT(*) AS run_count
        FROM eval_runs
        WHERE eval_config_id = ?
      `
    )
    .bind(input.configId)
    .first<{ run_count: number }>();

  return (result?.run_count ?? 0) > 0;
}
