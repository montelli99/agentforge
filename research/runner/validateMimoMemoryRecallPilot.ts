/** Independently re-score private raw trajectories against the public aggregate. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { scoreProtocolCase } from "./protocolFamilyScorer.js";

const root = resolve(import.meta.dirname, "../..");
const privateDir = resolve(process.env.AGENTFORGE_RESEARCH_PRIVATE_DIR || resolve(process.env.LOCALAPPDATA || homedir(), "AgentForge", "research-private"));
const raw = await readFile(resolve(privateDir, "mimo-memory-recall-development-v1.json"));
const artifact = JSON.parse(raw.toString("utf8")) as { records: Array<{
  id: string; taskId: string; condition: "B0" | "B1" | "AF"; replicate: number;
  status: string; response?: string; score?: { passed: boolean };
  usage?: { promptTokens: number; completionTokens: number }; retrievalHit?: boolean;
}> };
const publicSummary = JSON.parse(await readFile(resolve(root, "research/results/mimo-memory-recall-development-v1-summary.json"), "utf8")) as {
  rawSha256: string; summary: Record<string, Record<string, number>>;
};
const fixture = JSON.parse(await readFile(resolve(root, "research/tasks/protocol-families-v1.json"), "utf8")) as {
  families: Array<{ cases: Array<{ id: string; expected: { requiredFact: string } }> }>;
};
const cases = new Map(fixture.families.flatMap(family => family.cases).map(item => [item.id, item]));
const digest = createHash("sha256").update(raw).digest("hex");
if (publicSummary.rawSha256 !== digest) throw new Error("Raw artifact hash does not match public summary");
const seen = new Set<string>();
for (const record of artifact.records) {
  if (seen.has(record.id)) throw new Error("Duplicate trajectory ID");
  seen.add(record.id);
  const item = cases.get(record.taskId);
  if (!item || !record.response || record.status !== "completed" || !record.usage || !record.score) throw new Error("Incomplete trajectory");
  if (record.score.passed !== scoreProtocolCase(item, record.response).passed) throw new Error("Saved score differs from independent scorer");
  if (record.usage.promptTokens <= 0 || record.usage.completionTokens <= 0) throw new Error("Provider usage missing");
}
if (artifact.records.length !== 12 || seen.size !== 12) throw new Error("Expected exactly 12 distinct development trajectories");
for (const condition of ["B0", "B1", "AF"] as const) {
  const group = artifact.records.filter(item => item.condition === condition);
  const saved = publicSummary.summary[condition];
  if (group.length !== 4 || saved?.attempted !== 4 || saved.completed !== 4) throw new Error(`Incomplete ${condition} group`);
  if (saved.passed !== group.filter(item => item.score?.passed).length ||
      saved.promptTokens !== group.reduce((total, item) => total + (item.usage?.promptTokens ?? 0), 0) ||
      saved.completionTokens !== group.reduce((total, item) => total + (item.usage?.completionTokens ?? 0), 0) ||
      saved.retrievalHits !== group.filter(item => item.retrievalHit).length) throw new Error(`Summary mismatch for ${condition}`);
}
console.log(JSON.stringify({ valid: true, trajectories: seen.size, rawSha256: digest }));
