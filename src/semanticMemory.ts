import crypto from "node:crypto";
import { getRealEmbeddingProvider, type EmbeddingProviderStatus, type RealEmbeddingProvider } from "./embeddingAdapter.js";

export type Embedding = number[];

export type SemanticEntry = {
  id: string;
  prompt: string;
  response: unknown;
  embedding: Embedding;
  tenantId: string;
  modelFamily: string;
  tokenCount: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  metadata: Record<string, unknown>;
};

export type SemanticQuery = {
  prompt: string;
  tenantId: string;
  modelFamily?: string;
  topK?: number;
  threshold?: number;
};

export type SemanticResult = {
  hit: boolean;
  entry?: SemanticEntry;
  similarity: number;
  savingsEstimate: number;
};

export interface EmbeddingProvider {
  embed(text: string): Promise<Embedding>;
  dimension: number;
}

/** Optional durable boundary for semantic entries. Implementations must apply
 * their own privacy, encryption and tenant-retention policy. */
export interface SemanticMemoryPersistence {
  load(): Promise<SemanticEntry[]> | SemanticEntry[];
  save(entries: SemanticEntry[]): Promise<void> | void;
}

function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export class SemanticMemory {
  private entries: Map<string, SemanticEntry> = new Map();
  private embeddingProvider: EmbeddingProvider;
  private maxEntries: number;
  private defaultThreshold: number;
  private providerStatus: EmbeddingProviderStatus | null = null;
  private loaded = false;

  constructor(
    embeddingProvider: EmbeddingProvider,
    maxEntries: number = 10000,
    defaultThreshold: number = 0.85,
    private readonly persistence?: SemanticMemoryPersistence,
  ) {
    this.embeddingProvider = embeddingProvider;
    this.maxEntries = maxEntries;
    this.defaultThreshold = defaultThreshold;
  }

  setProviderStatus(status: EmbeddingProviderStatus): void {
    this.providerStatus = status;
  }

  getProviderStatus(): EmbeddingProviderStatus | null {
    return this.providerStatus;
  }

  isUsingRealEmbeddings(): boolean {
    return this.providerStatus?.mode === "real";
  }

  async store(params: {
    prompt: string;
    response: unknown;
    tenantId: string;
    modelFamily: string;
    tokenCount: number;
    metadata?: Record<string, unknown>;
  }): Promise<SemanticEntry> {
    await this.ensureLoaded();
    const embedding = await this.embeddingProvider.embed(params.prompt);

    const entry: SemanticEntry = {
      id: `sem_${hashText(params.prompt)}`,
      prompt: params.prompt,
      response: params.response,
      embedding,
      tenantId: params.tenantId,
      modelFamily: params.modelFamily,
      tokenCount: params.tokenCount,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      metadata: params.metadata || {},
    };

    this.entries.set(entry.id, entry);
    this.evictIfNeeded();
    await this.persistEntries();

    return entry;
  }

  async query(query: SemanticQuery): Promise<SemanticResult> {
    await this.ensureLoaded();
    const queryEmbedding = await this.embeddingProvider.embed(query.prompt);
    const threshold = query.threshold || this.defaultThreshold;
    const topK = query.topK || 5;

    memoryRetrievalCounter++;

    let candidates = Array.from(this.entries.values());

    if (query.tenantId) {
      candidates = candidates.filter((e) => e.tenantId === query.tenantId);
    }

    if (query.modelFamily) {
      candidates = candidates.filter((e) => e.modelFamily === query.modelFamily);
    }

    const scored = candidates.map((entry) => ({
      entry,
      similarity: cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);

    const topResults = scored.slice(0, topK);

    const bestMatch = topResults[0];

    if (bestMatch && bestMatch.similarity >= threshold) {
      semanticMatchCounter++;
      bestMatch.entry.lastAccessed = Date.now();
      bestMatch.entry.accessCount++;
      await this.persistEntries();

      return {
        hit: true,
        entry: bestMatch.entry,
        similarity: bestMatch.similarity,
        savingsEstimate: bestMatch.entry.tokenCount,
      };
    }

    return {
      hit: false,
      similarity: bestMatch?.similarity || 0,
      savingsEstimate: 0,
    };
  }

  private evictIfNeeded(): void {
    if (this.entries.size <= this.maxEntries) return;

    const sorted = Array.from(this.entries.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    const toRemove = sorted.slice(0, sorted.length - this.maxEntries);
    for (const entry of toRemove) {
      this.entries.delete(entry.id);
    }
  }

  clear(): void {
    this.entries.clear();
    void this.persistEntries();
  }

  async initialize(): Promise<void> {
    await this.ensureLoaded();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.persistence) return;
    const persisted = await this.persistence.load();
    for (const entry of persisted) {
      if (entry && typeof entry.id === "string" && Array.isArray(entry.embedding)) {
        this.entries.set(entry.id, entry);
      }
    }
    this.evictIfNeeded();
  }

  private async persistEntries(): Promise<void> {
    if (this.persistence) await this.persistence.save(Array.from(this.entries.values()));
  }

  getEntryCount(): number {
    return this.entries.size;
  }

  getEntriesByTenant(tenantId: string): SemanticEntry[] {
    return Array.from(this.entries.values()).filter(
      (e) => e.tenantId === tenantId,
    );
  }

  getStats(): {
    totalEntries: number;
    totalAccessCount: number;
    averageAge: number;
    embeddingMode: string;
    embeddingProvider: string;
  } {
    const entries = Array.from(this.entries.values());
    const totalAccessCount = entries.reduce((sum, e) => sum + e.accessCount, 0);
    const now = Date.now();
    const averageAge = entries.length > 0
      ? entries.reduce((sum, e) => sum + (now - e.createdAt), 0) / entries.length
      : 0;

    return {
      totalEntries: entries.length,
      totalAccessCount,
      averageAge,
      embeddingMode: this.providerStatus?.mode || "unknown",
      embeddingProvider: this.providerStatus?.provider || "unknown",
    };
  }
}

let globalSemanticMemory: SemanticMemory | null = null;
let semanticMatchCounter = 0;
let memoryRetrievalCounter = 0;

export function getSemanticMatchCount(): number {
  return semanticMatchCounter;
}

export function getMemoryRetrievalCount(): number {
  return memoryRetrievalCounter;
}

export async function getSemanticMemory(): Promise<SemanticMemory> {
  if (!globalSemanticMemory) {
    const provider = await getRealEmbeddingProvider();

    globalSemanticMemory = new SemanticMemory(provider);
    globalSemanticMemory.setProviderStatus(provider.getStatus());
  }
  return globalSemanticMemory;
}

export function getSemanticMemorySync(): SemanticMemory {
  if (!globalSemanticMemory) {
    throw new Error("SemanticMemory not initialized. Call getSemanticMemory() first.");
  }
  return globalSemanticMemory;
}

export function resetSemanticMemory(): void {
  globalSemanticMemory = null;
}
