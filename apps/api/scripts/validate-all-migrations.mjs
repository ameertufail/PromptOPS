import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  databaseName,
  expectedIndexes,
  expectedTables,
  hotPathQueryPlans,
  migrationFiles,
  migrationNames
} from "./migration-manifest.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const workspaceRoot = join(__dirname, "..");
const validationRunId = `validate-${Date.now()}-${process.pid}`;
const validationRoot = join(
  workspaceRoot,
  ".wrangler",
  "state",
  "task-7",
  validationRunId
);
const wranglerPackageJson = require.resolve("wrangler/package.json");
const wranglerPackage = require(wranglerPackageJson);
const wranglerBin = join(
  wranglerPackageJson.replace("package.json", ""),
  wranglerPackage.bin.wrangler
);

const foreignKeyTargets = {
  api_keys: ["projects", "users"],
  audit_events: ["orgs", "users"],
  dataset_items: ["datasets"],
  datasets: ["projects", "users"],
  eval_configs: ["datasets", "projects", "users"],
  eval_run_items: ["dataset_items", "eval_runs"],
  eval_runs: ["eval_configs", "prompt_versions", "prompt_versions", "users"],
  org_members: ["orgs", "users"],
  projects: ["orgs"],
  prompt_versions: ["prompts", "users"],
  prompts: ["projects", "users"],
  provider_keys: ["projects", "users"],
  runs: ["projects", "prompt_versions"]
};

function executeJson(args) {
  const output = execFileSync(process.execPath, [wranglerBin, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  });

  return JSON.parse(output);
}

function getPersistPath(runName) {
  return join(".wrangler", "state", "task-7", validationRunId, runName);
}

function queryRows(runName, command) {
  const payload = executeJson([
    "d1",
    "execute",
    databaseName,
    "--command",
    command,
    "--local",
    "--persist-to",
    getPersistPath(runName),
    "--json"
  ]);

  if (Array.isArray(payload)) {
    const firstEntry = payload[0];
    if (firstEntry?.results) {
      return firstEntry.results;
    }
  }

  if (payload?.result?.[0]?.results) {
    return payload.result[0].results;
  }

  if (payload?.results) {
    return payload.results;
  }

  throw new Error(`Unexpected wrangler JSON payload: ${JSON.stringify(payload)}`);
}

function applyAllMigrations(runName) {
  for (const migrationFile of migrationFiles) {
    executeJson([
      "d1",
      "execute",
      databaseName,
      "--file",
      migrationFile,
      "--local",
      "--persist-to",
      getPersistPath(runName),
      "--json"
    ]);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureRunDirectory(runName) {
  const runDirectory = join(validationRoot, runName);
  mkdirSync(runDirectory, { recursive: true });
}

function getSchemaSnapshot(runName) {
  const tables = queryRows(
    runName,
    `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN (${expectedTables.map((name) => `'${name}'`).join(", ")})
      ORDER BY name;
    `
  );
  const indexes = queryRows(
    runName,
    `
      SELECT name, tbl_name, sql
      FROM sqlite_master
      WHERE type = 'index'
        AND name IN (${expectedIndexes.map((name) => `'${name}'`).join(", ")})
      ORDER BY name;
    `
  );

  return { indexes, tables };
}

function validateTableList(snapshot) {
  const tableNames = snapshot.tables.map((row) => row.name);
  assert(
    JSON.stringify(tableNames) === JSON.stringify(expectedTables),
    `Expected tables ${expectedTables.join(", ")} but found ${tableNames.join(", ")}.`
  );
}

function validateIndexList(snapshot) {
  const indexNames = snapshot.indexes.map((row) => row.name);
  assert(
    JSON.stringify(indexNames) === JSON.stringify(expectedIndexes),
    `Expected indexes ${expectedIndexes.join(", ")} but found ${indexNames.join(", ")}.`
  );
}

function validateTableConstraints(snapshot) {
  const sqlByTable = Object.fromEntries(
    snapshot.tables.map((row) => [row.name, row.sql ?? ""])
  );

  assert(
    sqlByTable.prompts.includes("project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE"),
    "prompts is missing the project foreign key constraint."
  );
  assert(
    sqlByTable.prompt_versions.includes("UNIQUE (prompt_id, version_number)") &&
      sqlByTable.prompt_versions.includes("CHECK (status IN ('DRAFT', 'RELEASED', 'ARCHIVED'))"),
    "prompt_versions is missing the expected uniqueness or status constraint."
  );
  assert(
    sqlByTable.datasets.includes("item_count INTEGER NOT NULL DEFAULT 0") &&
      sqlByTable.datasets.includes("CHECK (type IN ('GENERATION', 'EXTRACTION', 'CLASSIFICATION'))"),
    "datasets is missing the type constraint or denormalized item count."
  );
  assert(
    sqlByTable.eval_configs.includes("rules TEXT NOT NULL"),
    "eval_configs is missing the rules JSON column."
  );
  assert(
    sqlByTable.eval_runs.includes("CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'))") &&
      sqlByTable.eval_runs.includes("summary TEXT"),
    "eval_runs is missing the status guard or summary JSON column."
  );
  assert(
    sqlByTable.eval_run_items.includes("CHECK (verdict IN ('IMPROVED', 'REGRESSED', 'SAME', 'UNKNOWN'))") &&
      sqlByTable.eval_run_items.includes("delta TEXT"),
    "eval_run_items is missing the verdict guard or delta JSON column."
  );
  assert(
    sqlByTable.runs.includes("CHECK (source IN ('SDK', 'UI', 'EVAL'))") &&
      sqlByTable.runs.includes("metrics TEXT"),
    "runs is missing the source guard or metrics JSON column."
  );
  assert(
    sqlByTable.provider_keys.includes("CHECK (provider IN ('OPENAI', 'ANTHROPIC', 'GROQ', 'TOGETHER', 'CUSTOM'))") &&
      sqlByTable.provider_keys.includes("UNIQUE (project_id, provider)"),
    "provider_keys is missing the provider guard or uniqueness constraint."
  );
  assert(
    sqlByTable.audit_events.includes("metadata TEXT"),
    "audit_events is missing the metadata JSON column."
  );
}

function validateForeignKeys(runName) {
  for (const [tableName, expectedTargets] of Object.entries(foreignKeyTargets)) {
    const rows = queryRows(runName, `PRAGMA foreign_key_list('${tableName}');`);
    const actualTargets = rows.map((row) => row.table).sort();
    const sortedExpectedTargets = [...expectedTargets].sort();

    assert(
      JSON.stringify(actualTargets) === JSON.stringify(sortedExpectedTargets),
      `${tableName} foreign keys were ${actualTargets.join(", ")} instead of ${sortedExpectedTargets.join(", ")}.`
    );
  }
}

function validateMigrationTracking(runName) {
  const rows = queryRows(
    runName,
    "SELECT name FROM _migrations ORDER BY name;"
  );
  const trackedNames = rows.map((row) => row.name);

  assert(
    JSON.stringify(trackedNames) === JSON.stringify(migrationNames),
    `Expected _migrations rows ${migrationNames.join(", ")} but found ${trackedNames.join(", ")}.`
  );
}

function validateQueryPlans(runName) {
  for (const check of hotPathQueryPlans) {
    const rows = queryRows(runName, check.sql);
    const planDetails = rows.map((row) => String(row.detail ?? "")).join(" | ");

    assert(
      planDetails.includes(check.expectedIndex),
      `${check.name} did not use ${check.expectedIndex}. Query plan: ${planDetails}`
    );
  }
}

for (const runName of ["run-a", "run-b"]) {
  ensureRunDirectory(runName);
}

applyAllMigrations("run-a");
const baselineSchema = getSchemaSnapshot("run-a");
validateTableList(baselineSchema);
validateIndexList(baselineSchema);
validateTableConstraints(baselineSchema);
validateForeignKeys("run-a");
validateMigrationTracking("run-a");
validateQueryPlans("run-a");

applyAllMigrations("run-a");
const replayedSchema = getSchemaSnapshot("run-a");
assert(
  JSON.stringify(replayedSchema) === JSON.stringify(baselineSchema),
  "Reapplying the full migration chain changed the schema snapshot."
);
validateMigrationTracking("run-a");
validateQueryPlans("run-a");

applyAllMigrations("run-b");
const cleanReplaySchema = getSchemaSnapshot("run-b");
validateTableList(cleanReplaySchema);
validateIndexList(cleanReplaySchema);
validateTableConstraints(cleanReplaySchema);
validateForeignKeys("run-b");
validateMigrationTracking("run-b");
validateQueryPlans("run-b");
assert(
  JSON.stringify(cleanReplaySchema) === JSON.stringify(baselineSchema),
  "Fresh local migration replay produced a different schema snapshot."
);

console.log(
  "Full D1 migration validation passed on repeated and clean local replays, including index and _migrations checks."
);
