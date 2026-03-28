import type { RunSource } from "@promptops/shared";
import { createUlid } from "../lib/ulid";

export type DbRun = {
  created_at: string;
  id: string;
  input: string;
  metrics: string | null;
  output: string;
  project_id: string;
  prompt_version_id: string | null;
  source: RunSource;
};

type IdFactoryOptions = {
  createId?: () => string;
};

function getIdFactory(options?: IdFactoryOptions) {
  return options?.createId ?? createUlid;
}

export async function createRun(
  db: D1Database,
  input: {
    input: string;
    metrics: string | null;
    output: string;
    projectId: string;
    promptVersionId: string | null;
    source: RunSource;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const runId = createId();

  await db
    .prepare(
      `
        INSERT INTO runs (id, project_id, prompt_version_id, input, output, metrics, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      runId,
      input.projectId,
      input.promptVersionId,
      input.input,
      input.output,
      input.metrics,
      input.source
    )
    .run();

  return { id: runId };
}

export async function listRunsByProject(
  db: D1Database,
  input: {
    projectId: string;
    promptVersionId?: string;
    source?: RunSource;
    from?: string;
    to?: string;
    limit: number;
    page: number;
  }
) {
  const offset = (input.page - 1) * input.limit;
  const conditions: string[] = ["project_id = ?"];
  const bindings: (string | number)[] = [input.projectId];

  if (input.promptVersionId) {
    conditions.push("prompt_version_id = ?");
    bindings.push(input.promptVersionId);
  }

  if (input.source) {
    conditions.push("source = ?");
    bindings.push(input.source);
  }

  if (input.from) {
    conditions.push("created_at >= ?");
    bindings.push(input.from);
  }

  if (input.to) {
    conditions.push("created_at <= ?");
    bindings.push(input.to);
  }

  const whereClause = conditions.join(" AND ");
  const countBindings = [...bindings];
  bindings.push(input.limit, offset);

  const session = db.withSession("first-primary");
  const [dataResult, countResult] = await session.batch([
    session
      .prepare(
        `
          SELECT id, project_id, prompt_version_id, input, output, metrics, source, created_at
          FROM runs
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .bind(...bindings),
    session
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM runs
          WHERE ${whereClause}
        `
      )
      .bind(...countBindings)
  ]);

  const runs = (dataResult as D1Result<DbRun>).results;
  const total =
    (countResult as D1Result<{ total: number }>).results[0]?.total ?? 0;

  return { runs, total };
}

export async function getRunStats(
  db: D1Database,
  input: {
    projectId: string;
    promptVersionId?: string;
    source?: RunSource;
    from?: string;
    to?: string;
  }
) {
  const conditions: string[] = ["project_id = ?"];
  const bindings: (string | number)[] = [input.projectId];

  if (input.promptVersionId) {
    conditions.push("prompt_version_id = ?");
    bindings.push(input.promptVersionId);
  }

  if (input.source) {
    conditions.push("source = ?");
    bindings.push(input.source);
  }

  if (input.from) {
    conditions.push("created_at >= ?");
    bindings.push(input.from);
  }

  if (input.to) {
    conditions.push("created_at <= ?");
    bindings.push(input.to);
  }

  const whereClause = conditions.join(" AND ");

  const session = db.withSession("first-primary");
  const [aggResult, dailyResult, allMetricsResult] = await session.batch([
    session
      .prepare(
        `
          SELECT
            COUNT(*) AS total_runs,
            AVG(CAST(json_extract(metrics, '$.latencyMs') AS REAL)) AS avg_latency,
            AVG(CAST(json_extract(metrics, '$.tokenCount') AS REAL)) AS avg_token_count,
            SUM(CAST(json_extract(metrics, '$.costEstimate') AS REAL)) AS total_cost
          FROM runs
          WHERE ${whereClause}
        `
      )
      .bind(...bindings),
    session
      .prepare(
        `
          SELECT
            strftime('%Y-%m-%d', created_at) AS date,
            COUNT(*) AS count
          FROM runs
          WHERE ${whereClause}
          GROUP BY strftime('%Y-%m-%d', created_at)
          ORDER BY date DESC
          LIMIT 30
        `
      )
      .bind(...bindings),
    session
      .prepare(
        `
          SELECT metrics
          FROM runs
          WHERE ${whereClause} AND metrics IS NOT NULL
          LIMIT 10000
        `
      )
      .bind(...bindings)
  ]);

  type AggRow = {
    avg_latency: number | null;
    avg_token_count: number | null;
    total_cost: number | null;
    total_runs: number;
  };

  type DailyRow = {
    count: number;
    date: string;
  };

  type MetricsRow = {
    metrics: string;
  };

  const agg = (aggResult as D1Result<AggRow>).results[0];
  const daily = (dailyResult as D1Result<DailyRow>).results;
  const allMetrics = (allMetricsResult as D1Result<MetricsRow>).results;

  // Compute percentiles from latency values
  const latencies: number[] = [];
  const guardrailFailureCounts: Record<string, number> = {};

  for (const row of allMetrics) {
    try {
      const m = JSON.parse(row.metrics);
      if (typeof m.latencyMs === "number") {
        latencies.push(m.latencyMs);
      }
      if (m.guardrailResults && Array.isArray(m.guardrailResults)) {
        for (const gr of m.guardrailResults) {
          if (gr.passed === false && typeof gr.name === "string") {
            guardrailFailureCounts[gr.name] =
              (guardrailFailureCounts[gr.name] ?? 0) + 1;
          }
        }
      }
    } catch {
      // skip malformed metrics
    }
  }

  latencies.sort((a, b) => a - b);

  function percentile(arr: number[], p: number) {
    if (arr.length === 0) return null;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)] ?? null;
  }

  return {
    averageLatencyMs: agg?.avg_latency ?? null,
    averageTokenCount: agg?.avg_token_count ?? null,
    guardrailFailureCounts,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    runsPerDay: daily.map((d) => ({ count: d.count, date: d.date })),
    totalCostEstimate: agg?.total_cost ?? null,
    totalRuns: agg?.total_runs ?? 0
  };
}
