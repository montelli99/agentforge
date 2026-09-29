import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve("research/results/mimo-adapter-smoke-matrix.json");
const artifact = JSON.parse(await readFile(path, "utf8"));
const expected = new Set(["mimo-v2.5", "mimo-v2.5-pro"]);
const records = Array.isArray(artifact.records) ? artifact.records : [];
const models = new Set(records.map((record) => record.model));
const failures = [];
if (artifact.syntheticTask !== true) failures.push("artifact must be synthetic");
if (models.size !== expected.size || [...expected].some((model) => !models.has(model))) failures.push("both approved MiMo models must be present");
for (const record of records) {
  if (record.status !== "passed") failures.push(`${record.model}: status is not passed`);
  if (record.syntheticTask !== true) failures.push(`${record.model}: syntheticTask must remain true`);
  if (record.externalApiSpendUsd !== "unmeasured") failures.push(`${record.model}: billing must remain unmeasured`);
  if (typeof record.response !== "string" || !record.response.includes("Friday")) failures.push(`${record.model}: required response fact missing`);
}
const result = { valid: failures.length === 0, artifact: path, models: [...models], failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
