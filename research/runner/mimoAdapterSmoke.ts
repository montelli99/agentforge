import { MiMoModelProvider } from "../../src/providers/models/mimoModel.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const model = process.env.AGENTFORGE_MIMO_MODEL ?? "mimo-v2.5";
const provider = new MiMoModelProvider();
const startedAt = new Date().toISOString();
const result: Record<string, unknown> = {
  schemaVersion: 1,
  adapter: "AgentForge.MiMoModelProvider",
  model,
  startedAt,
  syntheticTask: true,
  externalApiSpendUsd: "unmeasured",
};
try {
  if (!(await provider.isAvailable())) throw new Error("MiMo provider unavailable");
  const response = await provider.generate({
    model,
    messages: [{ role: "user", content: "Synthetic smoke task. Return exactly JSON with requiredFact equal to Friday. Do not perform external actions." }],
    temperature: 0,
    maxTokens: 512,
    responseFormat: "json",
  });
  result.response = response.content.slice(0, 2000);
  result.usage = response.usage;
  result.finishReason = response.finishReason;
  if (!response.content.includes("Friday")) throw new Error("MiMo response omitted required fact");
  result.status = "passed";
  result.response = response.content.slice(0, 2000);
  result.usage = response.usage;
} catch (error) {
  result.status = "unavailable";
  result.error = error instanceof Error ? error.message : String(error);
}
result.endedAt = new Date().toISOString();
const safeModel = model.replace(/[^a-zA-Z0-9._-]/g, "_");
const output = resolve(import.meta.dirname, `../results/mimo-adapter-smoke-${safeModel}.json`);
await mkdir(resolve(import.meta.dirname, "../results"), { recursive: true });
await writeFile(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.status !== "passed") process.exitCode = 2;
