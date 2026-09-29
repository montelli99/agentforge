import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MiMoModelProvider } from "../../src/providers/models/mimoModel.js";

const models = ["mimo-v2.5", "mimo-v2.5-pro"] as const;
const provider = new MiMoModelProvider();
const records: Array<Record<string, unknown>> = [];
for (const model of models) {
  const startedAt = new Date().toISOString();
  const record: Record<string, unknown> = { model, startedAt, syntheticTask: true, externalApiSpendUsd: "unmeasured" };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await provider.generate({
        model,
        messages: [{ role: "user", content: "Synthetic smoke task. Return exactly JSON with requiredFact equal to Friday. Do not perform external actions." }],
        temperature: 0,
        maxTokens: 256,
      });
      record.response = response.content.slice(0, 2000);
      record.usage = response.usage;
      record.attempts = attempt;
      record.status = response.content.includes("Friday") ? "passed" : "failed-content-check";
      if (record.status === "passed") break;
    } catch (error) {
      record.status = "unavailable";
      record.error = error instanceof Error ? error.message : String(error);
    }
  }
  record.endedAt = new Date().toISOString();
  records.push(record);
}
const output = resolve(import.meta.dirname, "../results/mimo-adapter-smoke-matrix.json");
await mkdir(resolve(import.meta.dirname, "../results"), { recursive: true });
await writeFile(output, JSON.stringify({ schemaVersion: 1, kind: "mimo-adapter-smoke-matrix", syntheticTask: true, records }, null, 2));
console.log(JSON.stringify({ output, records }, null, 2));
if (records.some((record) => record.status !== "passed")) process.exitCode = 2;
