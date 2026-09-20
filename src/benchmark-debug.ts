import { MemoryContextOptimizer } from "./memoryContextOptimizer.js";
import { SemanticMemory } from "./semanticMemory.js";
import { RealEmbeddingProvider } from "./embeddingAdapter.js";
import { resetFingerprintStore } from "./hybridFingerprint.js";
import { estimateTokens } from "./tokenAccounting.js";

function generateLargeContext(changedFileIndex: number = -1): string {
  const parts: string[] = [];
  for (let i = 0; i < 50; i++) {
    let fileContent = `// File: src/module${i}.ts\n`;
    fileContent += `export const config${i} = {\n`;
    for (let j = 0; j < 20; j++) {
      fileContent += `  key${i}_${j}: "value${i}_${j}",\n`;
    }
    fileContent += `};\n`;
    if (i === changedFileIndex) {
      fileContent += `// CHANGED: added new export\nexport const CHANGED = true;\n`;
    }
    parts.push(fileContent);
  }
  return parts.join("\n");
}

async function runBenchmark() {
  const provider = new RealEmbeddingProvider({ provider: "none", fallbackToHash: true });
  await provider.initialize();
  const memory = new SemanticMemory(provider, 10000, 0.85);
  const optimizer = new MemoryContextOptimizer({ memory, largeContextElimination: true });
  resetFingerprintStore();

  // First, store the original context
  const ctx1 = generateLargeContext();
  const t1 = estimateTokens(ctx1);
  console.log("=== Storing original context ===");
  console.log("Tokens:", t1);

  const r1 = optimizer.eliminateLargeContext({ content: ctx1, contentType: "repo", tokenCount: t1, tenantId: "t", provider: "p", model: "m" });
  console.log("Stored. First call match:", r1.matchType);

  // Now test with changed context
  const ctx2 = generateLargeContext(25);
  const t2 = estimateTokens(ctx2);
  console.log("\n=== Testing with ONE FILE Changed ===");
  console.log("Baseline tokens:", t2);

  const r2 = optimizer.eliminateLargeContext({ content: ctx2, contentType: "repo", tokenCount: t2, tenantId: "t", provider: "p", model: "m" });
  console.log("Match:", r2.matchType, "confidence:", r2.confidence);
  console.log("Unchanged:", r2.unchangedChunks, "Changed:", r2.changedChunks);
  console.log("Original tokens:", r2.originalTokens);
  console.log("Preserved tokens:", r2.preservedTokens);
  console.log("Eliminated tokens:", r2.eliminatedTokens);
  console.log("\n=== OPTIMIZED OUTPUT ===");
  console.log(r2.replacedWith);
}

runBenchmark().catch(console.error);
