export type TokenSource = "estimated" | "actual";

export type TokenAccount = {
  baselineInputTokens: number;
  baselineEstimatedOutputTokens: number;
  optimizedInputTokens: number;
  optimizedEstimatedOutputTokens: number;
  actualInputTokens?: number;
  actualOutputTokens?: number;
  avoidedInputTokens: number;
  avoidedOutputTokens: number;
  avoidedTotalTokens: number;
  costBeforeUsd: number;
  costAfterUsd: number;
  costAvoidedUsd: number;
  tokenSource: TokenSource;
  notes: string[];
};

export type CostRates = {
  inputCostPer1k: number;
  outputCostPer1k: number;
};

const DEFAULT_COST_RATES: Record<string, CostRates> = {
  "anthropic/claude-3-5-sonnet": { inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
  "anthropic/claude-3-5-haiku": { inputCostPer1k: 0.00025, outputCostPer1k: 0.00125 },
  "openai/gpt-4o": { inputCostPer1k: 0.0025, outputCostPer1k: 0.01 },
  "openai/gpt-4o-mini": { inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
  "google/gemini-2.0-flash": { inputCostPer1k: 0.0001, outputCostPer1k: 0.0004 },
  "default": { inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getCostRates(provider: string, model: string): CostRates {
  const key = `${provider}/${model}`;
  return DEFAULT_COST_RATES[key] || DEFAULT_COST_RATES["default"];
}

export function createTokenAccount(params: {
  baselinePrompt: string;
  optimizedPrompt: string;
  estimatedOutputTokens?: number;
  actualInputTokens?: number;
  actualOutputTokens?: number;
  provider: string;
  model: string;
  contextTokensAvoided?: number;
  memoryBypassTokensAvoided?: number;
  notes?: string[];
}): TokenAccount {
  const baselineInputTokens = estimateTokens(params.baselinePrompt);
  const baselineEstimatedOutputTokens = params.estimatedOutputTokens || Math.ceil(baselineInputTokens * 0.3);
  const optimizedInputTokens = estimateTokens(params.optimizedPrompt);
  const optimizedEstimatedOutputTokens = params.estimatedOutputTokens || Math.ceil(optimizedInputTokens * 0.3);

  const rates = getCostRates(params.provider, params.model);

  let actualInputTokens: number | undefined;
  let actualOutputTokens: number | undefined;
  let tokenSource: TokenSource = "estimated";

  if (params.actualInputTokens !== undefined && params.actualOutputTokens !== undefined) {
    actualInputTokens = params.actualInputTokens;
    actualOutputTokens = params.actualOutputTokens;
    tokenSource = "actual";
  }

  const avoidedInputTokens = Math.max(0, baselineInputTokens - optimizedInputTokens);
  const avoidedOutputTokens = Math.max(0, baselineEstimatedOutputTokens - optimizedEstimatedOutputTokens);
  const avoidedTotalTokens = avoidedInputTokens + avoidedOutputTokens;

  const costBeforeUsd = (baselineInputTokens / 1000) * rates.inputCostPer1k +
                        (baselineEstimatedOutputTokens / 1000) * rates.outputCostPer1k;
  const costAfterUsd = (optimizedInputTokens / 1000) * rates.inputCostPer1k +
                      (optimizedEstimatedOutputTokens / 1000) * rates.outputCostPer1k;
  const costAvoidedUsd = costBeforeUsd - costAfterUsd;

  const notes = params.notes || [];
  if (tokenSource === "estimated") {
    notes.push("token counts are estimated, not from provider usage");
  } else {
    notes.push("token counts are actual provider usage");
  }

  return {
    baselineInputTokens,
    baselineEstimatedOutputTokens,
    optimizedInputTokens,
    optimizedEstimatedOutputTokens,
    actualInputTokens,
    actualOutputTokens,
    avoidedInputTokens,
    avoidedOutputTokens,
    avoidedTotalTokens,
    costBeforeUsd,
    costAfterUsd,
    costAvoidedUsd,
    tokenSource,
    notes,
  };
}

export function createBypassAccount(params: {
  baselinePrompt: string;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  provider: string;
  model: string;
  similarity: number;
  notes?: string[];
}): TokenAccount {
  const baselineInputTokens = params.estimatedInputTokens || estimateTokens(params.baselinePrompt);
  const baselineEstimatedOutputTokens = params.estimatedOutputTokens || Math.ceil(baselineInputTokens * 0.3);

  const rates = getCostRates(params.provider, params.model);

  const costBeforeUsd = (baselineInputTokens / 1000) * rates.inputCostPer1k +
                        (baselineEstimatedOutputTokens / 1000) * rates.outputCostPer1k;

  const notes = params.notes || [];
  notes.push(`bypass with similarity ${(params.similarity * 100).toFixed(1)}%`);

  return {
    baselineInputTokens,
    baselineEstimatedOutputTokens,
    optimizedInputTokens: 0,
    optimizedEstimatedOutputTokens: 0,
    avoidedInputTokens: baselineInputTokens,
    avoidedOutputTokens: baselineEstimatedOutputTokens,
    avoidedTotalTokens: baselineInputTokens + baselineEstimatedOutputTokens,
    costBeforeUsd,
    costAfterUsd: 0,
    costAvoidedUsd: costBeforeUsd,
    tokenSource: "estimated",
    notes,
  };
}

export function createPartialEliminationAccount(params: {
  baselineTokens: number;
  eliminatedTokens: number;
  preservedTokens: number;
  provider: string;
  model: string;
  matchType: string;
  confidence: number;
  notes?: string[];
}): TokenAccount {
  const rates = getCostRates(params.provider, params.model);

  const costBeforeUsd = (params.baselineTokens / 1000) * rates.inputCostPer1k;
  const costAfterUsd = (params.preservedTokens / 1000) * rates.inputCostPer1k;
  const costAvoidedUsd = (params.eliminatedTokens / 1000) * rates.inputCostPer1k;

  const notes = params.notes || [];
  notes.push(`${params.matchType} match with ${(params.confidence * 100).toFixed(1)}% confidence`);

  return {
    baselineInputTokens: params.baselineTokens,
    baselineEstimatedOutputTokens: 0,
    optimizedInputTokens: params.preservedTokens,
    optimizedEstimatedOutputTokens: 0,
    avoidedInputTokens: params.eliminatedTokens,
    avoidedOutputTokens: 0,
    avoidedTotalTokens: params.eliminatedTokens,
    costBeforeUsd,
    costAfterUsd,
    costAvoidedUsd,
    tokenSource: "estimated",
    notes,
  };
}

export function formatTokenAccount(account: TokenAccount): string {
  const lines: string[] = [];
  lines.push("## Token Accounting");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Token source | ${account.tokenSource} |`);
  lines.push(`| Baseline input tokens | ${account.baselineInputTokens} |`);
  lines.push(`| Baseline estimated output tokens | ${account.baselineEstimatedOutputTokens} |`);
  lines.push(`| Optimized input tokens | ${account.optimizedInputTokens} |`);
  lines.push(`| Optimized estimated output tokens | ${account.optimizedEstimatedOutputTokens} |`);

  if (account.actualInputTokens !== undefined) {
    lines.push(`| Actual input tokens | ${account.actualInputTokens} |`);
  }
  if (account.actualOutputTokens !== undefined) {
    lines.push(`| Actual output tokens | ${account.actualOutputTokens} |`);
  }

  lines.push(`| Avoided input tokens | ${account.avoidedInputTokens} |`);
  lines.push(`| Avoided output tokens | ${account.avoidedOutputTokens} |`);
  lines.push(`| **Total avoided tokens** | **${account.avoidedTotalTokens}** |`);
  lines.push(`| Cost before | $${account.costBeforeUsd.toFixed(6)} |`);
  lines.push(`| Cost after | $${account.costAfterUsd.toFixed(6)} |`);
  lines.push(`| **Cost avoided** | **$${account.costAvoidedUsd.toFixed(6)}** |`);

  if (account.notes.length > 0) {
    lines.push(`| Notes | ${account.notes.join("; ")} |`);
  }

  return lines.join("\n");
}

export function aggregateTokenAccounts(accounts: TokenAccount[]): {
  totalBaselineTokens: number;
  totalOptimizedTokens: number;
  totalAvoidedTokens: number;
  totalCostBeforeUsd: number;
  totalCostAfterUsd: number;
  totalCostAvoidedUsd: number;
  estimatedCount: number;
  actualCount: number;
} {
  let totalBaselineTokens = 0;
  let totalOptimizedTokens = 0;
  let totalAvoidedTokens = 0;
  let totalCostBeforeUsd = 0;
  let totalCostAfterUsd = 0;
  let totalCostAvoidedUsd = 0;
  let estimatedCount = 0;
  let actualCount = 0;

  for (const account of accounts) {
    totalBaselineTokens += account.baselineInputTokens;
    totalOptimizedTokens += account.optimizedInputTokens;
    totalAvoidedTokens += account.avoidedTotalTokens;
    totalCostBeforeUsd += account.costBeforeUsd;
    totalCostAfterUsd += account.costAfterUsd;
    totalCostAvoidedUsd += account.costAvoidedUsd;

    if (account.tokenSource === "estimated") {
      estimatedCount++;
    } else {
      actualCount++;
    }
  }

  return {
    totalBaselineTokens,
    totalOptimizedTokens,
    totalAvoidedTokens,
    totalCostBeforeUsd,
    totalCostAfterUsd,
    totalCostAvoidedUsd,
    estimatedCount,
    actualCount,
  };
}
