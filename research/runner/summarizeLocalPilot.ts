import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const inputName = process.env.AGENTFORGE_PILOT_OUTPUT?.trim() || "research/results/local-adapter-pilot-v0.1.json";
const input = JSON.parse(await readFile(resolve(root, inputName), "utf8")) as { records: Array<{ condition: string; status: string; score?: { passed?: boolean }; usage?: { totalTokens?: number } }> };
const conditions = ["B0", "B1", "AF"];
const summary = conditions.map((condition) => {
  const records = input.records.filter((item) => item.condition === condition);
  const completed = records.filter((item) => item.status === "completed");
  return { condition, planned: records.length, completed: completed.length, failed: records.length - completed.length, scorerPassed: completed.filter((item) => item.score?.passed === true).length, totalTokens: completed.reduce((sum, item) => sum + (item.usage?.totalTokens ?? 0), 0), externalSpendUsd: 0 };
});
const outputName = process.env.AGENTFORGE_PILOT_SUMMARY_OUTPUT?.trim() || "research/results/local-adapter-pilot-summary.json";
const output = { schemaVersion: 1, kind: "local-adapter-pilot-summary", source: inputName, totalRecords: input.records.length, summary, interpretation: "Local adapter pilot only; not final comparative evidence. Timeouts remain in denominators and external spend is zero." };
await writeFile(resolve(root, outputName), JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
