import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type RecordRow = { condition: string; status: string; score?: { passed?: boolean }; usage?: { totalTokens?: number }; cost?: { externalUsd?: number } };
type Pilot = { model: string; runLabel?: string; records: RecordRow[] };
const root = resolve(import.meta.dirname, "../..");
const input = process.env.AGENTFORGE_PILOT_OUTPUT?.trim() || "research/results/local-adapter-pilot-phi3.5-v0.4.json";
const output = process.env.AGENTFORGE_PILOT_COMPARISON_OUTPUT?.trim() || "research/results/local-adapter-pilot-phi3.5-v0.4-comparison.json";
const pilot = JSON.parse(await readFile(resolve(root, input), "utf8")) as Pilot;
const conditions = ["B0", "B1", "AF"];
const rows = conditions.map(condition => {
  const records = pilot.records.filter(record => record.condition === condition);
  const completed = records.filter(record => record.status === "completed");
  const passed = completed.filter(record => record.score?.passed === true);
  const totalTokens = completed.reduce((sum, record) => sum + (record.usage?.totalTokens ?? 0), 0);
  return {
    condition,
    planned: records.length,
    completed: completed.length,
    scorerPassed: passed.length,
    passRate: completed.length ? Number((passed.length / completed.length).toFixed(4)) : null,
    totalTokens,
    averageTokens: completed.length ? Number((totalTokens / completed.length).toFixed(2)) : null,
    externalSpendUsd: completed.reduce((sum, record) => sum + (record.cost?.externalUsd ?? 0), 0),
  };
});
const result = {
  schemaVersion: 1,
  kind: "local-adapter-pilot-comparison",
  source: input,
  model: pilot.model,
  runLabel: pilot.runLabel ?? "unknown",
  rows,
  interpretation: "Descriptive development-pilot comparison only; no statistical or superiority claim.",
};
await writeFile(resolve(root, output), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
