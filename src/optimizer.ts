import type {
  CanonicalEnvelope,
  RuntimeRequest,
} from "./types.js";
import type {
  OptimizationConfig,
  OptimizationResult,
  OptimizationTelemetry,
} from "./optimization-types.js";
import { DEFAULT_OPTIMIZATION_CONFIG } from "./optimization-types.js";
import { compressWithContext } from "./compression.js";
import { deduplicateWithContext } from "./context.js";
import { SemanticCache, getCache } from "./cache.js";
import { selectModelWithFailover } from "./modelSelector.js";
import { createTelemetry, createNoOpTelemetry } from "./telemetry.js";
import { getDeltaEngine, type ConversationMessage } from "./deltaEngine.js";
import { getSessionManager } from "./sessionManager.js";
import { optimizeForProvider, type PromptContext } from "./providerOptimizers.js";
import { getCostLedger } from "./costLedger.js";
import { getSemanticMemory } from "./semanticMemory.js";
import { getContextFingerprinter } from "./contextFingerprints.js";
import { getModelBenchmark, classifyPrompt } from "./modelBenchmark.js";
import { getMemoryContextOptimizer } from "./memoryContextOptimizer.js";
import {
  createContextFingerprint,
  type ContextFingerprint,
} from "./hybridFingerprint.js";
import {
  estimateTokens,
  createTokenAccount,
  type TokenAccount,
} from "./tokenAccounting.js";

export class AgentForgeOptimizer {
  private config: OptimizationConfig;
  private cache: SemanticCache;
  private deltaEngine = getDeltaEngine();
  private sessionManager = getSessionManager();
  private costLedger = getCostLedger();
  private semanticMemory = getSemanticMemory();
  private fingerprinter = getContextFingerprinter();
  private benchmark = getModelBenchmark();
  private memoryContextOptimizer = getMemoryContextOptimizer();

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
    this.cache = getCache();
  }

  async optimizeAsync(
    envelope: CanonicalEnvelope,
    request: RuntimeRequest,
  ): Promise<OptimizationResult> {
    return this.optimize(envelope, request);
  }

  async optimize(
    envelope: CanonicalEnvelope,
    request: RuntimeRequest,
  ): Promise<OptimizationResult> {
    if (!this.config.enabled) {
      return {
        optimized: false,
        envelope,
        telemetry: createNoOpTelemetry(
          this.extractPrompt(envelope),
          envelope.model,
        ),
        notes: ["optimization disabled"],
      };
    }

    const startTime = Date.now();
    const notes: string[] = [];
    let originalPrompt = this.extractPrompt(envelope);
    let optimizedPrompt = originalPrompt;
    let cacheStatus: "hit" | "miss" | "disabled" = "disabled";
    let compressionApplied = false;
    let contextDedupApplied = false;
    let memoryBypassApplied = false;
    let memoryBypassTokensSaved = 0;
    let memoryBypassCostSavedUsd = 0;
    let providerCallsAvoided = 0;
    let largeContextEliminated = false;
    let largeContextTokensSaved = 0;

    const fingerprint = this.fingerprinter.create(originalPrompt);
    notes.push(`fingerprint=${fingerprint.id}`);

    const sourceFingerprint = createContextFingerprint({
      content: originalPrompt,
      contentType: "prompt",
      tokenCount: estimateTokens(originalPrompt),
      tenantId: (envelope.policy.tenantId as string) || "default",
    });

    if (this.config.memoryBypass) {
      const estimatedInputTokens = estimateTokens(originalPrompt) + 1000;
      const estimatedOutputTokens = Math.ceil(estimateTokens(originalPrompt) * 0.3);

      const bypassResult = await this.memoryContextOptimizer.checkBypass({
        prompt: originalPrompt,
        tenantId: (envelope.policy.tenantId as string) || "default",
        modelFamily: this.getModelFamily(envelope.model.model),
        estimatedInputTokens,
        estimatedOutputTokens,
        provider: envelope.model.provider,
        model: envelope.model.model,
        sourceFingerprint,
      });

      if (bypassResult.bypassed && bypassResult.answer) {
        notes.push(`memory bypass: ${bypassResult.bypassReason}`);
        notes.push(`freshness: ${bypassResult.freshnessStatus}`);

        if (bypassResult.tokenAccount) {
          memoryBypassTokensSaved = bypassResult.tokenAccount.avoidedTotalTokens;
          memoryBypassCostSavedUsd = bypassResult.tokenAccount.costAvoidedUsd;
          notes.push(`tokens avoided: ${memoryBypassTokensSaved} (source: ${bypassResult.tokenAccount.tokenSource})`);
          notes.push(`cost avoided: $${memoryBypassCostSavedUsd.toFixed(6)}`);
        }

        providerCallsAvoided = 1;

        this.costLedger.record({
          tenantId: (envelope.policy.tenantId as string) || "default",
          provider: envelope.model.provider,
          model: envelope.model.model,
          inputTokens: 0,
          outputTokens: 0,
          inputCostUsd: 0,
          outputCostUsd: 0,
          cacheHits: 1,
          metadata: {
            memoryBypass: true,
            bypassReason: bypassResult.bypassReason,
            tokensAvoided: memoryBypassTokensSaved,
            costAvoided: memoryBypassCostSavedUsd,
            freshnessStatus: bypassResult.freshnessStatus,
          },
        });

        return {
          optimized: true,
          envelope: {
            ...envelope,
            request: {
              ...envelope.request,
              optimizedPrompt: bypassResult.answer,
            },
          },
          telemetry: createTelemetry({
            originalPrompt,
            optimizedPrompt: bypassResult.answer,
            selectedModel: envelope.model,
            routingReason: `memory bypass: ${bypassResult.bypassReason}`,
            cacheStatus: "hit",
            compressionApplied: false,
            contextDedupApplied: false,
            policyConstraintsApplied: [],
            fallbackUsed: false,
            optimizationTimeMs: Date.now() - startTime,
          }),
          notes,
        };
      }

      if (bypassResult.rejectionReason) {
        notes.push(`memory bypass rejected: ${bypassResult.rejectionReason}`);
        notes.push(`freshness: ${bypassResult.freshnessStatus}`);
      }
    }

    if (this.config.exactCache || this.config.semanticCache) {
      const cacheResult = this.cache.lookup(
        envelope.policy.tenantId as string || "default",
        "general",
        originalPrompt,
        this.getModelFamily(envelope.model.model),
      );
      if (cacheResult.hit) {
        cacheStatus = "hit";
        notes.push("cache hit");

        this.costLedger.record({
          tenantId: (envelope.policy.tenantId as string) || "default",
          provider: envelope.model.provider,
          model: envelope.model.model,
          inputTokens: 0,
          outputTokens: 0,
          inputCostUsd: 0,
          outputCostUsd: 0,
          cacheHits: 1,
          metadata: { cacheHit: true },
        });

        return {
          optimized: true,
          envelope,
          telemetry: createTelemetry({
            originalPrompt,
            optimizedPrompt: originalPrompt,
            selectedModel: envelope.model,
            routingReason: "cache hit - using cached response",
            cacheStatus: "hit",
            compressionApplied: false,
            contextDedupApplied: false,
            policyConstraintsApplied: [],
            fallbackUsed: false,
            optimizationTimeMs: Date.now() - startTime,
          }),
          notes,
        };
      }
      cacheStatus = "miss";
      notes.push("cache miss");
    }

    if (this.config.semanticMemory) {
      const memoryResult = await this.memoryContextOptimizer.optimizePrompt({
        prompt: originalPrompt,
        tenantId: (envelope.policy.tenantId as string) || "default",
        modelFamily: this.getModelFamily(envelope.model.model),
        tokenBudget: this.config.maxCostUsd ? undefined : 4000,
      });

      if (memoryResult.cacheHit && memoryResult.tokensSaved > 0) {
        optimizedPrompt = memoryResult.optimizedPrompt;
        notes.push(`memory context: eliminated ${memoryResult.tokensSaved} tokens (similarity: ${memoryResult.similarity.toFixed(2)})`);
      }
    }

    if (this.config.largeContextElimination) {
      const tokenEstimate = estimateTokens(originalPrompt);
      if (tokenEstimate > 1000) {
        const contextResult = this.memoryContextOptimizer.eliminateLargeContext({
          content: originalPrompt,
          contentType: "prompt",
          tokenCount: tokenEstimate,
          tenantId: (envelope.policy.tenantId as string) || "default",
          provider: envelope.model.provider,
          model: envelope.model.model,
        });

        if (contextResult.eliminated || contextResult.partialElimination) {
          optimizedPrompt = contextResult.replacedWith;
          largeContextEliminated = true;
          largeContextTokensSaved = contextResult.eliminatedTokens;

          if (contextResult.tokenAccount) {
            notes.push(`large context ${contextResult.matchType}: saved ${contextResult.eliminatedTokens} tokens (confidence: ${(contextResult.confidence * 100).toFixed(1)}%)`);
            notes.push(`chunks: ${contextResult.unchangedChunks} unchanged, ${contextResult.changedChunks} changed`);
            notes.push(`token source: ${contextResult.tokenAccount.tokenSource}`);
          } else {
            notes.push(`large context ${contextResult.matchType}: saved ${contextResult.eliminatedTokens} tokens`);
          }
        }
      }
    }

    if (this.config.contextDeduplication) {
      const dedupResult = deduplicateWithContext(originalPrompt);
      if (dedupResult.savingsEstimate.total > 0) {
        optimizedPrompt = dedupResult.deduped;
        contextDedupApplied = true;
        notes.push(`context dedup: saved ${dedupResult.savingsEstimate.total} tokens`);
      }
    }

    if (this.config.promptCompression) {
      const compressionResult = compressWithContext(optimizedPrompt);
      if (compressionResult.confidence >= 0.7) {
        optimizedPrompt = compressionResult.compressed;
        compressionApplied = true;
        notes.push(`compression: ${(compressionResult.savingsPercent * 100).toFixed(1)}% savings`);
      } else {
        notes.push(`compression skipped: low confidence (${compressionResult.confidence})`);
      }
    }

    const promptContext: PromptContext = {
      taskType: classifyPrompt(originalPrompt) as PromptContext["taskType"],
    };

    const providerOptimization = optimizeForProvider(
      envelope.model.provider,
      optimizedPrompt,
      promptContext,
    );

    if (providerOptimization.confidence >= 0.7) {
      optimizedPrompt = providerOptimization.optimizedPrompt;
      notes.push(`provider optimization: ${providerOptimization.techniques.join(", ")}`);
    }

    const selectedModel = this.config.costAwareRouting || this.config.providerFailover
      ? selectModelWithFailover(
          envelope.model,
          optimizedPrompt,
          this.config,
          {
            requiresImages: !!envelope.imageModel,
            policyConstraints: [],
          },
        )
      : {
          selected: envelope.model,
          reason: "no optimization applied",
          fallbackUsed: false,
          costEstimate: { inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0, provider: envelope.model.provider, model: envelope.model.model },
          latencyEstimate: "balanced" as const,
        };

    if (selectedModel.selected.provider !== envelope.model.provider ||
        selectedModel.selected.model !== envelope.model.model) {
      notes.push(`model override: ${envelope.model.provider}/${envelope.model.model} -> ${selectedModel.selected.provider}/${selectedModel.selected.model}`);
    }

    const optimizedEnvelope: CanonicalEnvelope = {
      ...envelope,
      model: selectedModel.selected,
      request: {
        ...envelope.request,
        optimizedPrompt,
      },
    };

    const tokenAccount = createTokenAccount({
      baselinePrompt: originalPrompt,
      optimizedPrompt,
      estimatedOutputTokens: Math.ceil(estimateTokens(originalPrompt) * 0.3),
      provider: envelope.model.provider,
      model: envelope.model.model,
      contextTokensAvoided: largeContextTokensSaved,
      memoryBypassTokensAvoided: memoryBypassTokensSaved,
      notes,
    });

    const telemetry = createTelemetry({
      originalPrompt,
      optimizedPrompt,
      selectedModel: selectedModel.selected,
      routingReason: selectedModel.reason,
      cacheStatus,
      compressionApplied,
      contextDedupApplied,
      policyConstraintsApplied: [],
      fallbackUsed: selectedModel.fallbackUsed,
      optimizationTimeMs: Date.now() - startTime,
    });

    telemetry.memoryBypassApplied = memoryBypassApplied;
    telemetry.memoryBypassTokensSaved = memoryBypassTokensSaved;
    telemetry.memoryBypassCostSavedUsd = memoryBypassCostSavedUsd;
    telemetry.providerCallsAvoided = providerCallsAvoided;
    telemetry.largeContextEliminated = largeContextEliminated;
    telemetry.largeContextTokensSaved = largeContextTokensSaved;

    if (this.config.exactCache || this.config.semanticCache) {
      this.cache.store(
        envelope.policy.tenantId as string || "default",
        "general",
        originalPrompt,
        this.getModelFamily(envelope.model.model),
        optimizedEnvelope,
      );
    }

    this.costLedger.record({
      tenantId: (envelope.policy.tenantId as string) || "default",
      provider: selectedModel.selected.provider,
      model: selectedModel.selected.model,
      inputTokens: telemetry.originalTokens.input,
      outputTokens: telemetry.originalTokens.output,
      inputCostUsd: telemetry.estimatedCostAfter.inputCostUsd,
      outputCostUsd: telemetry.estimatedCostAfter.outputCostUsd,
      cacheHits: cacheStatus === "hit" ? 1 : 0,
      compressionSavingsTokens: compressionApplied
        ? telemetry.originalTokens.total - telemetry.optimizedTokens.total
        : 0,
      metadata: { optimizationNotes: notes },
    });

    return {
      optimized: true,
      envelope: optimizedEnvelope,
      telemetry,
      notes,
    };
  }

  async optimizeWithDelta(
    envelope: CanonicalEnvelope,
    request: RuntimeRequest,
    sessionId: string,
    messages: ConversationMessage[],
  ): Promise<OptimizationResult & { deltaSavings?: number }> {
    const baseResult = await this.optimize(envelope, request);

    if (!this.config.enabled) {
      return baseResult;
    }

    const delta = this.deltaEngine.processTurn(sessionId, messages);

    this.sessionManager.recordDeltaSavings(
      sessionId,
      delta.originalTokens.total - delta.deltaTokens.total,
    );

    return {
      ...baseResult,
      deltaSavings: delta.originalTokens.total - delta.deltaTokens.total,
      notes: [
        ...baseResult.notes,
        `delta: turn ${delta.turnNumber}, saved ${delta.savingsPercent.toFixed(1)}%`,
      ],
    };
  }

  private extractPrompt(envelope: CanonicalEnvelope): string {
    const request = envelope.request as Record<string, unknown>;
    if (typeof request.prompt === "string") return request.prompt;
    if (typeof request.message === "string") return request.message;
    if (typeof request.text === "string") return request.text;
    return JSON.stringify(request);
  }

  private getModelFamily(model: string): string {
    if (model.startsWith("claude")) return "anthropic";
    if (model.startsWith("gpt")) return "openai";
    if (model.startsWith("gemini")) return "google";
    if (model.startsWith("llama")) return "meta";
    return "other";
  }

  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  getDeltaEngine() {
    return this.deltaEngine;
  }

  getSessionManager() {
    return this.sessionManager;
  }

  getCostLedger() {
    return this.costLedger;
  }

  getSemanticMemory() {
    return this.semanticMemory;
  }

  getContextFingerprinter() {
    return this.fingerprinter;
  }

  getModelBenchmark() {
    return this.benchmark;
  }
}

export function createOptimizer(
  config: Partial<OptimizationConfig> = {},
): AgentForgeOptimizer {
  return new AgentForgeOptimizer(config);
}
