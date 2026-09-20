import { getSemanticMemory, type SemanticEntry, type SemanticMemory } from "./semanticMemory.js";
import { guardToolResult } from "./contextGuard.js";
import {
  createContextFingerprint,
  compareFingerprints,
  storeFingerprint,
  findMatchingFingerprint,
  type ContextFingerprint,
  type ContextMatchResult,
  type ContentType,
  type Chunk,
  type ChunkType,
} from "./hybridFingerprint.js";
import {
  createTokenAccount,
  createBypassAccount,
  createPartialEliminationAccount,
  estimateTokens,
  type TokenAccount,
} from "./tokenAccounting.js";

export type MemoryContextConfig = {
  enabled: boolean;
  maxMemoryTokens: number;
  similarityThreshold: number;
  cacheLookupTimeoutMs: number;
  memoryInjectionStyle: "brief" | "detailed" | "structured";
  memoryBypass: boolean;
  memoryBypassThreshold: number;
  memoryBypassMaxAgeMs: number;
  memoryBypassRiskFilter: boolean;
  largeContextElimination: boolean;
  largeContextFingerprintThreshold: number;
};

export const DEFAULT_MEMORY_CONTEXT_CONFIG: MemoryContextConfig = {
  enabled: true,
  maxMemoryTokens: 2000,
  similarityThreshold: 0.85,
  cacheLookupTimeoutMs: 100,
  memoryInjectionStyle: "brief",
  memoryBypass: true,
  memoryBypassThreshold: 0.92,
  memoryBypassMaxAgeMs: 86400000,
  memoryBypassRiskFilter: true,
  largeContextElimination: true,
  largeContextFingerprintThreshold: 0.95,
};

export type BypassRejectionReason =
  | "low_confidence"
  | "stale_memory"
  | "latest_query"
  | "context_changed"
  | "risk_filter"
  | "tenant_mismatch"
  | "new_instructions"
  | "security_sensitive"
  | "unknown_freshness";

export type FreshnessStatus =
  | "fresh"
  | "stale_by_age"
  | "stale_by_source_change"
  | "stale_by_context_change"
  | "stale_by_policy_change"
  | "stale_by_current_query"
  | "unknown";

export type MemoryBypassResult = {
  bypassed: boolean;
  answer?: string;
  source: "memory_bypass" | "normal";
  similarity: number;
  memoryId?: string;
  cacheId?: string;
  tokenAccount?: TokenAccount;
  bypassReason?: string;
  safetyChecksPassed: string[];
  rejectionReason?: BypassRejectionReason;
  freshnessStatus: FreshnessStatus;
};

export type MemoryContextResult = {
  optimizedPrompt: string;
  tokensSaved: number;
  cacheHit: boolean;
  matchedEntry: SemanticEntry | null;
  similarity: number;
  responseInjected: boolean;
  tokenAccount?: TokenAccount;
};

export type LargeContextResult = {
  eliminated: boolean;
  partialElimination: boolean;
  originalTokens: number;
  eliminatedTokens: number;
  preservedTokens: number;
  fingerprintId: string;
  replacedWith: string;
  matchType: string;
  confidence: number;
  unchangedChunks: number;
  changedChunks: number;
  newChunks: number;
  deletedChunks: number;
  tokenAccount?: TokenAccount;
};

const RISK_PATTERNS = [
  /security/i,
  /password/i,
  /secret/i,
  /token/i,
  /api.?key/i,
  /credential/i,
  /legal/i,
  /medical/i,
  /financial/i,
  /health/i,
  /diagnosis/i,
  /prescription/i,
  /lawsuit/i,
  /contract/i,
];

const LATEST_QUERY_PATTERNS = [
  /latest/i,
  /current/i,
  /recent/i,
  /today/i,
  /now/i,
  /this.?week/i,
  /this.?month/i,
  /202[4-9]/i,
  /203[0-9]/i,
];

const NEW_INSTRUCTION_PATTERNS = [
  /please.?update/i,
  /modify/i,
  /change/i,
  /rewrite/i,
  /different/i,
  /instead/i,
  /new.?version/i,
  /revised/i,
  /refactor/i,
  /improve/i,
  /optimize/i,
  /create.?new/i,
];

export class MemoryContextOptimizer {
  private config: MemoryContextConfig;
  private lookupTimeoutMs: number;
  private memory: SemanticMemory | null;

  constructor(config: Partial<MemoryContextConfig> & { memory?: SemanticMemory } = {}) {
    this.config = { ...DEFAULT_MEMORY_CONTEXT_CONFIG, ...config };
    this.lookupTimeoutMs = this.config.cacheLookupTimeoutMs;
    this.memory = config.memory || null;
  }

  async checkBypass(params: {
    prompt: string;
    tenantId: string;
    modelFamily?: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    provider: string;
    model: string;
    sourceFingerprint?: ContextFingerprint;
  }): Promise<MemoryBypassResult> {
    if (!this.config.enabled || !this.config.memoryBypass) {
      return this.createNoBypassResult("memory_bypass_disabled");
    }

    const safetyChecksPassed: string[] = [];

    try {
      const memory = this.memory || await getSemanticMemory();

      const lookupResult = await Promise.race([
        memory.query({
          prompt: params.prompt,
          tenantId: params.tenantId,
          modelFamily: params.modelFamily,
          topK: 1,
          threshold: this.config.memoryBypassThreshold,
        }),
        this.timeoutPromise(),
      ]);

      if (!lookupResult || !lookupResult.hit || !lookupResult.entry) {
        return this.createNoBypassResult("low_confidence");
      }

      const entry = lookupResult.entry;

      const rejectionReason = this.runSafetyChecks(
        params.prompt,
        entry,
        params.tenantId,
        safetyChecksPassed,
      );

      if (rejectionReason) {
        return {
          bypassed: false,
          source: "normal",
          similarity: lookupResult.similarity,
          memoryId: entry.id,
          tokenAccount: createBypassAccount({
            baselinePrompt: params.prompt,
            estimatedInputTokens: params.estimatedInputTokens,
            estimatedOutputTokens: params.estimatedOutputTokens,
            provider: params.provider,
            model: params.model,
            similarity: lookupResult.similarity,
            notes: [`bypass rejected: ${rejectionReason}`],
          }),
          rejectionReason,
          safetyChecksPassed,
          freshnessStatus: "unknown",
        };
      }

      if (params.sourceFingerprint) {
        const storedFingerprint = findMatchingFingerprint(params.sourceFingerprint);
        if (storedFingerprint && storedFingerprint.matchType === "miss") {
          return {
            bypassed: false,
            source: "normal",
            similarity: lookupResult.similarity,
            memoryId: entry.id,
            tokenAccount: createBypassAccount({
              baselinePrompt: params.prompt,
              estimatedInputTokens: params.estimatedInputTokens,
              estimatedOutputTokens: params.estimatedOutputTokens,
              provider: params.provider,
              model: params.model,
              similarity: lookupResult.similarity,
              notes: ["bypass rejected: context changed"],
            }),
            rejectionReason: "context_changed",
            safetyChecksPassed,
            freshnessStatus: "stale_by_context_change",
          };
        }
      }

      const freshnessStatus = this.checkFreshness(entry, params.sourceFingerprint);
      if (freshnessStatus !== "fresh") {
        return {
          bypassed: false,
          source: "normal",
          similarity: lookupResult.similarity,
          memoryId: entry.id,
          tokenAccount: createBypassAccount({
            baselinePrompt: params.prompt,
            estimatedInputTokens: params.estimatedInputTokens,
            estimatedOutputTokens: params.estimatedOutputTokens,
            provider: params.provider,
            model: params.model,
            similarity: lookupResult.similarity,
            notes: [`bypass rejected: ${freshnessStatus}`],
          }),
          rejectionReason: "stale_memory",
          safetyChecksPassed,
          freshnessStatus,
        };
      }

      const responseText = typeof entry.response === "string"
        ? entry.response
        : JSON.stringify(entry.response);

      const tokenAccount = createBypassAccount({
        baselinePrompt: params.prompt,
        estimatedInputTokens: params.estimatedInputTokens,
        estimatedOutputTokens: params.estimatedOutputTokens,
        provider: params.provider,
        model: params.model,
        similarity: lookupResult.similarity,
      });

      return {
        bypassed: true,
        answer: responseText,
        source: "memory_bypass",
        similarity: lookupResult.similarity,
        memoryId: entry.id,
        tokenAccount,
        bypassReason: `High-confidence memory match (${(lookupResult.similarity * 100).toFixed(1)}%)`,
        safetyChecksPassed,
        freshnessStatus: "fresh",
      };
    } catch (error) {
      console.error("[AgentForge] Memory bypass check failed:", error);
      return this.createNoBypassResult("lookup_error");
    }
  }

  private runSafetyChecks(
    prompt: string,
    entry: SemanticEntry,
    tenantId: string,
    safetyChecksPassed: string[],
  ): BypassRejectionReason | null {
    if (entry.tenantId !== tenantId) {
      safetyChecksPassed.push("tenant_isolation");
      return "tenant_mismatch";
    }
    safetyChecksPassed.push("tenant_match");

    const age = Date.now() - entry.createdAt;
    if (age > this.config.memoryBypassMaxAgeMs) {
      safetyChecksPassed.push("freshness_check");
      return "stale_memory";
    }
    safetyChecksPassed.push("freshness_ok");

    if (this.config.memoryBypassRiskFilter) {
      for (const pattern of RISK_PATTERNS) {
        if (pattern.test(prompt)) {
          safetyChecksPassed.push("risk_filter");
          return "risk_filter";
        }
      }
      safetyChecksPassed.push("risk_clear");
    }

    for (const pattern of LATEST_QUERY_PATTERNS) {
      if (pattern.test(prompt)) {
        safetyChecksPassed.push("recency_check");
        return "latest_query";
      }
    }
    safetyChecksPassed.push("recency_ok");

    for (const pattern of NEW_INSTRUCTION_PATTERNS) {
      if (pattern.test(prompt)) {
        safetyChecksPassed.push("instruction_check");
        return "new_instructions";
      }
    }
    safetyChecksPassed.push("instructions_ok");

    return null;
  }

  private checkFreshness(
    entry: SemanticEntry,
    sourceFingerprint?: ContextFingerprint,
  ): FreshnessStatus {
    const age = Date.now() - entry.createdAt;
    if (age > this.config.memoryBypassMaxAgeMs) {
      return "stale_by_age";
    }

    if (sourceFingerprint && entry.metadata?.fingerprint) {
      const storedFingerprint = entry.metadata.fingerprint as ContextFingerprint;
      const match = compareFingerprints(sourceFingerprint, storedFingerprint);
      if (match.matchType === "miss") {
        return "stale_by_context_change";
      }
    }

    return "fresh";
  }

  private createNoBypassResult(reason: string): MemoryBypassResult {
    return {
      bypassed: false,
      source: "normal",
      similarity: 0,
      tokenAccount: createBypassAccount({
        baselinePrompt: "",
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        provider: "unknown",
        model: "unknown",
        similarity: 0,
        notes: [`bypass rejected: ${reason}`],
      }),
      rejectionReason: reason as BypassRejectionReason,
      safetyChecksPassed: [],
      freshnessStatus: "unknown",
    };
  }

  eliminateLargeContext(params: {
    content: string;
    contentType?: ContentType;
    tokenCount: number;
    tenantId: string;
    provider: string;
    model: string;
    fileIds?: string[];
    sourceIds?: string[];
    currentContextTokens?: number;
  }): LargeContextResult {
    if (!this.config.largeContextElimination || params.tokenCount < 1000) {
      return {
        eliminated: false,
        partialElimination: false,
        originalTokens: params.tokenCount,
        eliminatedTokens: 0,
        preservedTokens: params.tokenCount,
        fingerprintId: "",
        replacedWith: params.content,
        matchType: "none",
        confidence: 0,
        unchangedChunks: 0,
        changedChunks: 0,
        newChunks: 0,
        deletedChunks: 0,
      };
    }

    const fingerprint = createContextFingerprint({
      content: params.content,
      contentType: params.contentType,
      tokenCount: params.tokenCount,
      tenantId: params.tenantId,
      fileIds: params.fileIds,
      sourceIds: params.sourceIds,
    });

    const matchResult = findMatchingFingerprint(fingerprint);

    if (!matchResult) {
      storeFingerprint(fingerprint);

      // Apply native context budget guard for first-time large tool results
      const guard = guardToolResult({
        toolResult: params.content,
        currentContextTokens: params.currentContextTokens || 140000,
        tenantId: params.tenantId
      });

      return {
        eliminated: guard.truncated,
        partialElimination: guard.truncated,
        originalTokens: params.tokenCount,
        eliminatedTokens: guard.telemetry.omittedToolTokens,
        preservedTokens: guard.telemetry.visibleToolTokens,
        fingerprintId: guard.telemetry.toolResultReference || fingerprint.exactHash,
        replacedWith: guard.guardedContent,
        matchType: guard.truncated ? "guarded_truncation" : "new",
        confidence: 1.0,
        unchangedChunks: 0,
        changedChunks: fingerprint.chunks.length,
        newChunks: 0,
        deletedChunks: 0,
      };
    }

    if (matchResult.matchType === "exact" || matchResult.matchType === "normalized") {
      const compactReference = this.createCompactReference(
        fingerprint,
        params.tokenCount,
      );

      const eliminatedTokens = params.tokenCount - estimateTokens(compactReference);

      const tokenAccount = createPartialEliminationAccount({
        baselineTokens: params.tokenCount,
        eliminatedTokens,
        preservedTokens: estimateTokens(compactReference),
        provider: params.provider,
        model: params.model,
        matchType: matchResult.matchType,
        confidence: matchResult.confidence,
      });

      return {
        eliminated: true,
        partialElimination: false,
        originalTokens: params.tokenCount,
        eliminatedTokens,
        preservedTokens: estimateTokens(compactReference),
        fingerprintId: fingerprint.exactHash,
        replacedWith: compactReference,
        matchType: matchResult.matchType,
        confidence: matchResult.confidence,
        unchangedChunks: matchResult.unchangedChunks,
        changedChunks: matchResult.changedChunks,
        newChunks: matchResult.newChunks,
        deletedChunks: matchResult.deletedChunks,
        tokenAccount,
      };
    }

    if (matchResult.matchType === "chunk_partial" && (matchResult.changedChunks > 0 || matchResult.newChunks > 0)) {
      const preservedContent = this.buildPartialEliminationOutput(
        fingerprint,
        matchResult,
      );

      const preservedTokens = estimateTokens(preservedContent);

      if (preservedTokens >= params.tokenCount) {
        return {
          eliminated: false,
          partialElimination: false,
          originalTokens: params.tokenCount,
          eliminatedTokens: 0,
          preservedTokens: params.tokenCount,
          fingerprintId: fingerprint.exactHash,
          replacedWith: params.content,
          matchType: matchResult.matchType,
          confidence: matchResult.confidence,
          unchangedChunks: matchResult.unchangedChunks,
          changedChunks: matchResult.changedChunks,
          newChunks: matchResult.newChunks,
          deletedChunks: matchResult.deletedChunks,
        };
      }

      const eliminatedTokens = Math.max(0, params.tokenCount - preservedTokens);

      const tokenAccount = createPartialEliminationAccount({
        baselineTokens: params.tokenCount,
        eliminatedTokens,
        preservedTokens,
        provider: params.provider,
        model: params.model,
        matchType: matchResult.matchType,
        confidence: matchResult.confidence,
      });

      return {
        eliminated: false,
        partialElimination: true,
        originalTokens: params.tokenCount,
        eliminatedTokens,
        preservedTokens,
        fingerprintId: fingerprint.exactHash,
        replacedWith: preservedContent,
        matchType: matchResult.matchType,
        confidence: matchResult.confidence,
        unchangedChunks: matchResult.unchangedChunks,
        changedChunks: matchResult.changedChunks,
        newChunks: matchResult.newChunks,
        deletedChunks: matchResult.deletedChunks,
        tokenAccount,
      };
    }

    return {
      eliminated: false,
      partialElimination: false,
      originalTokens: params.tokenCount,
      eliminatedTokens: 0,
      preservedTokens: params.tokenCount,
      fingerprintId: fingerprint.exactHash,
      replacedWith: params.content,
      matchType: matchResult.matchType,
      confidence: matchResult.confidence,
      unchangedChunks: matchResult.unchangedChunks,
      changedChunks: matchResult.changedChunks,
      newChunks: matchResult.newChunks,
      deletedChunks: matchResult.deletedChunks,
    };
  }

  private buildPartialEliminationOutput(
    fingerprint: ContextFingerprint,
    matchResult: ContextMatchResult,
  ): string {
    const parts: string[] = [];

    parts.push("[AgentForge Known Context]");
    parts.push(`Context fingerprint: ${fingerprint.exactHash}`);
    parts.push("Unchanged context omitted to prevent token waste.");
    parts.push("");

    const chunkMap = new Map<string, Chunk>();
    for (const chunk of fingerprint.chunks) {
      chunkMap.set(chunk.id, chunk);
    }

    parts.push("Known chunks:");
    for (const chunkId of matchResult.unchangedChunkIds) {
      const chunk = chunkMap.get(chunkId);
      if (chunk) {
        parts.push(`- ${chunk.type}: ${chunk.label} hash:${chunk.normalizedHash.slice(0, 8)} tokens:${chunk.tokenCount}`);
      }
    }
    parts.push("");

    parts.push("[Changed/New Context Included]");
    parts.push("");

    for (const chunkId of matchResult.changedChunkIds) {
      const chunk = chunkMap.get(chunkId);
      if (chunk) {
        parts.push(`[${chunk.type}: ${chunk.label}]`);
        parts.push(chunk.content);
        parts.push(`[End ${chunk.type}: ${chunk.label}]`);
        parts.push("");
      }
    }

    for (const chunkId of matchResult.newChunkIds) {
      const chunk = chunkMap.get(chunkId);
      if (chunk) {
        parts.push(`[NEW ${chunk.type}: ${chunk.label}]`);
        parts.push(chunk.content);
        parts.push(`[End ${chunk.type}: ${chunk.label}]`);
        parts.push("");
      }
    }

    return parts.join("\n");
  }

  private createCompactReference(
    fingerprint: ContextFingerprint,
    originalTokens: number,
  ): string {
    const chunkSummary = fingerprint.chunks
      .map(c => `- ${c.type}: ${c.label} hash:${c.normalizedHash.slice(0, 8)} tokens:${c.tokenCount}`)
      .join("\n");

    return `[AgentForge Known Context]
Context fingerprint: ${fingerprint.exactHash}
Unchanged context omitted to prevent token waste.
Known chunks:
${chunkSummary}`;
  }

  private timeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Memory lookup timeout"));
      }, this.lookupTimeoutMs);
    });
  }

  async optimizePrompt(params: {
    prompt: string;
    tenantId: string;
    modelFamily?: string;
    tokenBudget?: number;
  }): Promise<MemoryContextResult> {
    if (!this.config.enabled) {
      return {
        optimizedPrompt: params.prompt,
        tokensSaved: 0,
        cacheHit: false,
        matchedEntry: null,
        similarity: 0,
        responseInjected: false,
      };
    }

    try {
      const memory = this.memory || await getSemanticMemory();

      const lookupResult = await Promise.race([
        memory.query({
          prompt: params.prompt,
          tenantId: params.tenantId,
          modelFamily: params.modelFamily,
          topK: 1,
          threshold: this.config.similarityThreshold,
        }),
        this.timeoutPromise(),
      ]);

      if (!lookupResult || !lookupResult.hit || !lookupResult.entry) {
        return {
          optimizedPrompt: params.prompt,
          tokensSaved: 0,
          cacheHit: false,
          matchedEntry: null,
          similarity: 0,
          responseInjected: false,
        };
      }

      const entry = lookupResult.entry;
      const responseText = typeof entry.response === "string"
        ? entry.response
        : JSON.stringify(entry.response);

      const optimizedPrompt = `[CACHED RESPONSE]\n${responseText}\n[END CACHED RESPONSE]\n\n${params.prompt}`;

      const originalTokens = estimateTokens(params.prompt);
      const responseTokens = estimateTokens(responseText);
      const tokensSaved = responseTokens;

      return {
        optimizedPrompt,
        tokensSaved,
        cacheHit: true,
        matchedEntry: entry,
        similarity: lookupResult.similarity,
        responseInjected: true,
      };
    } catch (error) {
      console.error("[AgentForge] Memory optimization failed:", error);
      return {
        optimizedPrompt: params.prompt,
        tokensSaved: 0,
        cacheHit: false,
        matchedEntry: null,
        similarity: 0,
        responseInjected: false,
      };
    }
  }

  getConfig(): MemoryContextConfig {
    return { ...this.config };
  }
}

let globalOptimizer: MemoryContextOptimizer | null = null;

export function getMemoryContextOptimizer(
  config?: Partial<MemoryContextConfig>,
): MemoryContextOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new MemoryContextOptimizer(config);
  }
  return globalOptimizer;
}

export function resetMemoryContextOptimizer(): void {
  globalOptimizer = null;
}
