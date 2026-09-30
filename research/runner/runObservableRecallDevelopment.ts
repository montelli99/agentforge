/** Bounded model-backed development run for the first observable v2 case. */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { RealEmbeddingProvider } from "../../src/embeddingAdapter.js";
import { MemoryContextOptimizer } from "../../src/memoryContextOptimizer.js";
import { MiMoModelProvider } from "../../src/providers/models/mimoModel.js";
import { SemanticMemory } from "../../src/semanticMemory.js";

type Condition = "B0" | "B1" | "AF";
type Stage = "exposure" | "final";
type RecordItem = { id: string; condition: Condition; stage: Stage; status: "completed" | "failed";
  startedAt: string; latencyMs: number; response?: string; finishReason?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  retrievalHit?: boolean; error?: string };
type Fixture = { families: Array<{ id: string; cases: Array<{ id: string; input: {
  task: string; priorEvents: Array<{ text: string }>; injectedEvents: Array<{ text: string }> };
  expected: { requiredOutcome: { answerContains: string }; forbiddenOutcomes: Array<{ answerContains: string }> } }> }> };

const root = resolve(import.meta.dirname, "../..");
const fixtureFile = resolve(root, "research/tasks/observable-development-v2.json");
const fixtureText = await readFile(fixtureFile, "utf8");
const fixtureHash = createHash("sha256").update(fixtureText).digest("hex");
const fixture = JSON.parse(fixtureText) as Fixture;
const item = fixture.families.find(family => family.id === "delayed-recall")?.cases[0];
if (!item?.input.priorEvents[0]?.text || !item.input.injectedEvents[0]?.text) throw new Error("Observable recall case is incomplete");
const privateDir = resolve(process.env.AGENTFORGE_RESEARCH_PRIVATE_DIR ||
  resolve(process.env.LOCALAPPDATA || homedir(), "AgentForge", "research-private"));
if (privateDir.toLowerCase() === root.toLowerCase() ||
    privateDir.toLowerCase().startsWith(`${root.toLowerCase()}${sep}`)) {
  throw new Error("Raw trajectories must stay outside the public repository");
}
const runId = `observable-recall-v2-${fixtureHash.slice(0, 10)}-mimo-v2.5-pro`;
const rawFile = resolve(privateDir, `${runId}.json`);
const summaryFile = resolve(root, "research/results/observable-recall-development-v2-summary.json");
let records: RecordItem[] = [];
try {
  const saved = JSON.parse(await readFile(rawFile, "utf8")) as { runId: string; records: RecordItem[] };
  if (saved.runId !== runId) throw new Error("Raw development checkpoint belongs to a different run");
  records = saved.records;
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const provider = new MiMoModelProvider();
if (!(await provider.isAvailable())) throw new Error("Approved MiMo route is unavailable");
const model = "mimo-v2.5-pro";
const source = item.input.priorEvents[0].text;
const distractor = item.input.injectedEvents[0].text;

async function save(): Promise<void> {
  await mkdir(privateDir, { recursive: true });
  const temporary = `${rawFile}.tmp`;
  await writeFile(temporary, JSON.stringify({ schemaVersion: 1, runId, fixtureHash, model, records }, null, 2));
  await rename(temporary, rawFile);
}

async function finalPrompt(condition: Condition): Promise<{ text: string; retrievalHit?: boolean }> {
  const common = `You are processing synthetic research data. Use only context supplied in this request. If the required fact is absent, say unknown.\nDistractor event: ${distractor}\nCurrent task: ${item!.input.task}`;
  if (condition === "B0") return { text: common };
  if (condition === "B1") return { text: `Rolling summary of earlier event: ${source}\n${common}` };
  const embedding = new RealEmbeddingProvider({ provider: "none", fallbackToHash: true });
  await embedding.initialize();
  const memory = new SemanticMemory(embedding, 32, 0.8);
  await memory.store({ prompt: item!.input.task, response: source, tenantId: "synthetic-recall-v2", modelFamily: "mimo", tokenCount: 30 });
  const optimizer = new MemoryContextOptimizer({ memory, similarityThreshold: 0.8,
    maxMemoryTokens: 128, memoryBypass: false });
  const context = await optimizer.optimizePrompt({ prompt: item!.input.task, tenantId: "synthetic-recall-v2", modelFamily: "mimo" });
  return { text: `${common}\n${context.optimizedPrompt}`, retrievalHit: context.cacheHit };
}

for (const condition of ["B0", "B1", "AF"] as const) {
  for (const stage of ["exposure", "final"] as const) {
    const id = `${runId}:${condition}:${stage}`;
    if (records.some(record => record.id === id)) continue; // Never repeat a charged call automatically.
    if (stage === "final" && !records.some(record => record.id === `${runId}:${condition}:exposure` && record.status === "completed")) {
      throw new Error(`Cannot run ${condition} final stage without a completed exposure`);
    }
    const prompt = stage === "exposure"
      ? { text: `Synthetic earlier event: ${source}\nAcknowledge in one sentence. Do not take an action.` }
      : await finalPrompt(condition);
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const record: RecordItem = { id, condition, stage, startedAt, status: "failed", latencyMs: 0,
      retrievalHit: prompt.retrievalHit };
    try {
      const result = await provider.generate({ model, messages: [{ role: "user", content: prompt.text }],
        temperature: 0, maxTokens: 512 });
      record.response = result.content.slice(0, 2000);
      record.finishReason = result.finishReason;
      record.usage = result.usage;
      if (!record.response.trim() || !["stop", "end_turn"].includes(result.finishReason || "")) {
        throw new Error("Provider did not return a complete text response");
      }
      record.status = "completed";
    } catch (error) {
      record.error = error instanceof Error ? error.message : String(error);
    }
    record.latencyMs = Math.round(performance.now() - started);
    records.push(record);
    await save();
  }
}
const required = item.expected.requiredOutcome.answerContains.toLowerCase();
const forbidden = item.expected.forbiddenOutcomes.map(outcome => outcome.answerContains.toLowerCase());
const rawSha256 = createHash("sha256").update(await readFile(rawFile)).digest("hex");
const summary = { runId, fixtureHash, rawSha256, model, split: "development", taskId: item.id,
  scope: "single-case context-retention diagnostic; not a full protocol trajectory",
  recentHistoryWindowEvents: 1,
  memoryMode: "in-memory hash-fallback; no process restart",
  attemptedCalls: records.length, completedCalls: records.filter(record => record.status === "completed").length,
  costUsd: "unknown", conditions: Object.fromEntries((["B0", "B1", "AF"] as const).map(condition => {
    const calls = records.filter(record => record.condition === condition);
    const final = calls.find(record => record.stage === "final");
    const answer = final?.response?.toLowerCase() || "";
    return [condition, { status: final?.status || "missing", validAnswer: final?.status === "completed" &&
      answer.includes(required) && forbidden.every(value => !answer.includes(value)),
      retrievalHit: final?.retrievalHit ?? null, latencyMs: calls.reduce((sum, call) => sum + call.latencyMs, 0),
      promptTokens: calls.reduce((sum, call) => sum + (call.usage?.promptTokens || 0), 0),
      completionTokens: calls.reduce((sum, call) => sum + (call.usage?.completionTokens || 0), 0) }];
  })) };
await writeFile(summaryFile, JSON.stringify(summary, null, 2));
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
