import { RealEmbeddingProvider } from "../../src/embeddingAdapter.js";
import { SemanticMemory } from "../../src/semanticMemory.js";
import { MemoryContextOptimizer } from "../../src/memoryContextOptimizer.js";

export async function buildAgentForgeContext(task: string, requestedTenantId = "synthetic-pilot-tenant"): Promise<{ prompt: string; memoryHit: boolean; tenantId: string }> {
  const tenantId = "synthetic-pilot-tenant";
  const embeddings = new RealEmbeddingProvider({ provider: "none", fallbackToHash: true });
  await embeddings.initialize();
  const memory = new SemanticMemory(embeddings, 32, 0.8);
  await memory.store({ prompt: "Synthetic deadline", response: "The synthetic deadline is Friday.", tenantId, modelFamily: "local", tokenCount: 7 });
  const optimizer = new MemoryContextOptimizer({ memory, maxMemoryTokens: 128, memoryBypass: false });
  const lookup = await memory.query({ prompt: task, tenantId: requestedTenantId, modelFamily: "local", topK: 1, threshold: 0.8 });
  const prompt = lookup.hit && lookup.entry ? `${task}\nRelevant synthetic memory: ${String(lookup.entry.response)}` : task;
  void optimizer;
  return { prompt, memoryHit: lookup.hit, tenantId: requestedTenantId };
}
