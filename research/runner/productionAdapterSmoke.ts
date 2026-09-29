import { OllamaModelProvider } from "../../src/providers/models/ollamaModel.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const provider = new OllamaModelProvider(process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434");
const model = process.env.AGENTFORGE_LOCAL_MODEL?.trim();
const startedAt = new Date().toISOString();
const result: Record<string, unknown> = { schemaVersion: 1, adapter: "AgentForge.OllamaModelProvider", model: model ?? "unconfigured", startedAt, externalApiSpendUsd: 0 };
try {
  if (!model) throw new Error("AGENTFORGE_LOCAL_MODEL is required; no model is selected by default");
  if (/^qwen/i.test(model)) throw new Error("Qwen routes are excluded by the approved research plan");
  if (!(await provider.isAvailable())) throw new Error("local Ollama provider unavailable");
  const response = await provider.generate({ model, messages: [{ role: "user", content: "Synthetic smoke task. Return exactly JSON with requiredFact equal to Friday. Do not perform external actions." }], temperature: 0, maxTokens: 128, responseFormat: "json" });
  result.status = "passed";
  result.response = response.content.slice(0, 2000);
  result.usage = response.usage;
} catch (error) {
  result.status = "unavailable";
  result.error = error instanceof Error ? error.message : String(error);
}
result.endedAt = new Date().toISOString();
const output = resolve(import.meta.dirname, "../results/production-adapter-smoke.json");
await mkdir(resolve(import.meta.dirname, "../results"), { recursive: true });
result.output = output;
await writeFile(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.status !== "passed") process.exitCode = 2;
