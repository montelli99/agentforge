import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SemanticMemory, type EmbeddingProvider, type SemanticEntry, type SemanticMemoryPersistence } from "../../src/semanticMemory.js";

const provider: EmbeddingProvider = {
  dimension: 2,
  async embed(text: string) {
    const value = text.toLowerCase();
    return [value.includes("handoff") ? 1 : 0, value.includes("friday") ? 1 : 0];
  },
};

const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "agentforge-semantic-")), "memory.json");
const persistence: SemanticMemoryPersistence = {
  async load() {
    try { return JSON.parse(await fs.readFile(file, "utf8")) as SemanticEntry[]; }
    catch { return []; }
  },
  async save(entries) { await fs.writeFile(file, JSON.stringify(entries), "utf8"); },
};

const first = new SemanticMemory(provider, 10, 0.8, persistence);
await first.store({ prompt: "The handoff is Friday.", response: { deadline: "Friday" }, tenantId: "tenant-a", modelFamily: "fixture", tokenCount: 8 });
const restarted = new SemanticMemory(provider, 10, 0.8, persistence);
await restarted.initialize();
const retained = await restarted.query({ prompt: "The handoff is Friday.", tenantId: "tenant-a", modelFamily: "fixture" });

console.log(JSON.stringify({
  experimentId: "durable-memory-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  persistedEntryCount: restarted.getEntryCount(),
  retainedAcrossNewInstance: retained.hit,
  response: retained.entry?.response,
  interpretation: "This verifies the new persistence adapter across separate SemanticMemory instances in one process. A separate-process acceptance run is still required.",
}, null, 2));
