import type {
  AgentForgeModelChoice,
  CostEstimate,
  LatencyPreference,
  ModelSelectionResult,
  OptimizationConfig,
  ProviderCapabilities,
  TaskComplexity,
} from "./optimization-types.js";
import {
  estimateCost,
  estimateTokens,
  getCheapestModel,
  getProviderCapabilities,
  MODEL_FAMILY,
} from "./cost.js";

const TASK_COMPLEXITY_KEYWORDS: Record<TaskComplexity, string[]> = {
  simple: ["hello", "hi", "thanks", "yes", "no", "ok"],
  moderate: ["explain", "describe", "summarize", "list", "show"],
  complex: ["analyze", "compare", "evaluate", "design", "implement", "refactor"],
  expert: ["architect", "optimize", "debug", "security", "performance", "scale"],
};

function assessTaskComplexity(text: string): TaskComplexity {
  const lower = text.toLowerCase();
  let maxComplexity: TaskComplexity = "simple";

  for (const [complexity, keywords] of Object.entries(TASK_COMPLEXITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        const rank = complexity as TaskComplexity;
        if (getComplexityRank(rank) > getComplexityRank(maxComplexity)) {
          maxComplexity = rank;
        }
      }
    }
  }

  const length = text.length;
  if (length > 10000) return "expert";
  if (length > 5000) return "complex";
  if (length > 1000) return "moderate";

  return maxComplexity;
}

function getComplexityRank(complexity: TaskComplexity): number {
  switch (complexity) {
    case "simple": return 0;
    case "moderate": return 1;
    case "complex": return 2;
    case "expert": return 3;
  }
}

function selectModelByComplexity(
  complexity: TaskComplexity,
  requiresImages: boolean,
  requiresTools: boolean,
): ProviderCapabilities {
  switch (complexity) {
    case "simple":
      return getCheapestModel(requiresImages, requiresTools);
    case "moderate":
      return getProviderCapabilities("anthropic", "claude-haiku-3-5");
    case "complex":
      return getProviderCapabilities("anthropic", "claude-sonnet-4-5");
    case "expert":
      return getProviderCapabilities("anthropic", "claude-opus-4-6");
  }
}

function selectModelByLatency(
  preference: LatencyPreference,
  requiresImages: boolean,
  requiresTools: boolean,
): ProviderCapabilities {
  const allModels = getAllModelsFiltered(requiresImages, requiresTools);
  if (allModels.length === 0) {
    return getProviderCapabilities("anthropic", "claude-haiku-3-5");
  }

  switch (preference) {
    case "fast":
      return allModels.sort((a, b) => a.latencyMs - b.latencyMs)[0];
    case "balanced":
      return allModels.sort((a, b) => {
        const scoreA = a.latencyMs * 0.5 + a.costPer1kInput * 1000;
        const scoreB = b.latencyMs * 0.5 + b.costPer1kInput * 1000;
        return scoreA - scoreB;
      })[0];
    case "quality":
      return allModels.sort((a, b) => b.reliability - a.reliability)[0];
  }
}

function selectModelByCost(
  maxCostUsd: number,
  expectedTokens: number,
  requiresImages: boolean,
  requiresTools: boolean,
): ProviderCapabilities | null {
  const allModels = getAllModelsFiltered(requiresImages, requiresTools);
  const sorted = allModels.sort((a, b) => a.costPer1kInput - b.costPer1kInput);

  for (const model of sorted) {
    const cost = (expectedTokens / 1000) * model.costPer1kInput;
    if (cost <= maxCostUsd) {
      return model;
    }
  }

  return null;
}

function getAllModelsFiltered(
  requiresImages: boolean,
  requiresTools: boolean,
): ProviderCapabilities[] {
  const models: ProviderCapabilities[] = [];
  for (const provider of ["anthropic", "openai", "google", "openrouter", "ollama", "minimax"]) {
    for (const model of getModelFamily(provider)) {
      if (
        (!requiresImages || model.supportsImages) &&
        (!requiresTools || model.supportsTools)
      ) {
        models.push(model);
      }
    }
  }
  return models;
}

function getModelFamily(provider: string): ProviderCapabilities[] {
  const families: Record<string, ProviderCapabilities[]> = {
    anthropic: [
      getProviderCapabilities("anthropic", "claude-opus-4-6"),
      getProviderCapabilities("anthropic", "claude-sonnet-4-5"),
      getProviderCapabilities("anthropic", "claude-haiku-3-5"),
    ],
    openai: [
      getProviderCapabilities("openai", "gpt-4o"),
      getProviderCapabilities("openai", "gpt-4o-mini"),
    ],
    google: [
      getProviderCapabilities("google", "gemini-2.5-pro"),
      getProviderCapabilities("google", "gemini-2.5-flash"),
    ],
    openrouter: [
      getProviderCapabilities("openrouter", "meta-llama/llama-3.3-70b-instruct:free"),
      getProviderCapabilities("openrouter", "google/gemini-3.1-flash-lite-preview"),
    ],
    ollama: [
      getProviderCapabilities("ollama", "llama3.3:70b"),
    ],
    minimax: [
      getProviderCapabilities("minimax", "MiniMax-M3"),
      getProviderCapabilities("minimax", "MiniMax-M2.5"),
      getProviderCapabilities("minimax", "MiniMax-M2.1"),
    ],
  };
  return families[provider] || [];
}

export function selectModel(
  requestedModel: AgentForgeModelChoice,
  prompt: string,
  config: OptimizationConfig,
  options: {
    requiresImages?: boolean;
    requiresTools?: boolean;
    policyConstraints?: string[];
  } = {},
): ModelSelectionResult {
  const { requiresImages = false, requiresTools = true, policyConstraints = [] } = options;

  if (config.respectRequestedModel) {
    const capabilities = getProviderCapabilities(
      requestedModel.provider,
      requestedModel.model,
    );
    const tokens = estimateTokens(prompt);
    const costEstimate = estimateCost(requestedModel, tokens);
    return {
      selected: requestedModel,
      reason: "explicit model respected per config",
      fallbackUsed: false,
      costEstimate,
      latencyEstimate: "balanced",
    };
  }

  const complexity = assessTaskComplexity(prompt);
  const tokens = estimateTokens(prompt);

  if (config.costAwareRouting && config.maxCostUsd !== null) {
    const costModel = selectModelByCost(
      config.maxCostUsd,
      tokens.input,
      requiresImages,
      requiresTools,
    );
    if (costModel) {
      const selected: AgentForgeModelChoice = {
        provider: costModel.provider,
        model: costModel.model,
      };
      const costEstimate = estimateCost(selected, tokens);
      return {
        selected,
        reason: `cost-aware selection: max $${config.maxCostUsd}, task complexity=${complexity}`,
        fallbackUsed: false,
        costEstimate,
        latencyEstimate: config.defaultLatencyPreference,
      };
    }
  }

  if (config.costAwareRouting) {
    const cheapModel = getCheapestModel(requiresImages, requiresTools);
    const selected: AgentForgeModelChoice = {
      provider: cheapModel.provider,
      model: cheapModel.model,
    };
    const costEstimate = estimateCost(selected, tokens);
    const requestedCost = estimateCost(requestedModel, tokens);

    if (costEstimate.totalCostUsd < requestedCost.totalCostUsd * 0.5) {
      return {
        selected,
        reason: `cost optimization: ${cheapModel.model} is cheaper than ${requestedModel.model}`,
        fallbackUsed: false,
        costEstimate,
        latencyEstimate: config.defaultLatencyPreference,
      };
    }
  }

  const latencyModel = selectModelByLatency(
    config.defaultLatencyPreference,
    requiresImages,
    requiresTools,
  );
  const selected: AgentForgeModelChoice = {
    provider: latencyModel.provider,
    model: latencyModel.model,
  };
  const costEstimate = estimateCost(selected, tokens);

  return {
    selected,
    reason: `latency-based selection: ${config.defaultLatencyPreference} preference, complexity=${complexity}`,
    fallbackUsed: false,
    costEstimate,
    latencyEstimate: config.defaultLatencyPreference,
  };
}

export function selectModelWithFailover(
  requestedModel: AgentForgeModelChoice,
  prompt: string,
  config: OptimizationConfig,
  options: {
    requiresImages?: boolean;
    requiresTools?: boolean;
    policyConstraints?: string[];
    failedProviders?: string[];
  } = {},
): ModelSelectionResult {
  const { failedProviders = [], ...rest } = options;

  const primary = selectModel(requestedModel, prompt, config, rest);

  if (failedProviders.includes(primary.selected.provider)) {
    const fallbackModels = getAllModelsFiltered(
      rest.requiresImages ?? false,
      rest.requiresTools ?? true,
    ).filter((m) => !failedProviders.includes(m.provider));

    if (fallbackModels.length > 0) {
      const fallback = fallbackModels[0];
      const tokens = estimateTokens(prompt);
      const costEstimate = estimateCost(
        { provider: fallback.provider, model: fallback.model },
        tokens,
      );
      return {
        selected: { provider: fallback.provider, model: fallback.model },
        reason: `failover from ${primary.selected.provider} to ${fallback.provider}`,
        fallbackUsed: true,
        costEstimate,
        latencyEstimate: config.defaultLatencyPreference,
      };
    }
  }

  return primary;
}
