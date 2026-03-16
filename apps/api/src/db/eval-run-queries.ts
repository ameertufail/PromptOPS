import type { EvalRunItemVerdict, EvalRunStatus } from "@promptops/shared";
import { createUlid } from "../lib/ulid";

export type DbEvalRun = {
  base_version_id: string;
  candidate_version_id: string;
  created_at: string;
  created_by: string | null;
  error_message: string | null;
  eval_config_id: string;
  finished_at: string | null;
  id: string;
  progress_current: number;
  progress_total: number;
  status: EvalRunStatus;
  summary: string | null;
};

export type DbEvalRunItem = {
  base_metrics: string | null;
  base_output: string | null;
  candidate_metrics: string | null;
  candidate_output: string | null;
  created_at: string;
  dataset_item_id: string;
  delta: string | null;
  eval_run_id: string;
  id: string;
  verdict: EvalRunItemVerdict;
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

// ── Eval Run CRUD ───────────────────────────────────────────────────────

export async function createEvalRun(
  db: D1Database,
  input: {
    baseVersionId: string;
    candidateVersionId: string;
    createdBy: string | null;
    evalConfigId: string;
    progressTotal: number;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const runId = createId();
  const session = db.withSession("first-primary");
  const [, runResult] = await session.batch<DbEvalRun>([
    session
      .prepare(
        `
          INSERT INTO eval_runs (id, eval_config_id, base_version_id, candidate_version_id, status, progress_current, progress_total, created_by)
          VALUES (?, ?, ?, ?, 'RUNNING', 0, ?, ?)
        `
      )
      .bind(
        runId,
        input.evalConfigId,
        input.baseVersionId,
        input.candidateVersionId,
        input.progressTotal,
        input.createdBy
      ),
    session
      .prepare(
        `
          SELECT id, eval_config_id, base_version_id, candidate_version_id, status,
                 progress_current, progress_total, summary, error_message, created_by,
                 created_at, finished_at
          FROM eval_runs
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(runId)
  ]);

  return requireFirstResult(
    runResult,
    `Expected eval run ${runId} after creation.`
  );
}

export async function getEvalRunById(db: D1Database, input: { runId: string }) {
  return db
    .prepare(
      `
        SELECT id, eval_config_id, base_version_id, candidate_version_id, status,
               progress_current, progress_total, summary, error_message, created_by,
               created_at, finished_at
        FROM eval_runs
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.runId)
    .first<DbEvalRun>();
}

export async function listProjectEvalRuns(
  db: D1Database,
  input: {
    projectId: string;
    status?: EvalRunStatus;
    limit: number;
    page: number;
  }
) {
  const offset = (input.page - 1) * input.limit;
  const statusFilter = input.status ? "AND er.status = ?" : "";
  const bindings: (string | number)[] = [input.projectId];
  if (input.status) bindings.push(input.status);

  const countBindings = [...bindings];
  bindings.push(input.limit, offset);

  const session = db.withSession("first-primary");
  const [dataResult, countResult] = await session.batch([
    session
      .prepare(
        `
          SELECT er.id, er.eval_config_id, er.base_version_id, er.candidate_version_id,
                 er.status, er.progress_current, er.progress_total, er.summary,
                 er.error_message, er.created_by, er.created_at, er.finished_at
          FROM eval_runs er
          INNER JOIN eval_configs ec ON ec.id = er.eval_config_id
          WHERE ec.project_id = ?
          ${statusFilter}
          ORDER BY er.created_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .bind(...bindings),
    session
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM eval_runs er
          INNER JOIN eval_configs ec ON ec.id = er.eval_config_id
          WHERE ec.project_id = ?
          ${statusFilter}
        `
      )
      .bind(...countBindings)
  ]);

  const runs = (dataResult as D1Result<DbEvalRun>).results;
  const total =
    (countResult as D1Result<{ total: number }>).results[0]?.total ?? 0;

  return { runs, total };
}

// ── Eval Run Item CRUD ──────────────────────────────────────────────────

export async function createEvalRunItem(
  db: D1Database,
  input: {
    baseMetrics: string | null;
    baseOutput: string | null;
    candidateMetrics: string | null;
    candidateOutput: string | null;
    delta: string | null;
    datasetItemId: string;
    evalRunId: string;
    verdict: EvalRunItemVerdict;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const itemId = createId();
  const session = db.withSession("first-primary");

  const [, itemResult, , runResult] = await session.batch([
    session
      .prepare(
        `
          INSERT INTO eval_run_items (id, eval_run_id, dataset_item_id, base_output, candidate_output, base_metrics, candidate_metrics, delta, verdict)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        itemId,
        input.evalRunId,
        input.datasetItemId,
        input.baseOutput,
        input.candidateOutput,
        input.baseMetrics,
        input.candidateMetrics,
        input.delta,
        input.verdict
      ),
    session
      .prepare(
        `
          SELECT id, eval_run_id, dataset_item_id, base_output, candidate_output,
                 base_metrics, candidate_metrics, delta, verdict, created_at
          FROM eval_run_items
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(itemId),
    session
      .prepare(
        `
          UPDATE eval_runs SET progress_current = progress_current + 1
          WHERE id = ?
        `
      )
      .bind(input.evalRunId),
    session
      .prepare(
        `
          SELECT progress_current, progress_total FROM eval_runs WHERE id = ? LIMIT 1
        `
      )
      .bind(input.evalRunId)
  ]);

  const item = requireFirstResult(
    itemResult as D1Result<DbEvalRunItem>,
    `Expected eval run item ${itemId} after creation.`
  );

  const progressRow = (
    runResult as D1Result<{ progress_current: number; progress_total: number }>
  ).results[0];

  return {
    item,
    progress: {
      current: progressRow?.progress_current ?? 0,
      total: progressRow?.progress_total ?? 0
    }
  };
}

export async function getEvalRunItemByDatasetItem(
  db: D1Database,
  input: { evalRunId: string; datasetItemId: string }
) {
  return db
    .prepare(
      `
        SELECT id, eval_run_id, dataset_item_id, base_output, candidate_output,
               base_metrics, candidate_metrics, delta, verdict, created_at
        FROM eval_run_items
        WHERE eval_run_id = ? AND dataset_item_id = ?
        LIMIT 1
      `
    )
    .bind(input.evalRunId, input.datasetItemId)
    .first<DbEvalRunItem>();
}

export async function listEvalRunItems(
  db: D1Database,
  input: {
    evalRunId: string;
    verdict?: EvalRunItemVerdict;
    limit: number;
    page: number;
  }
) {
  const offset = (input.page - 1) * input.limit;
  const verdictFilter = input.verdict ? "AND verdict = ?" : "";
  const bindings: (string | number)[] = [input.evalRunId];
  if (input.verdict) bindings.push(input.verdict);

  const countBindings = [...bindings];
  bindings.push(input.limit, offset);

  const session = db.withSession("first-primary");
  const [dataResult, countResult] = await session.batch([
    session
      .prepare(
        `
          SELECT id, eval_run_id, dataset_item_id, base_output, candidate_output,
                 base_metrics, candidate_metrics, delta, verdict, created_at
          FROM eval_run_items
          WHERE eval_run_id = ?
          ${verdictFilter}
          ORDER BY created_at ASC
          LIMIT ? OFFSET ?
        `
      )
      .bind(...bindings),
    session
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM eval_run_items
          WHERE eval_run_id = ?
          ${verdictFilter}
        `
      )
      .bind(...countBindings)
  ]);

  const items = (dataResult as D1Result<DbEvalRunItem>).results;
  const total =
    (countResult as D1Result<{ total: number }>).results[0]?.total ?? 0;

  return { items, total };
}

export async function getAllEvalRunItems(
  db: D1Database,
  input: { evalRunId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT id, eval_run_id, dataset_item_id, base_output, candidate_output,
               base_metrics, candidate_metrics, delta, verdict, created_at
        FROM eval_run_items
        WHERE eval_run_id = ?
        ORDER BY created_at ASC
      `
    )
    .bind(input.evalRunId)
    .all<DbEvalRunItem>();

  return result.results;
}

export async function completeEvalRun(
  db: D1Database,
  input: {
    runId: string;
    summary: string;
    status: "COMPLETED" | "FAILED";
    errorMessage?: string | null;
  }
) {
  const session = db.withSession("first-primary");
  const [, runResult] = await session.batch<DbEvalRun>([
    session
      .prepare(
        `
          UPDATE eval_runs
          SET status = ?, summary = ?, error_message = ?, finished_at = datetime('now')
          WHERE id = ?
        `
      )
      .bind(
        input.status,
        input.summary,
        input.errorMessage ?? null,
        input.runId
      ),
    session
      .prepare(
        `
          SELECT id, eval_config_id, base_version_id, candidate_version_id, status,
                 progress_current, progress_total, summary, error_message, created_by,
                 created_at, finished_at
          FROM eval_runs
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(input.runId)
  ]);

  return requireFirstResult(
    runResult,
    `Expected eval run ${input.runId} after completion.`
  );
}

export async function getCompletedItemIds(
  db: D1Database,
  input: { evalRunId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT dataset_item_id
        FROM eval_run_items
        WHERE eval_run_id = ?
      `
    )
    .bind(input.evalRunId)
    .all<{ dataset_item_id: string }>();

  return new Set(result.results.map((r) => r.dataset_item_id));
}
