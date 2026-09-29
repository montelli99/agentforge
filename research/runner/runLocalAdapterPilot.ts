import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { OllamaModelProvider } from "../../src/providers/models/ollamaModel.js";
import { scoreProtocolCase } from "./protocolFamilyScorer.js";
import { buildPilotPrompt } from "./pilotConditions.js";
import { buildAgentForgeContext } from "./afPilotContext.js";
import { TrajectoryLedger } from "./trajectoryLedger.js";

const root = resolve(import.meta.dirname, "../..");
const model = process.env.AGENTFORGE_LOCAL_MODEL?.trim();
if (!model) throw new Error("AGENTFORGE_LOCAL_MODEL is required; no model is selected by default");
if (/^qwen/i.test(model)) throw new Error("Qwen routes are excluded by the approved research plan");
const provider = new OllamaModelProvider(process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434");
const fixture = JSON.parse(await (await import("node:fs/promises")).readFile(resolve(root, "research/tasks/protocol-families-v1.json"), "utf8")) as { families: Array<{ cases: Array<{ id: string; input: { task: string }; expected: { requiredFact: string } }> }> };
const cases = fixture.families.flatMap((family) => family.cases);
const conditions = ["B0", "B1", "AF"] as const;
const records: Array<Record<string, unknown>> = [];
const output = resolve(root, "research/results/local-adapter-pilot-v0.1.json");
const outputOverride = process.env.AGENTFORGE_PILOT_OUTPUT?.trim();
const pilotOutput = outputOverride ? resolve(root, outputOverride) : output;
const runLabel = process.env.AGENTFORGE_PILOT_RUN_ID?.trim() || "v0.1";
const ledger = new TrajectoryLedger(resolve(root, "research/results/local-adapter-pilot-ledger.json"), 0);
try { const prior = JSON.parse(await readFile(pilotOutput, "utf8")) as { records?: Array<Record<string, unknown>> }; records.push(...(prior.records ?? []).filter((record) => record.status === "completed")); } catch { /* first run */ }
const completedIds = new Set(records.map((record) => String(record.trajectoryId)));
const maxTrajectories = Number(process.env.AGENTFORGE_PILOT_LIMIT ?? Number.POSITIVE_INFINITY);
const timeoutMs = Number(process.env.AGENTFORGE_PILOT_TIMEOUT_MS ?? 10_000);
if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) throw new Error("AGENTFORGE_PILOT_TIMEOUT_MS must be an integer between 1000 and 120000");
let attempted = 0;
pilot: for (const condition of conditions) for (const item of cases) for (let replicate = 1; replicate <= 2; replicate++) {
  if (attempted++ >= maxTrajectories) break pilot;
  const trajectoryId = `agentforge-pilot-${runLabel}:${model}:${condition}:${item.id}:r${replicate}`;
  if (completedIds.has(trajectoryId)) continue;
  const startedAt = new Date().toISOString();
  const record: Record<string, unknown> = { trajectoryId, condition, taskId: item.id, replicate, model, status: "failed", usage: "unknown", cost: "unknown", startedAt };
  try {
    await ledger.start(trajectoryId, 0);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let taskPrompt = buildPilotPrompt(condition, item.input.task);
    if (condition === "AF") {
      const afContext = await buildAgentForgeContext(item.input.task);
      taskPrompt = `${taskPrompt}\n${afContext.prompt}`;
      record.contextAudit = { tenantId: afContext.tenantId, memoryHit: afContext.memoryHit };
    }
    const response = await provider.generate({ model, messages: [{ role: "user", content: taskPrompt }], temperature: 0, maxTokens: 128, responseFormat: "json", signal: controller.signal });
    clearTimeout(timeout);
    const score = scoreProtocolCase(item, response.content);
    record.status = "completed";
    record.response = response.content.slice(0, 2000);
    record.score = score;
    record.usage = response.usage;
    record.cost = { externalUsd: 0, source: "local-ollama" };
    await ledger.complete(trajectoryId, response.usage, 0);
  } catch (error) { record.error = error instanceof Error ? error.message : String(error); await ledger.fail(trajectoryId).catch(() => {}); }
  record.endedAt = new Date().toISOString();
  records.push(record);
  await mkdir(resolve(root, "research/results"), { recursive: true });
  await writeFile(pilotOutput, JSON.stringify({ schemaVersion: 1, kind: "local-adapter-pilot", runLabel, model, total: records.length, records }, null, 2));
}
await mkdir(resolve(root, "research/results"), { recursive: true });
await writeFile(pilotOutput, JSON.stringify({ schemaVersion: 1, kind: "local-adapter-pilot", runLabel, model, total: records.length, records }, null, 2));
console.log(JSON.stringify({ output: pilotOutput, runLabel, model, total: records.length, completed: records.filter((r) => r.status === "completed").length, passed: records.filter((r) => (r.score as { passed?: boolean } | undefined)?.passed).length }, null, 2));
