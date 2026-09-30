/** A bounded development slice, not the full six-family AgentForge study. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { MiMoModelProvider } from "../../src/providers/models/mimoModel.js";
import { RealEmbeddingProvider } from "../../src/embeddingAdapter.js";
import { SemanticMemory } from "../../src/semanticMemory.js";
import { MemoryContextOptimizer } from "../../src/memoryContextOptimizer.js";
import { scoreProtocolCase } from "./protocolFamilyScorer.js";
import { TrajectoryLedger } from "./trajectoryLedger.js";

type Case = { id: string; input: { task: string }; expected: { requiredFact: string } };
type Source = { id: string; source: string };
type Condition = "B0" | "B1" | "AF";

const root = resolve(import.meta.dirname, "../..");
const model = "mimo-v2.5-pro";
const runId = "mimo-memory-recall-development-v1";
const privateDir = resolve(process.env.AGENTFORGE_RESEARCH_PRIVATE_DIR || resolve(process.env.LOCALAPPDATA || homedir(), "AgentForge", "research-private"));
if (privateDir.toLowerCase() === root.toLowerCase() || privateDir.toLowerCase().startsWith(`${root.toLowerCase()}${sep}`)) throw new Error("Raw research artifacts must stay outside the public repository");
const resultPath = resolve(privateDir, "mimo-memory-recall-development-v1.json");
const summaryPath = resolve(root, "research/results/mimo-memory-recall-development-v1-summary.json");
const ledger = new TrajectoryLedger(resolve(privateDir, "mimo-memory-recall-development-v1-ledger.json"), 0);
const fixture = JSON.parse(await readFile(resolve(root, "research/tasks/protocol-families-v1.json"), "utf8")) as { families: Array<{ cases: Case[] }> };
const sourceFixture = JSON.parse(await readFile(resolve(root, "research/tasks/memory-recall-development-v1.json"), "utf8")) as { cases: Source[] };
const cases = fixture.families.flatMap(family => family.cases).filter(item => sourceFixture.cases.some(source => source.id === item.id));
if (cases.length !== 2 || sourceFixture.cases.length !== 2) throw new Error("Development recall case/source mismatch");
const sourceById = new Map(sourceFixture.cases.map(item => [item.id, item.source]));
const provider = new MiMoModelProvider();
if (!(await provider.isAvailable())) throw new Error("MiMo route unavailable");

type RecordItem = {
  id: string; taskId: string; condition: Condition; replicate: number; model: string;
  status: "completed" | "failed"; startedAt: string; endedAt: string; latencyMs: number;
  response?: string; score?: ReturnType<typeof scoreProtocolCase>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  finishReason?: string; retrievalHit?: boolean; error?: string;
  costUsd: "unknown";
};
let records: RecordItem[] = [];
try {
  const saved = JSON.parse(await readFile(resultPath, "utf8")) as { records?: RecordItem[] };
  records = saved.records ?? [];
} catch { /* New development run. */ }
const done = new Set(records.map(item => item.id));

async function promptFor(item: Case, source: string, condition: Condition): Promise<{ text: string; retrievalHit?: boolean }> {
  const instruction = "Answer the current synthetic task in one concise sentence. Use only supplied context. If the needed fact is absent, say unknown. Do not claim any external action.";
  if (condition === "B0") return { text: `${instruction}\nCurrent task: ${item.input.task}` };
  if (condition === "B1") return { text: `${instruction}\nRolling summary of prior context: ${source}\nCurrent task: ${item.input.task}` };

  const embeddings = new RealEmbeddingProvider({ provider: "none", fallbackToHash: true });
  await embeddings.initialize();
  const memory = new SemanticMemory(embeddings, 32, 0.8);
  const tenantId = `synthetic-${item.id}`;
  await memory.store({ prompt: item.input.task, response: source, tenantId, modelFamily: "mimo", tokenCount: 30 });
  const optimizer = new MemoryContextOptimizer({ memory, similarityThreshold: 0.8, maxMemoryTokens: 128, memoryBypass: false });
  const context = await optimizer.optimizePrompt({ prompt: item.input.task, tenantId, modelFamily: "mimo" });
  return { text: `${instruction}\n${context.optimizedPrompt}`, retrievalHit: context.cacheHit };
}

async function save(): Promise<void> {
  await mkdir(privateDir, { recursive: true });
  await writeFile(resultPath, JSON.stringify({ schemaVersion: 1, kind: "development-memory-recall-slice", runId, model, records }, null, 2));
}

for (let replicate = 1; replicate <= 2; replicate++) {
  for (const item of cases) {
    const source = sourceById.get(item.id);
    if (!source) throw new Error(`Missing synthetic source: ${item.id}`);
    // Rotate order so one condition does not always see an earlier provider state.
    const order: Condition[] = replicate === 1 ? ["B0", "B1", "AF"] : ["AF", "B1", "B0"];
    for (const condition of order) {
      const id = `${runId}:${model}:${condition}:${item.id}:r${replicate}`;
      if (done.has(id)) continue;
      const startedAt = new Date().toISOString();
      const started = performance.now();
      const record: RecordItem = { id, taskId: item.id, condition, replicate, model, status: "failed", startedAt, endedAt: startedAt, latencyMs: 0, costUsd: "unknown" };
      try {
        await ledger.start(id, 0);
        const prompt = await promptFor(item, source, condition);
        record.retrievalHit = prompt.retrievalHit;
        const response = await provider.generate({ model, messages: [{ role: "user", content: prompt.text }], temperature: 0, maxTokens: 512 });
        record.response = response.content.slice(0, 2000);
        record.usage = response.usage;
        record.finishReason = response.finishReason;
        record.score = scoreProtocolCase(item, response.content);
        record.status = "completed";
        await ledger.complete(id, { inputTokens: response.usage.promptTokens, outputTokens: response.usage.completionTokens, totalTokens: response.usage.totalTokens, currency: "USD", costSource: "provider-usage-unpriced" }, "unknown");
      } catch (error) {
        record.error = error instanceof Error ? error.message : String(error);
        await ledger.fail(id).catch(() => {});
      }
      record.endedAt = new Date().toISOString();
      record.latencyMs = Math.round(performance.now() - started);
      records.push(record);
      done.add(id);
      await save();
    }
  }
}
const summary = Object.fromEntries((["B0", "B1", "AF"] as const).map(condition => {
  const group = records.filter(item => item.condition === condition);
  return [condition, {
    attempted: group.length,
    completed: group.filter(item => item.status === "completed").length,
    passed: group.filter(item => item.score?.passed).length,
    promptTokens: group.reduce((total, item) => total + (item.usage?.promptTokens ?? 0), 0),
    completionTokens: group.reduce((total, item) => total + (item.usage?.completionTokens ?? 0), 0),
    retrievalHits: group.filter(item => item.retrievalHit).length,
  }];
}));
const rawSha256 = createHash("sha256").update(await readFile(resultPath)).digest("hex");
await mkdir(resolve(root, "research/results"), { recursive: true });
await writeFile(summaryPath, JSON.stringify({ schemaVersion: 1, kind: "development-memory-recall-summary", runId, model, rawSha256, summary, limitations: ["development-only", "hash-fallback embeddings", "billing unknown", "not full production execution"] }, null, 2));
console.log(JSON.stringify({ summaryPath, runId, model, summary }));
