import { MemoryContextOptimizer } from "./memoryContextOptimizer.js";
import { SemanticMemory } from "./semanticMemory.js";
import { RealEmbeddingProvider } from "./embeddingAdapter.js";

async function runBenchmark() {
  const provider = new RealEmbeddingProvider({ provider: "none", fallbackToHash: true });
  await provider.initialize();
  const memory = new SemanticMemory(provider, 10000, 0.85);
  const optimizer = new MemoryContextOptimizer({ memory, largeContextElimination: true });

  // 25k token repo context
  const repoParts: string[] = [];
  for (let i = 0; i < 3000; i++) {
    repoParts.push(`import React from "react";\nconst Component${i} = () => <div>Item ${i}</div>;\nexport default Component${i};`);
  }
  const repoContext = repoParts.join("\n");
  const repoTokens = Math.ceil(repoContext.length / 4);

  console.log("=== 25k Repo Context ===");
  console.log("Original:", repoTokens, "tokens");
  console.log("BEFORE:", repoContext.substring(0, 150) + "...\n");

  const r1 = optimizer.eliminateLargeContext({ content: repoContext, contentType: "repo", tokenCount: repoTokens });
  console.log("First call eliminated:", r1.eliminated);

  const r2 = optimizer.eliminateLargeContext({ content: repoContext, contentType: "repo", tokenCount: repoTokens });
  console.log("Second call eliminated:", r2.eliminated);
  console.log("Tokens saved:", r2.eliminatedTokens);
  console.log("AFTER:", r2.replacedWith);
  console.log("Optimized:", Math.ceil(r2.replacedWith.length / 4), "tokens\n");

  // 50k conversation
  const convParts: string[] = [];
  for (let i = 0; i < 500; i++) {
    convParts.push(`User: How do I implement auth for component ${i}?\nAssistant: Here is how you implement auth for component ${i}... [detailed response with code examples]`);
  }
  const conv = convParts.join("\n\n");
  const convTokens = Math.ceil(conv.length / 4);

  console.log("=== 50k Conversation ===");
  console.log("Original:", convTokens, "tokens");

  const c1 = optimizer.eliminateLargeContext({ content: conv, contentType: "conversation", tokenCount: convTokens });
  console.log("First call eliminated:", c1.eliminated);

  const c2 = optimizer.eliminateLargeContext({ content: conv, contentType: "conversation", tokenCount: convTokens });
  console.log("Second call eliminated:", c2.eliminated);
  console.log("Tokens saved:", c2.eliminatedTokens);
  console.log("AFTER:", c2.replacedWith);
  console.log("Optimized:", Math.ceil(c2.replacedWith.length / 4), "tokens\n");

  // Memory bypass
  console.log("=== Memory Bypass ===");
  await memory.store({
    prompt: "How do I set up authentication?",
    response: "Use JWT tokens with refresh rotation. Store in httpOnly cookies. Implement rate limiting on login endpoint.",
    tenantId: "bench",
    modelFamily: "anthropic",
    tokenCount: 50,
  });

  const bypassResult = await optimizer.checkBypass({
    prompt: "How do I set up authentication?",
    tenantId: "bench",
    estimatedInputTokens: 25000,
    estimatedOutputTokens: 2000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  });

  console.log("Bypassed:", bypassResult.bypassed);
  console.log("Answer:", bypassResult.answer);
  console.log("Tokens avoided:", bypassResult.tokensAvoided);
  console.log("Cost avoided: $" + bypassResult.estimatedCostAvoidedUsd.toFixed(4));

  // Summary
  console.log("\n=== TOTAL TOKENS PREVENTED ===");
  console.log("Context elimination:", r2.eliminatedTokens + c2.eliminatedTokens);
  console.log("Memory bypass:", bypassResult.tokensAvoided);
  console.log("Grand total:", r2.eliminatedTokens + c2.eliminatedTokens + bypassResult.tokensAvoided);
}

runBenchmark().catch(console.error);
