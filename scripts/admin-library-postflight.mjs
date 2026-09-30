import { execFileSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(new URL("..", import.meta.url).pathname);
const baselinePath = resolve(repositoryRoot, process.argv[2] ?? "docs/admin-library-preflight-before.json");
const currentPath = resolve(repositoryRoot, process.argv[3] ?? "docs/admin-library-postflight-after.json");

const preflightPath = resolve(repositoryRoot, "scripts/admin-library-preflight.mjs");
execFileSync(process.execPath, [preflightPath, currentPath], { cwd: repositoryRoot, stdio: "inherit" });

function comparable(report) {
  const copy = structuredClone(report);
  delete copy.generatedAt;
  delete copy.canonicalSha256;
  return JSON.stringify(copy);
}

const [baseline, current] = await Promise.all([
  readFile(baselinePath, "utf8").then(JSON.parse),
  readFile(currentPath, "utf8").then(JSON.parse),
]);
const equal = comparable(baseline) === comparable(current);
if (!equal) {
  console.error(JSON.stringify({ ok: false, error: "Admin-Diff erkannt", baselinePath, currentPath }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, adminDiff: false, baselinePath, currentPath }, null, 2));
}
await rm(currentPath, { force: true });
