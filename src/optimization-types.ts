import type { AgentForgeModelChoice, TrustTier } from "./types.js";

export type LatencyPreference = "fast" | "balanced" | "quality";

export type SpeculativeStrategy = "first-acceptable" | "cheapest-first" | "quality-first";

export type OptimizationConfig = {
  enabled: boolean;
  targetTokenReduction: number;
  semanticCache: boolean;
  exactCache: boolean;
  promptCompression: boolean;
  contextDeduplication: boolean;
  costAwareRouting: boolean;
  providerFailover: boolean;
  respectRequestedModel: boolean;
  maxCostUsd: number | null;
  defaultLatencyPreference: LatencyPreference;
  deltaTransmission: boolean;
  providerOptimization: boolean;
  speculativeExecution: boolean;
  speculativeStrategy: SpeculativeStrategy;
  costLedger: boolean;
  contextFingerprinting: boolean;
  semanticMemory: boolean;
  memoryBypass: boolean;
  memoryBypassThreshold: number;
  memoryBypassMaxAgeMs: number;
  memoryBypassRiskFilter: boolean;
  largeContextElimination: boolean;
  largeContextFingerprintThreshold: number;
};

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  enabled: false,
  targetTokenReduction: 0.8,
  semanticCache: true,
  exactCache: true,
  promptCompression: true,
  contextDeduplication: true,
  costAwareRouting: true,
  providerFailover: true,
  respectRequestedModel: true,
  maxCostUsd: null,
  defaultLatencyPreference: "balanced",
  deltaTransmission: false,
  providerOptimization: false,
  speculativeExecution: false,
  speculativeStrategy: "cheapest-first",
  costLedger: false,
  contextFingerprinting: false,
  semanticMemory: true,
  memoryBypass: true,
  memoryBypassThreshold: 0.92,
  memoryBypassMaxAgeMs: 86400000,
  memoryBypassRiskFilter: true,
  largeContextElimination: true,
  largeContextFingerprintThreshold: 0.95,
};

export type TokenEstimate = {
  input: number;
  output: number;
  total: number;
};

export type CostEstimate = {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  provider: string;
  model: string;
};

export type CacheKey = {
  tenantId: string;
  taskType: string;
  promptHash: string;
  modelFamily: string;
  policyConstraints: string[];
};

export type CacheEntry = {
  key: CacheKey;
  response: unknown;
  tokenCount: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
};

export type CacheResult = {
  hit: boolean;
  entry?: CacheEntry;
  savingsEstimate: TokenEstimate;
};

export type CompressionResult = {
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  savingsPercent: number;
  confidence: number;
  techniques: string[];
};

export type ContextDedupResult = {
  deduped: string;
  originalTokens: number;
  dedupedTokens: number;
  removedBlocks: number;
  savingsEstimate: TokenEstimate;
};

export type ModelSelectionResult = {
  selected: AgentForgeModelChoice;
  reason: string;
  fallbackUsed: boolean;
  costEstimate: CostEstimate;
  latencyEstimate: LatencyPreference;
};

export type OptimizationTelemetry = {
  originalTokens: TokenEstimate;
  optimizedTokens: TokenEstimate;
  savingsPercent: number;
  cacheStatus: "hit" | "miss" | "disabled";
  selectedModel: AgentForgeModelChoice;
  routingReason: string;
  estimatedCostBefore: CostEstimate;
  estimatedCostAfter: CostEstimate;
  policyConstraintsApplied: string[];
  fallbackUsed: boolean;
  compressionApplied: boolean;
  contextDedupApplied: boolean;
  optimizationTimeMs: number;
  memoryBypassApplied: boolean;
  memoryBypassTokensSaved: number;
  memoryBypassCostSavedUsd: number;
  providerCallsAvoided: number;
  largeContextEliminated: boolean;
  largeContextTokensSaved: number;
};

export type OptimizationResult = {
  optimized: boolean;
  envelope: import("./types.js").CanonicalEnvelope;
  telemetry: OptimizationTelemetry;
  notes: string[];
};

export type TaskComplexity = "simple" | "moderate" | "complex" | "expert";

export type ProviderCapabilities = {
  provider: string;
  model: string;
  maxContextTokens: number;
  supportsImages: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  costPer1kInput: number;
  costPer1kOutput: number;
  latencyMs: number;
  reliability: number;
};

export type BypassRejectionReason =
  | "low_confidence"
  | "stale_memory"
  | "latest_query"
  | "context_changed"
  | "risk_filter"
  | "tenant_mismatch"
  | "new_instructions"
  | "security_sensitive";

export type MemoryBypassResult = {
  bypassed: boolean;
  answer?: string;
  source: "memory_bypass" | "normal";
  similarity: number;
  memoryId?: string;
  cacheId?: string;
  tokensAvoided: number;
  estimatedCostAvoidedUsd: number;
  bypassReason?: string;
  safetyChecksPassed: string[];
  rejectionReason?: BypassRejectionReason;
};
