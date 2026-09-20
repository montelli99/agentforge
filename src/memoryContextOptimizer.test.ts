import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SemanticMemory } from "./semanticMemory.js";
import { MemoryContextOptimizer } from "./memoryContextOptimizer.js";
import { RealEmbeddingProvider } from "./embeddingAdapter.js";

describe("Phase 3A: Real Embeddings + Memory Context Optimizer", () => {
  let embeddingProvider: RealEmbeddingProvider;
  let memory: SemanticMemory;
  let optimizer: MemoryContextOptimizer;

  beforeEach(async () => {
    embeddingProvider = new RealEmbeddingProvider({
      provider: "none",
      fallbackToHash: true,
    });
    await embeddingProvider.initialize();
    
    memory = new SemanticMemory(embeddingProvider, 1000, 0.85);
    memory.setProviderStatus(embeddingProvider.getStatus());
    optimizer = new MemoryContextOptimizer({
      enabled: true,
      similarityThreshold: 0.85,
      memory,
    });
  });

  afterEach(() => {
    memory.clear();
  });

  it("should initialize with hash fallback provider", async () => {
    expect(embeddingProvider).toBeDefined();
    expect(embeddingProvider.isReal()).toBe(false);
    expect(embeddingProvider.getStatus().mode).toBe("hash-fallback");
  });

  it("should generate embeddings", async () => {
    const embedding = await embeddingProvider.embed("test text");
    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(128);
    expect(embedding.every((v) => typeof v === "number")).toBe(true);
  });

  it("should store and query semantic entries", async () => {
    await memory.store({
      prompt: "How do I configure OpenClaw for Telegram?",
      response: "Use `openclaw config set telegram.token <token>`",
      tenantId: "test-tenant",
      modelFamily: "anthropic",
      tokenCount: 150,
    });

    const result = await memory.query({
      prompt: "How do I set up Telegram in OpenClaw?",
      tenantId: "test-tenant",
    });

    expect(result.hit).toBe(true);
    expect(result.entry).toBeDefined();
    expect(result.similarity).toBeGreaterThan(0.5);
  });

  it("should optimize prompts with memory context", async () => {
    // First, store a response
    await memory.store({
      prompt: "What is the meaning of life?",
      response: "The meaning of life is 42.",
      tenantId: "test-tenant",
      modelFamily: "anthropic",
      tokenCount: 50,
    });

    // Now optimize a similar prompt
    const result = await optimizer.optimizePrompt({
      prompt: "What's the meaning of life?",
      tenantId: "test-tenant",
    });

    expect(result.cacheHit).toBe(true);
    expect(result.tokensSaved).toBeGreaterThan(0);
    expect(result.optimizedPrompt).toContain("CACHED RESPONSE");
  });

  it("should track memory stats", async () => {
    await memory.store({
      prompt: "Test prompt",
      response: "Test response",
      tenantId: "test-tenant",
      modelFamily: "anthropic",
      tokenCount: 100,
    });

    const stats = memory.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.embeddingMode).toBe("hash-fallback");
    expect(stats.embeddingProvider).toBe("none");
  });

  it("should handle multiple tenants separately", async () => {
    await memory.store({
      prompt: "Tenant A question",
      response: "Tenant A answer",
      tenantId: "tenant-a",
      modelFamily: "anthropic",
      tokenCount: 50,
    });

    await memory.store({
      prompt: "Tenant B question",
      response: "Tenant B answer",
      tenantId: "tenant-b",
      modelFamily: "openai",
      tokenCount: 50,
    });

    const resultA = await memory.query({
      prompt: "Tenant A question",
      tenantId: "tenant-a",
    });

    const resultB = await memory.query({
      prompt: "Tenant B question",
      tenantId: "tenant-b",
    });

    expect(resultA.hit).toBe(true);
    expect(resultB.hit).toBe(true);
    expect(resultA.entry?.tenantId).toBe("tenant-a");
    expect(resultB.entry?.tenantId).toBe("tenant-b");
  });

  it("should fall back to hash embeddings gracefully", async () => {
    const provider = new RealEmbeddingProvider({
      provider: "none",
      fallbackToHash: true,
    });
    await provider.initialize();

    expect(provider.isReal()).toBe(false);
    expect(provider.getStatus().mode).toBe("hash-fallback");

    const embedding = await provider.embed("test text");
    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(128);
  });
});
