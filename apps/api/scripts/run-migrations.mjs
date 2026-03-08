import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { databaseName, migrationFiles } from "./migration-manifest.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const workspaceRoot = join(__dirname, "..");
const wranglerPackageJson = require.resolve("wrangler/package.json");
const wranglerPackage = require(wranglerPackageJson);
const wranglerBin = join(
  wranglerPackageJson.replace("package.json", ""),
  wranglerPackage.bin.wrangler
);

const args = process.argv.slice(2);
const isRemote = args.includes("--remote");
const modeFlag = isRemote ? "--remote" : "--local";
const persistToIndex = args.indexOf("--persist-to");
const persistTo =
  persistToIndex >= 0 ? args[persistToIndex + 1] : undefined;

if (persistToIndex >= 0 && !persistTo) {
  throw new Error("Expected a path after --persist-to.");
}

for (const migrationFile of migrationFiles) {
  const wranglerArgs = [
    "d1",
    "execute",
    databaseName,
    "--file",
    migrationFile,
    modeFlag,
    "--yes"
  ];

  if (persistTo) {
    wranglerArgs.push("--persist-to", persistTo);
  }

  console.log(`Applying ${migrationFile} (${modeFlag.replace("--", "")})...`);

  execFileSync(process.execPath, [wranglerBin, ...wranglerArgs], {
    cwd: workspaceRoot,
    stdio: "inherit"
  });
}
