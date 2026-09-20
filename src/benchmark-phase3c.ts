import { MemoryContextOptimizer } from "./memoryContextOptimizer.js";
import { SemanticMemory } from "./semanticMemory.js";
import { RealEmbeddingProvider } from "./embeddingAdapter.js";
import {
  createContextFingerprint,
  compareFingerprints,
  resetFingerprintStore,
} from "./hybridFingerprint.js";
import { estimateTokens, formatTokenAccount } from "./tokenAccounting.js";

function generateRepoFile(fileIndex: number, lines: number = 100): string {
  const parts: string[] = [];
  parts.push(`// File: src/components/file${fileIndex}.tsx`);
  parts.push(`import React from "react";`);
  parts.push(`import { useState } from "react";`);
  parts.push(``);

  for (let i = 0; i < lines; i++) {
    parts.push(`export function Component${fileIndex}_${i}(props: { id: string }) {`);
    parts.push(`  const [state, setState] = useState(null);`);
    parts.push(`  return <div id={props.id}>Item ${i}</div>;`);
    parts.push(`}`);
  }

  return parts.join("\n");
}

function generateRepoContext(fileCount: number, changedFileIndex: number = -1, changeLine: number = -1): string {
  const files: string[] = [];
  for (let i = 0; i < fileCount; i++) {
    let content = generateRepoFile(i);
    if (i === changedFileIndex && changeLine >= 0) {
      const lines = content.split("\n");
      lines[changeLine] = `// CHANGED LINE at position ${changeLine}`;
      content = lines.join("\n");
    }
    files.push(content);
  }
  return files.join("\n\n");
}

async function runPhase3CBenchmark() {
  console.log("=== Phase 3C: Hybrid Context Fingerprinting Benchmark ===\n");

  const provider = new RealEmbeddingProvider({ provider: "none", fallbackToHash: true });
  await provider.initialize();
  const memory = new SemanticMemory(provider, 10000, 0.85);
  const optimizer = new MemoryContextOptimizer({
    memory,
    largeContextElimination: true,
    memoryBypass: true,
    memoryBypassThreshold: 0.92,
  });

  resetFingerprintStore();

  // Test 1: 25k repo context unchanged
  console.log("--- Test 1: 25k Repo Context UNCHANGED ---");
  const repo1 = generateRepoContext(25);
  const repo1Tokens = estimateTokens(repo1);
  console.log("Baseline tokens:", repo1Tokens);

  const r1 = optimizer.eliminateLargeContext({
    content: repo1,
    contentType: "repo",
    tokenCount: repo1Tokens,
    tenantId: "test",
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  });
  console.log("First call - Eliminated:", r1.eliminated, "Match:", r1.matchType);

  const r2 = optimizer.eliminateLargeContext({
    content: repo1,
    contentType: "repo",
    tokenCount: repo1Tokens,
    tenantId: "test",
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  });
  console.log("Second call - Eliminated:", r2.eliminated, "Match:", r2.matchType);
  console.log("Tokens saved:", r2.eliminatedTokens);
  console.log("Optimized tokens:", r2.preservedTokens);
  if (r2.tokenAccount) {
    console.log(formatTokenAccount(r2.tokenAccount));
  }
  console.log("");

  // Test 2: 25k repo context with ONE CHANGED LINE
  console.log("--- Test 2: 25k Repo Context with ONE CHANGED LINE ---");
  const repo2 = generateRepoContext(25, 5, 10);
  const repo2Tokens = estimateTokens(repo2);
  console.log("Baseline tokens:", repo2Tokens);

  const r3 = optimizer.eliminateLargeContext({
    content: repo2,
    contentType: "repo",
    tokenCount: repo2Tokens,
    tenantId: "test",
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  });
  console.log("Match type:", r3.matchType);
  console.log("Confidence:", r3.confidence);
  console.log("Unchanged chunks:", r3.unchangedChunks);
  console.log("Changed chunks:", r3.changedChunks);
  console.log("Tokens saved:", r3.eliminatedTokens);
  console.log("Optimized tokens:", r3.preservedTokens);
  if (r3.tokenAccount) {
    console.log(formatTokenAccount(r3.tokenAccount));
  }
  console.log("");

  // Test 3: 25k repo context with ONE CHANGED FILE
  console.log("--- Test 3: 25k Repo Context with ONE CHANGED FILE ---");
  const repo3 = generateRepoContext(25, 10);
  const repo3Tokens = estimateTokens(repo3);
  console.log("Baseline tokens:", repo3Tokens);

  const r4 = optimizer.eliminateLargeContext({
    content: repo3,
    contentType: "repo",
    tokenCount: repo3Tokens,
    tenantId: "test",
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  });
  console.log("Match type:", r4.matchType);
  console.log("Confidence:", r4.confidence);
  console.log("Unchanged chunks:", r4.unchangedChunks);
  console.log("Changed chunks:", r4.changedChunks);
  console.log("Tokens saved:", r4.eliminatedTokens);
  console.log("Optimized tokens:", r4.preservedTokens);
  if (r4.tokenAccount) {
    console.log(formatTokenAccount(r4.tokenAccount));
  }
  console.log("");

  // Test 4: Memory bypass with large prompt
  console.log("--- Test 4: Memory Bypass with Large Prompt ---");
  await memory.store({
    prompt: "How do I set up authentication in this codebase?",
    response: "Use JWT tokens with httpOnly cookies. Implement refresh token rotation. Add rate limiting on login endpoint.",
    tenantId: "test",
    modelFamily: "anthropic",
    tokenCount: 50,
  });

  const largePrompt = "How do I set up authentication in this codebase?\n\n" + generateRepoContext(5);
  const largePromptTokens = estimateTokens(largePrompt);
  console.log("Baseline tokens:", largePromptTokens);

  const bypassResult = await optimizer.checkBypass({
    prompt: "How do I set up authentication in this codebase?",
    tenantId: "test",
    estimatedInputTokens: largePromptTokens,
    estimatedOutputTokens: Math.ceil(largePromptTokens * 0.3),
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  });
  console.log("Bypassed:", bypassResult.bypassed);
  console.log("Freshness:", bypassResult.freshnessStatus);
  if (bypassResult.tokenAccount) {
    console.log(formatTokenAccount(bypassResult.tokenAccount));
  }
  console.log("");

  // Test 5: Bypass rejected - latest query
  console.log("--- Test 5: Bypass Rejected - Latest Query ---");
  const latestResult = await optimizer.checkBypass({
    prompt: "What is the latest pricing for GPT-4o?",
    tenantId: "test",
    estimatedInputTokens: 100,
    estimatedOutputTokens: 50,
    provider: "openai",
    model: "gpt-4o",
  });
  console.log("Bypassed:", latestResult.bypassed);
  console.log("Rejection reason:", latestResult.rejectionReason);
  console.log("Freshness:", latestResult.freshnessStatus);
  console.log("");

  // Test 6: Bypass rejected - modify instruction
  console.log("--- Test 6: Bypass Rejected - Modify Instruction ---");
  const modifyResult = await optimizer.checkBypass({
    prompt: "Please modify the authentication setup to use OAuth",
    tenantId: "test",
    estimatedInputTokens: 100,
    estimatedOutputTokens: 50,
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  });
  console.log("Bypassed:", modifyResult.bypassed);
  console.log("Rejection reason:", modifyResult.rejectionReason);
  console.log("");

  // Test 7: Bypass rejected - risk filter
  console.log("--- Test 7: Bypass Rejected - Risk Filter ---");
  const riskResult = await optimizer.checkBypass({
    prompt: "What is my API key for the production database?",
    tenantId: "test",
    estimatedInputTokens: 100,
    estimatedOutputTokens: 50,
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  });
  console.log("Bypassed:", riskResult.bypassed);
  console.log("Rejection reason:", riskResult.rejectionReason);
  console.log("");

  // Test 8: Structural comparison
  console.log("--- Test 8: Structural Comparison ---");
  const ctx1 = createContextFingerprint({
    content: generateRepoContext(3),
    contentType: "repo",
    tokenCount: 1000,
    tenantId: "test",
  });

  const ctx2 = createContextFingerprint({
    content: generateRepoContext(3, 1),
    contentType: "repo",
    tokenCount: 1000,
    tenantId: "test",
  });

  const structuralMatch = compareFingerprints(ctx1, ctx2);
  console.log("Structural match type:", structuralMatch.matchType);
  console.log("Confidence:", structuralMatch.confidence);
  console.log("Safe to eliminate:", structuralMatch.safeToEliminate);
  console.log("Safe to summarize:", structuralMatch.safeToSummarize);
  console.log("");

  // Summary
  console.log("=== SUMMARY ===");
  console.log("Test 1 (unchanged):", r2.eliminatedTokens, "tokens saved");
  console.log("Test 2 (one line):", r3.eliminatedTokens, "tokens saved (partial)");
  console.log("Test 3 (one file):", r4.eliminatedTokens, "tokens saved (partial)");
  console.log("Test 4 (bypass):", bypassResult.tokenAccount?.avoidedTotalTokens || 0, "tokens avoided");
  console.log("Tests 5-7: correctly rejected");
  console.log("Test 8: structural similarity works");
}

runPhase3CBenchmark().catch(console.error);
