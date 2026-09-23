import type {
  CostEstimate,
  ProviderCapabilities,
  TokenEstimate,
} from "./optimization-types.js";
import type { AgentForgeModelChoice } from "./types.js";

const CHARS_PER_TOKEN = 4;

const PROVIDER_COSTS: Record<string, Record<string, ProviderCapabilities>> = {
  anthropic: {
    "claude-opus-4-6": {
      provider: "anthropic",
      model: "claude-opus-4-6",
      maxContextTokens: 200_000,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.015,
      costPer1kOutput: 0.075,
      latencyMs: 2000,
      reliability: 0.99,
    },
    "claude-sonnet-4-5": {
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      maxContextTokens: 200_000,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
      latencyMs: 1000,
      reliability: 0.99,
    },
    "claude-haiku-3-5": {
      provider: "anthropic",
      model: "claude-haiku-3-5",
      maxContextTokens: 200_000,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.0008,
      costPer1kOutput: 0.004,
      latencyMs: 500,
      reliability: 0.98,
    },
  },
  openai: {
    "gpt-4o": {
      provider: "openai",
      model: "gpt-4o",
      maxContextTokens: 128_000,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.0025,
      costPer1kOutput: 0.01,
      latencyMs: 1500,
      reliability: 0.98,
    },
    "gpt-4o-mini": {
      provider: "openai",
      model: "gpt-4o-mini",
      maxContextTokens: 128_000,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
      latencyMs: 800,
      reliability: 0.98,
    },
  },
  google: {
    "gemini-2.5-pro": {
      provider: "google",
      model: "gemini-2.5-pro",
      maxContextTokens: 1_000_000,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.00125,
      costPer1kOutput: 0.01,
      latencyMs: 1200,
      reliability: 0.97,
    },
    "gemini-2.5-flash": {
      provider: "google",
      model: "gemini-2.5-flash",
      maxContextTokens: 1_000_000,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.000075,
      costPer1kOutput: 0.0003,
      latencyMs: 600,
      reliability: 0.97,
    },
  },
  openrouter: {
    "meta-llama/llama-3.3-70b-instruct:free": {
      provider: "openrouter",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      maxContextTokens: 128_000,
      supportsImages: false,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0,
      costPer1kOutput: 0,
      latencyMs: 1500,
      reliability: 0.95,
    },
    "google/gemini-3.1-flash-lite-preview": {
      provider: "openrouter",
      model: "google/gemini-3.1-flash-lite-preview",
      maxContextTokens: 128_000,
      supportsImages: false,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0,
      costPer1kOutput: 0,
      latencyMs: 800,
      reliability: 0.95,
    },
  },
  ollama: {
    "llama3.3:70b": {
      provider: "ollama",
      model: "llama3.3:70b",
      maxContextTokens: 128_000,
      supportsImages: false,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0,
      costPer1kOutput: 0,
      latencyMs: 2000,
      reliability: 0.9,
    },
  },
  minimax: {
    "MiniMax-M3": {
      provider: "minimax",
      model: "MiniMax-M3",
      maxContextTokens: 200_000,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.0003,
      costPer1kOutput: 0.0012,
      latencyMs: 1500,
      reliability: 0.97,
    },
    "MiniMax-M2.5": {
      provider: "minimax",
      model: "MiniMax-M2.5",
      maxContextTokens: 200_000,
      supportsImages: false,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.0003,
      costPer1kOutput: 0.0012,
      latencyMs: 1500,
      reliability: 0.97,
    },
    "MiniMax-M2.1": {
      provider: "minimax",
      model: "MiniMax-M2.1",
      maxContextTokens: 200_000,
      supportsImages: false,
      supportsTools: true,
      supportsStreaming: true,
      costPer1kInput: 0.0003,
      costPer1kOutput: 0.0012,
      latencyMs: 1500,
      reliability: 0.97,
    },
  },
};

const FALLBACK_MODEL: ProviderCapabilities = {
  provider: "unknown",
  model: "unknown",
  maxContextTokens: 128_000,
  supportsImages: false,
  supportsTools: false,
  supportsStreaming: true,
  costPer1kInput: 0.01,
  costPer1kOutput: 0.03,
  latencyMs: 2000,
  reliability: 0.9,
};

export function estimateTokens(text: string): TokenEstimate {
  const chars = text.length;
  const tokens = Math.ceil(chars / CHARS_PER_TOKEN);
  return { input: tokens, output: 0, total: tokens };
}

export function getProviderCapabilities(
  provider: string,
  model: string,
): ProviderCapabilities {
  const providerModels = PROVIDER_COSTS[provider];
  if (!providerModels) {
    return { ...FALLBACK_MODEL, provider, model };
  }
  const capabilities = providerModels[model];
  if (!capabilities) {
    return { ...FALLBACK_MODEL, provider, model };
  }
  return capabilities;
}

export function estimateCost(
  model: AgentForgeModelChoice,
  tokens: TokenEstimate,
): CostEstimate {
  const capabilities = getProviderCapabilities(model.provider, model.model);
  const inputCost = (tokens.input / 1000) * capabilities.costPer1kInput;
  const outputCost = (tokens.output / 1000) * capabilities.costPer1kOutput;
  return {
    inputCostUsd: inputCost,
    outputCostUsd: outputCost,
    totalCostUsd: inputCost + outputCost,
    provider: model.provider,
    model: model.model,
  };
}

export function estimatePromptCost(
  model: AgentForgeModelChoice,
  promptText: string,
  expectedOutputTokens: number = 1000,
): CostEstimate {
  const tokens = estimateTokens(promptText);
  tokens.output = expectedOutputTokens;
  tokens.total = tokens.input + tokens.output;
  return estimateCost(model, tokens);
}

export function compareModelCosts(
  a: AgentForgeModelChoice,
  b: AgentForgeModelChoice,
  tokens: TokenEstimate,
): { cheaper: AgentForgeModelChoice; savingsUsd: number } {
  const costA = estimateCost(a, tokens);
  const costB = estimateCost(b, tokens);
  const savingsUsd = Math.abs(costA.totalCostUsd - costB.totalCostUsd);
  return {
    cheaper: costA.totalCostUsd <= costB.totalCostUsd ? a : b,
    savingsUsd,
  };
}

export function getModelFamily(model: string): string {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gpt")) return "openai";
  if (model.startsWith("gemini")) return "google";
  if (model.startsWith("llama")) return "meta";
  if (model.toLowerCase().includes("minimax")) return "minimax";
  return "other";
}

export function getAllModels(): ProviderCapabilities[] {
  const models: ProviderCapabilities[] = [];
  for (const providerModels of Object.values(PROVIDER_COSTS)) {
    for (const capabilities of Object.values(providerModels)) {
      models.push(capabilities);
    }
  }
  return models;
}

export function getModelsByCost(
  maxCostPer1kInput: number,
): ProviderCapabilities[] {
  return getAllModels().filter(
    (m) => m.costPer1kInput <= maxCostPer1kInput,
  );
}

export function getCheapestModel(
  requiresImages: boolean = false,
  requiresTools: boolean = false,
): ProviderCapabilities {
  const models = getAllModels().filter(
    (m) =>
      (!requiresImages || m.supportsImages) &&
      (!requiresTools || m.supportsTools),
  );
  if (models.length === 0) return FALLBACK_MODEL;
  return models.sort((a, b) => a.costPer1kInput - b.costPer1kInput)[0];
}
