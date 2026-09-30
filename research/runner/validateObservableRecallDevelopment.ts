/** Re-score the private v2 checkpoint without making a provider call. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

type Condition = "B0" | "B1" | "AF";
type RecordItem = { id: string; condition: Condition; stage: "exposure" | "final";
  status: string; response?: string; latencyMs: number;
  usage?: { promptTokens: number; completionTokens: number }; retrievalHit?: boolean };
const root = resolve(import.meta.dirname, "../..");
const fixtureRaw = await readFile(resolve(root, "research/tasks/observable-development-v2.json"));
const fixtureHash = createHash("sha256").update(fixtureRaw).digest("hex");
const fixture = JSON.parse(fixtureRaw.toString("utf8")) as { families: Array<{ id: string;
  cases: Array<{ id: string; expected: { requiredOutcome: { answerContains: string };
    forbiddenOutcomes: Array<{ answerContains: string }> } }> }> };
const item = fixture.families.find(family => family.id === "delayed-recall")?.cases[0];
if (!item) throw new Error("Recall fixture missing");
const runId = `observable-recall-v2-${fixtureHash.slice(0, 10)}-mimo-v2.5-pro`;
const privateDir = resolve(process.env.AGENTFORGE_RESEARCH_PRIVATE_DIR ||
  resolve(process.env.LOCALAPPDATA || homedir(), "AgentForge", "research-private"));
const raw = await readFile(resolve(privateDir, `${runId}.json`));
const artifact = JSON.parse(raw.toString("utf8")) as { runId: string; fixtureHash: string;
  records: RecordItem[] };
const summary = JSON.parse(await readFile(resolve(root,
  "research/results/observable-recall-development-v2-summary.json"), "utf8")) as {
    runId: string; fixtureHash: string; rawSha256: string; taskId: string;
    attemptedCalls: number; completedCalls: number;
    conditions: Record<Condition, { validAnswer: boolean; retrievalHit: boolean | null;
      latencyMs: number; promptTokens: number; completionTokens: number }> };
if (artifact.runId !== runId || summary.runId !== runId || artifact.fixtureHash !== fixtureHash ||
    summary.fixtureHash !== fixtureHash || summary.taskId !== item.id ||
    summary.rawSha256 !== createHash("sha256").update(raw).digest("hex")) {
  throw new Error("Recall checkpoint identity or hash mismatch");
}
const ids = new Set(artifact.records.map(record => record.id));
if (artifact.records.length !== 6 || ids.size !== 6 || summary.attemptedCalls !== 6 ||
    summary.completedCalls !== artifact.records.filter(record => record.status === "completed").length) {
  throw new Error("Expected six distinct checkpointed calls");
}
const required = item.expected.requiredOutcome.answerContains.toLowerCase();
const forbidden = item.expected.forbiddenOutcomes.map(value => value.answerContains.toLowerCase());
for (const condition of ["B0", "B1", "AF"] as const) {
  const calls = artifact.records.filter(record => record.condition === condition);
  const exposure = calls.find(record => record.stage === "exposure");
  const final = calls.find(record => record.stage === "final");
  if (calls.length !== 2 || !exposure || !final || calls.some(record => record.status !== "completed" ||
      !record.response?.trim() || !record.usage || record.usage.promptTokens <= 0 ||
      record.usage.completionTokens <= 0)) throw new Error(`Incomplete ${condition} calls`);
  const answer = final.response!.toLowerCase();
  const saved = summary.conditions[condition];
  if (!saved || saved.validAnswer !== (answer.includes(required) && forbidden.every(value => !answer.includes(value))) ||
      saved.retrievalHit !== (final.retrievalHit ?? null) ||
      saved.latencyMs !== calls.reduce((sum, record) => sum + record.latencyMs, 0) ||
      saved.promptTokens !== calls.reduce((sum, record) => sum + record.usage!.promptTokens, 0) ||
      saved.completionTokens !== calls.reduce((sum, record) => sum + record.usage!.completionTokens, 0)) {
    throw new Error(`Public summary mismatch for ${condition}`);
  }
}
console.log(JSON.stringify({ valid: true, calls: artifact.records.length, runId }));
