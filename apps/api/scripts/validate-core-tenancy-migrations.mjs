import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const workspaceRoot = join(__dirname, "..");
const migrationFile = "src/db/migrations/001_core_tenancy.sql";
const databaseName = "promptops-db";
const runRoot = join(workspaceRoot, ".wrangler", "state", "task-6-2");
const wranglerPackageJson = require.resolve("wrangler/package.json");
const wranglerPackage = require(wranglerPackageJson);
const wranglerBin = join(
  wranglerPackageJson.replace("package.json", ""),
  wranglerPackage.bin.wrangler
);
const expectedTables = [
  "_migrations",
  "org_members",
  "orgs",
  "projects",
  "users"
];

function executeJson(args) {
  const output = execFileSync(process.execPath, [wranglerBin, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  });

  return JSON.parse(output);
}

function applyMigration(runName) {
  executeJson([
    "d1",
    "execute",
    databaseName,
    "--file",
    migrationFile,
    "--local",
    "--persist-to",
    join(".wrangler", "state", "task-6-2", runName),
    "--json"
  ]);
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
    join(".wrangler", "state", "task-6-2", runName),
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

  throw new Error(
    `Unexpected wrangler JSON payload: ${JSON.stringify(payload)}`
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resetRunDirectory(runName) {
  const runDirectory = join(runRoot, runName);
  rmSync(runDirectory, { force: true, recursive: true });
  mkdirSync(runDirectory, { recursive: true });
}

function getSchemaSnapshot(runName) {
  return queryRows(
    runName,
    `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('_migrations', 'users', 'orgs', 'org_members', 'projects')
      ORDER BY name;
    `
  );
}

function validateSchema(snapshot) {
  const tableNames = snapshot.map((row) => row.name);
  assert(
    JSON.stringify(tableNames) === JSON.stringify(expectedTables),
    `Expected core tenancy tables ${expectedTables.join(", ")} but found ${tableNames.join(", ")}.`
  );

  const orgMembersSql = snapshot.find((row) => row.name === "org_members")?.sql;
  const projectsSql = snapshot.find((row) => row.name === "projects")?.sql;
  const usersSql = snapshot.find((row) => row.name === "users")?.sql;

  assert(
    typeof usersSql === "string" &&
      usersSql.includes("github_id INTEGER UNIQUE NOT NULL"),
    "users table is missing the GitHub uniqueness constraint."
  );
  assert(
    typeof orgMembersSql === "string" &&
      orgMembersSql.includes(
        "CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER'))"
      ),
    "org_members table is missing the role constraint."
  );
  assert(
    typeof projectsSql === "string" &&
      projectsSql.includes("UNIQUE (org_id, slug)"),
    "projects table is missing the org-scoped slug uniqueness constraint."
  );
}

function validateForeignKeys(runName) {
  const orgMemberForeignKeys = queryRows(
    runName,
    "PRAGMA foreign_key_list('org_members');"
  );
  const projectForeignKeys = queryRows(
    runName,
    "PRAGMA foreign_key_list('projects');"
  );
  const orgMemberTargets = orgMemberForeignKeys.map((row) => row.table).sort();
  const projectTargets = projectForeignKeys.map((row) => row.table).sort();

  assert(
    JSON.stringify(orgMemberTargets) === JSON.stringify(["orgs", "users"]),
    `org_members foreign keys were ${orgMemberTargets.join(", ")} instead of orgs, users.`
  );
  assert(
    JSON.stringify(projectTargets) === JSON.stringify(["orgs"]),
    `projects foreign keys were ${projectTargets.join(", ")} instead of orgs.`
  );
}

function validateMigrationTracking(runName) {
  const rows = queryRows(
    runName,
    "SELECT name FROM _migrations ORDER BY name;"
  );

  assert(
    rows.some((row) => row.name === "001_core_tenancy.sql"),
    "Expected 001_core_tenancy.sql to be recorded in _migrations."
  );
}

for (const runName of ["run-a", "run-b"]) {
  resetRunDirectory(runName);
}

applyMigration("run-a");
const baselineSchema = getSchemaSnapshot("run-a");
validateSchema(baselineSchema);
validateForeignKeys("run-a");
validateMigrationTracking("run-a");

applyMigration("run-a");
const replayedSchema = getSchemaSnapshot("run-a");
assert(
  JSON.stringify(replayedSchema) === JSON.stringify(baselineSchema),
  "Reapplying 001_core_tenancy.sql changed the local schema snapshot."
);

applyMigration("run-b");
const cleanReplaySchema = getSchemaSnapshot("run-b");
validateSchema(cleanReplaySchema);
validateForeignKeys("run-b");
validateMigrationTracking("run-b");
assert(
  JSON.stringify(cleanReplaySchema) === JSON.stringify(baselineSchema),
  "Fresh local migration replay produced a different schema snapshot."
);

console.log(
  "Core tenancy migration validation passed on repeated and clean local D1 replays."
);
