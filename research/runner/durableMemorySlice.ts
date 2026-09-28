import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { SemanticMemory, type EmbeddingProvider, type SemanticEntry, type SemanticMemoryPersistence } from "../../src/semanticMemory.js";

const provider: EmbeddingProvider = {
  dimension: 2,
  async embed(text: string) {
    const value = text.toLowerCase();
    return [value.includes("handoff") ? 1 : 0, value.includes("friday") ? 1 : 0];
  },
};

const file = process.argv[3] || path.join(await fs.mkdtemp(path.join(os.tmpdir(), "agentforge-semantic-")), "memory.json");
const persistence: SemanticMemoryPersistence = {
  async load() {
    try { return JSON.parse(await fs.readFile(file, "utf8")) as SemanticEntry[]; }
    catch { return []; }
  },
  async save(entries) { await fs.writeFile(file, JSON.stringify(entries), "utf8"); },
};

function runChild(mode: "write" | "read"): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", process.argv[1], mode, file], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr || `child exited ${code}`)));
  });
}

if (process.argv[2] === "write") {
  const first = new SemanticMemory(provider, 10, 0.8, persistence);
  await first.store({ prompt: "The handoff is Friday.", response: { deadline: "Friday" }, tenantId: "tenant-a", modelFamily: "fixture", tokenCount: 8 });
  console.log(JSON.stringify({ persisted: first.getEntryCount() }));
} else if (process.argv[2] === "read") {
  const restarted = new SemanticMemory(provider, 10, 0.8, persistence);
  await restarted.initialize();
  const retained = await restarted.query({ prompt: "The handoff is Friday.", tenantId: "tenant-a", modelFamily: "fixture" });
  console.log(JSON.stringify({ retainedAcrossProcess: retained.hit, response: retained.entry?.response }));
} else {
  const written = JSON.parse(await runChild("write")) as { persisted: number };
  const read = JSON.parse(await runChild("read")) as { retainedAcrossProcess: boolean; response?: unknown };

console.log(JSON.stringify({
  experimentId: "durable-memory-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  persistedEntryCount: written.persisted,
  retainedAcrossProcess: read.retainedAcrossProcess,
  response: read.response,
  interpretation: "This verifies hydration and retrieval across separate OS processes using a temporary JSON adapter. Production deployments still need a privacy-reviewed, tenant-safe persistence adapter.",
}, null, 2));
}
