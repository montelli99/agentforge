import crypto from "node:crypto";
import type {
  CacheEntry,
  CacheKey,
  CacheResult,
  TokenEstimate,
} from "./optimization-types.js";
import { estimateTokens } from "./cost.js";

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

export class SemanticCache {
  private exactCache: Map<string, CacheEntry> = new Map();
  private semanticCache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  private maxSize: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS, maxSize: number = MAX_CACHE_SIZE) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  private hashPrompt(prompt: string): string {
    return crypto.createHash("sha256").update(prompt).digest("hex");
  }

  private normalizeForSemantic(prompt: string): string {
    return prompt
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  private semanticHash(prompt: string): string {
    const normalized = this.normalizeForSemantic(prompt);
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > this.ttlMs;
  }

  private evictOldest(): void {
    if (this.exactCache.size <= this.maxSize) return;
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.exactCache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.exactCache.delete(oldestKey);
    }
  }

  private buildCacheKey(
    tenantId: string,
    taskType: string,
    prompt: string,
    modelFamily: string,
    policyConstraints: string[] = [],
  ): CacheKey {
    return {
      tenantId,
      taskType,
      promptHash: this.hashPrompt(prompt),
      modelFamily,
      policyConstraints: [...policyConstraints].sort(),
    };
  }

  private cacheKeyToString(key: CacheKey): string {
    return `${key.tenantId}:${key.taskType}:${key.promptHash}:${key.modelFamily}:${key.policyConstraints.join(",")}`;
  }

  lookup(
    tenantId: string,
    taskType: string,
    prompt: string,
    modelFamily: string,
    policyConstraints: string[] = [],
  ): CacheResult {
    const exactKey = this.buildCacheKey(
      tenantId,
      taskType,
      prompt,
      modelFamily,
      policyConstraints,
    );
    const exactKeyStr = this.cacheKeyToString(exactKey);

    const exactEntry = this.exactCache.get(exactKeyStr);
    if (exactEntry && !this.isExpired(exactEntry)) {
      exactEntry.lastAccessed = Date.now();
      exactEntry.accessCount++;
      const promptTokens = estimateTokens(prompt);
      return {
        hit: true,
        entry: exactEntry,
        savingsEstimate: {
          input: promptTokens.input,
          output: 0,
          total: promptTokens.input,
        },
      };
    }

    if (exactEntry && this.isExpired(exactKeyStr as unknown as CacheEntry)) {
      this.exactCache.delete(exactKeyStr);
    }

    const semanticKeyStr = this.semanticHash(prompt);
    const semanticEntry = this.semanticCache.get(semanticKeyStr);
    if (semanticEntry && !this.isExpired(semanticEntry)) {
      semanticEntry.lastAccessed = Date.now();
      semanticEntry.accessCount++;
      const promptTokens = estimateTokens(prompt);
      return {
        hit: true,
        entry: semanticEntry,
        savingsEstimate: {
          input: promptTokens.input,
          output: 0,
          total: promptTokens.input,
        },
      };
    }

    return {
      hit: false,
      savingsEstimate: { input: 0, output: 0, total: 0 },
    };
  }

  store(
    tenantId: string,
    taskType: string,
    prompt: string,
    modelFamily: string,
    response: unknown,
    policyConstraints: string[] = [],
  ): void {
    const key = this.buildCacheKey(
      tenantId,
      taskType,
      prompt,
      modelFamily,
      policyConstraints,
    );
    const keyStr = this.cacheKeyToString(key);
    const promptTokens = estimateTokens(prompt);

    const entry: CacheEntry = {
      key,
      response,
      tokenCount: promptTokens.input,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
    };

    this.evictOldest();
    this.exactCache.set(keyStr, entry);

    const semanticKeyStr = this.semanticHash(prompt);
    this.semanticCache.set(semanticKeyStr, entry);
  }

  clear(): void {
    this.exactCache.clear();
    this.semanticCache.clear();
  }

  stats(): {
    exactSize: number;
    semanticSize: number;
    totalHits: number;
    totalMisses: number;
  } {
    let totalHits = 0;
    for (const entry of this.exactCache.values()) {
      totalHits += entry.accessCount;
    }
    return {
      exactSize: this.exactCache.size,
      semanticSize: this.semanticCache.size,
      totalHits,
      totalMisses: 0,
    };
  }
}

let globalCache: SemanticCache | null = null;

export function getCache(): SemanticCache {
  if (!globalCache) {
    globalCache = new SemanticCache();
  }
  return globalCache;
}

export function resetCache(): void {
  globalCache = null;
}
