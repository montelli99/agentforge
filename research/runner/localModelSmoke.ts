import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const model = process.env.AGENTFORGE_LOCAL_MODEL?.trim();
const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const timeoutMs = Number(process.env.AGENTFORGE_SMOKE_TIMEOUT_MS ?? 30_000);
const startedAt = new Date().toISOString();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
const result: Record<string, unknown> = { schemaVersion: 1, model: model ?? "unconfigured", baseUrl, startedAt, timeoutMs, usage: "unknown", externalApiSpendUsd: 0 };
try {
  if (!model) throw new Error("AGENTFORGE_LOCAL_MODEL is required; no model is selected by default");
  if (/^qwen/i.test(model)) throw new Error("Qwen routes are excluded by the approved research plan");
  const response = await fetch(`${baseUrl}/api/generate`, { method: "POST", signal: controller.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ model, stream: false, options: { temperature: 0 }, prompt: "Synthetic smoke task. Return exactly JSON with requiredFact equal to Friday. Do not perform external actions." }) });
  const body = await response.json() as { response?: string; done?: boolean; prompt_eval_count?: number; eval_count?: number };
  if (!response.ok || typeof body.response !== "string") throw new Error(`ollama HTTP ${response.status}`);
  result.status = "passed";
  result.done = body.done === true;
  result.response = body.response.slice(0, 2000);
  if (typeof body.prompt_eval_count === "number" && typeof body.eval_count === "number") result.usage = { inputTokens: body.prompt_eval_count, outputTokens: body.eval_count, totalTokens: body.prompt_eval_count + body.eval_count, costSource: "local-ollama-no-api-charge" };
} catch (error) {
  result.status = "unavailable";
  result.error = error instanceof Error && error.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(error);
} finally {
  clearTimeout(timer);
}
result.endedAt = new Date().toISOString();
const output = resolve(import.meta.dirname, "../results/local-model-smoke.json");
await mkdir(resolve(import.meta.dirname, "../results"), { recursive: true });
await writeFile(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, output }, null, 2));
if (result.status !== "passed") process.exitCode = 2;
