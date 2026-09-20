import type {
  AgentForgeModelChoice,
  CostEstimate,
  OptimizationTelemetry,
  TokenEstimate,
} from "./optimization-types.js";
import { estimateCost, estimateTokens } from "./cost.js";

export function createTelemetry(params: {
  originalPrompt: string;
  optimizedPrompt: string;
  selectedModel: AgentForgeModelChoice;
  routingReason: string;
  cacheStatus: "hit" | "miss" | "disabled";
  compressionApplied: boolean;
  contextDedupApplied: boolean;
  policyConstraintsApplied: string[];
  fallbackUsed: boolean;
  optimizationTimeMs: number;
}): OptimizationTelemetry {
  const originalTokens = estimateTokens(params.originalPrompt);
  const optimizedTokens = estimateTokens(params.optimizedPrompt);
  const savingsPercent = originalTokens.total > 0
    ? (originalTokens.total - optimizedTokens.total) / originalTokens.total
    : 0;

  const estimatedCostBefore = estimateCost(
    { provider: "unknown", model: "unknown" },
    originalTokens,
  );
  const estimatedCostAfter = estimateCost(params.selectedModel, optimizedTokens);

  return {
    originalTokens,
    optimizedTokens,
    savingsPercent,
    cacheStatus: params.cacheStatus,
    selectedModel: params.selectedModel,
    routingReason: params.routingReason,
    estimatedCostBefore,
    estimatedCostAfter,
    policyConstraintsApplied: params.policyConstraintsApplied,
    fallbackUsed: params.fallbackUsed,
    compressionApplied: params.compressionApplied,
    contextDedupApplied: params.contextDedupApplied,
    optimizationTimeMs: params.optimizationTimeMs,
    memoryBypassApplied: false,
    memoryBypassTokensSaved: 0,
    memoryBypassCostSavedUsd: 0,
    providerCallsAvoided: 0,
    largeContextEliminated: false,
    largeContextTokensSaved: 0,
  };
}

export function createNoOpTelemetry(
  prompt: string,
  model: AgentForgeModelChoice,
): OptimizationTelemetry {
  const tokens = estimateTokens(prompt);
  return {
    originalTokens: tokens,
    optimizedTokens: tokens,
    savingsPercent: 0,
    cacheStatus: "disabled",
    selectedModel: model,
    routingReason: "optimization disabled",
    estimatedCostBefore: estimateCost(model, tokens),
    estimatedCostAfter: estimateCost(model, tokens),
    policyConstraintsApplied: [],
    fallbackUsed: false,
    compressionApplied: false,
    contextDedupApplied: false,
    optimizationTimeMs: 0,
    memoryBypassApplied: false,
    memoryBypassTokensSaved: 0,
    memoryBypassCostSavedUsd: 0,
    providerCallsAvoided: 0,
    largeContextEliminated: false,
    largeContextTokensSaved: 0,
  };
}

export function formatTelemetry(telemetry: OptimizationTelemetry): string {
  const lines: string[] = [];
  lines.push("## Optimization Metrics");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Original tokens | ${telemetry.originalTokens.total} |`);
  lines.push(`| Optimized tokens | ${(telemetry.optimizedTokens.total)} |`);
  lines.push(`| Savings | ${(telemetry.savingsPercent * 100).toFixed(1)}% |`);
  lines.push(`| Cache status | ${telemetry.cacheStatus} |`);
  lines.push(`| Selected model | ${telemetry.selectedModel.provider}/${telemetry.selectedModel.model} |`);
  lines.push(`| Routing reason | ${telemetry.routingReason} |`);
  lines.push(`| Cost before | $${telemetry.estimatedCostBefore.totalCostUsd.toFixed(6)} |`);
  lines.push(`| Cost after | $${telemetry.estimatedCostAfter.totalCostUsd.toFixed(6)} |`);
  lines.push(`| Compression applied | ${telemetry.compressionApplied ? "yes" : "no"} |`);
  lines.push(`| Context dedup applied | ${telemetry.contextDedupApplied ? "yes" : "no"} |`);
  lines.push(`| Fallback used | ${telemetry.fallbackUsed ? "yes" : "no"} |`);
  lines.push(`| Optimization time | ${telemetry.optimizationTimeMs}ms |`);

  if (telemetry.memoryBypassApplied) {
    lines.push(`| Memory bypass applied | yes |`);
    lines.push(`| Memory bypass tokens saved | ${telemetry.memoryBypassTokensSaved} |`);
    lines.push(`| Memory bypass cost saved | $${telemetry.memoryBypassCostSavedUsd.toFixed(6)} |`);
    lines.push(`| Provider calls avoided | ${telemetry.providerCallsAvoided} |`);
  }

  if (telemetry.largeContextEliminated) {
    lines.push(`| Large context eliminated | yes |`);
    lines.push(`| Large context tokens saved | ${telemetry.largeContextTokensSaved} |`);
  }

  if (telemetry.policyConstraintsApplied.length > 0) {
    lines.push(`| Policy constraints | ${telemetry.policyConstraintsApplied.join(", ")} |`);
  }
  return lines.join("\n");
}

export function aggregateTelemetry(
  telemetryList: OptimizationTelemetry[],
): {
  totalOriginalTokens: number;
  totalOptimizedTokens: number;
  totalSavingsPercent: number;
  totalCostBefore: number;
  totalCostAfter: number;
  cacheHits: number;
  cacheMisses: number;
  compressionsApplied: number;
  dedupsApplied: number;
  fallbacksUsed: number;
  memoryBypassesApplied: number;
  memoryBypassTokensSaved: number;
  memoryBypassCostSavedUsd: number;
  providerCallsAvoided: number;
  largeContextsEliminated: number;
  largeContextTokensSaved: number;
} {
  let totalOriginalTokens = 0;
  let totalOptimizedTokens = 0;
  let totalCostBefore = 0;
  let totalCostAfter = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let compressionsApplied = 0;
  let dedupsApplied = 0;
  let fallbacksUsed = 0;
  let memoryBypassesApplied = 0;
  let memoryBypassTokensSaved = 0;
  let memoryBypassCostSavedUsd = 0;
  let providerCallsAvoided = 0;
  let largeContextsEliminated = 0;
  let largeContextTokensSaved = 0;

  for (const t of telemetryList) {
    totalOriginalTokens += t.originalTokens.total;
    totalOptimizedTokens += t.optimizedTokens.total;
    totalCostBefore += t.estimatedCostBefore.totalCostUsd;
    totalCostAfter += t.estimatedCostAfter.totalCostUsd;
    if (t.cacheStatus === "hit") cacheHits++;
    if (t.cacheStatus === "miss") cacheMisses++;
    if (t.compressionApplied) compressionsApplied++;
    if (t.contextDedupApplied) dedupsApplied++;
    if (t.fallbackUsed) fallbacksUsed++;
    if (t.memoryBypassApplied) memoryBypassesApplied++;
    memoryBypassTokensSaved += t.memoryBypassTokensSaved;
    memoryBypassCostSavedUsd += t.memoryBypassCostSavedUsd;
    providerCallsAvoided += t.providerCallsAvoided;
    if (t.largeContextEliminated) largeContextsEliminated++;
    largeContextTokensSaved += t.largeContextTokensSaved;
  }

  const totalSavingsPercent = totalOriginalTokens > 0
    ? (totalOriginalTokens - totalOptimizedTokens) / totalOriginalTokens
    : 0;

  return {
    totalOriginalTokens,
    totalOptimizedTokens,
    totalSavingsPercent,
    totalCostBefore,
    totalCostAfter,
    cacheHits,
    cacheMisses,
    compressionsApplied,
    dedupsApplied,
    fallbacksUsed,
    memoryBypassesApplied,
    memoryBypassTokensSaved,
    memoryBypassCostSavedUsd,
    providerCallsAvoided,
    largeContextsEliminated,
    largeContextTokensSaved,
  };
}

export function formatAggregateTelemetry(aggregate: ReturnType<typeof aggregateTelemetry>): string {
  const lines: string[] = [];
  lines.push("## Aggregate Optimization Metrics");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Total original tokens | ${aggregate.totalOriginalTokens} |`);
  lines.push(`| Total optimized tokens | ${aggregate.totalOptimizedTokens} |`);
  lines.push(`| Total savings | ${(aggregate.totalSavingsPercent * 100).toFixed(1)}% |`);
  lines.push(`| Total cost before | $${aggregate.totalCostBefore.toFixed(6)} |`);
  lines.push(`| Total cost after | $${aggregate.totalCostAfter.toFixed(6)} |`);
  lines.push(`| Cache hits | ${aggregate.cacheHits} |`);
  lines.push(`| Cache misses | ${aggregate.cacheMisses} |`);
  lines.push(`| Compressions applied | ${aggregate.compressionsApplied} |`);
  lines.push(`| Dedups applied | ${aggregate.dedupsApplied} |`);
  lines.push(`| Fallbacks used | ${aggregate.fallbacksUsed} |`);
  lines.push(`| Memory bypasses applied | ${aggregate.memoryBypassesApplied} |`);
  lines.push(`| Memory bypass tokens saved | ${aggregate.memoryBypassTokensSaved} |`);
  lines.push(`| Memory bypass cost saved | $${aggregate.memoryBypassCostSavedUsd.toFixed(6)} |`);
  lines.push(`| Provider calls avoided | ${aggregate.providerCallsAvoided} |`);
  lines.push(`| Large contexts eliminated | ${aggregate.largeContextsEliminated} |`);
  lines.push(`| Large context tokens saved | ${aggregate.largeContextTokensSaved} |`);

  const totalTokensPrevented = aggregate.memoryBypassTokensSaved + aggregate.largeContextTokensSaved;
  lines.push(`| **Total Tokens Prevented** | **${totalTokensPrevented}** |`);

  return lines.join("\n");
}
