import type { EmbeddingProvider, Embedding } from "./semanticMemory.js";

export type RealEmbeddingProviderConfig = {
  provider: "openai" | "voyage" | "gemini" | "local" | "ollama" | "auto" | "none";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fallbackToHash: boolean;
};

export type EmbeddingProviderStatus = {
  active: boolean;
  provider: string;
  model: string;
  mode: "real" | "hash-fallback";
  dimension: number;
  error?: string;
};

type OpenClawEmbeddingProvider = {
  id: string;
  model: string;
  maxInputTokens?: number;
  embedQuery: (text: string) => Promise<number[]>;
  embedBatch: (texts: string[]) => Promise<number[][]>;
};

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
}

function createHashEmbedding(text: string, dimension: number = 128): Embedding {
  const hash = hashText(text);
  const embedding: Embedding = [];

  for (let i = 0; i < dimension; i++) {
    const charCode = hash.charCodeAt(i % hash.length);
    embedding.push((charCode / 255) * 2 - 1);
  }

  const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

async function callOllamaEmbeddings(
  baseUrl: string,
  model: string,
  input: string | string[],
): Promise<number[][]> {
  const prompts = Array.isArray(input) ? input : [input];
  const results: number[][] = [];
  for (const prompt of prompts) {
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama embeddings ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { embedding: number[] };
    results.push(json.embedding);
  }
  return results;
}

export class RealEmbeddingProvider implements EmbeddingProvider {
  private provider: OpenClawEmbeddingProvider | null = null;
  private status: EmbeddingProviderStatus;
  private fallbackToHash: boolean;
  dimension: number = 128;
  private ollamaBaseUrl: string | null = null;
  private ollamaModel: string | null = null;

  constructor(config: RealEmbeddingProviderConfig) {
    this.fallbackToHash = config.fallbackToHash;
    this.ollamaBaseUrl = config.baseUrl || null;
    this.status = {
      active: false,
      provider: config.provider,
      model: config.model || "unknown",
      mode: "hash-fallback",
      dimension: this.dimension,
    };
  }

  async initialize(): Promise<void> {
    if (this.status.provider === "ollama") {
      await this.initializeOllama();
      return;
    }
    if (this.status.provider === "openai" && process.env.OPENAI_API_KEY) {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        const model = this.status.model || "text-embedding-3-small";
        const res = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, input: "probe" }),
        });
        if (res.ok) {
          const json = await res.json() as { data: Array<{ embedding: number[] }> };
          if (json.data?.[0]?.embedding) {
            this.status.active = true;
            this.status.mode = "real";
            this.status.provider = "openai";
            this.status.model = model;
            this.status.dimension = json.data[0].embedding.length;
            this.dimension = this.status.dimension;
            this.provider = {
              id: "openai",
              model,
              embedQuery: async (text: string) => {
                const queryRes = await fetch("https://api.openai.com/v1/embeddings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                  body: JSON.stringify({ model, input: text }),
                });
                const qJson = await queryRes.json() as { data: Array<{ embedding: number[] }> };
                return qJson.data[0].embedding;
              },
              embedBatch: async (texts: string[]) => {
                const batchRes = await fetch("https://api.openai.com/v1/embeddings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                  body: JSON.stringify({ model, input: texts }),
                });
                const bJson = await batchRes.json() as { data: Array<{ embedding: number[] }> };
                return bJson.data.map((item) => item.embedding);
              },
            };
            console.log(`[AgentForge] Native OpenAI embedding provider active: openai/${model}`);
            return;
          }
        }
      } catch (err) {
        console.log(`[AgentForge] OpenAI embedding probe failed: ${err}`);
      }
    }
    // Clean fallback to hash embeddings without external dependencies
    console.log(`[AgentForge] Standalone embedding mode active (hash-fallback)`);
  }

  private async initializeOllama(): Promise<void> {
    const baseUrl = this.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const model = this.status.model || process.env.AGENTFORGE_EMBEDDING_MODEL || "nomic-embed-text";
    try {
      const probe = await fetch(`${baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: "probe" }),
      });
      if (!probe.ok) {
        const text = await probe.text().catch(() => "");
        throw new Error(`probe failed: ${probe.status} ${text.slice(0, 100)}`);
      }
      const probeJson = (await probe.json()) as { embedding: number[] };
      this.ollamaBaseUrl = baseUrl;
      this.ollamaModel = model;
      this.status.active = true;
      this.status.mode = "real";
      this.status.provider = "ollama";
      this.status.model = model;
      this.status.dimension = probeJson.embedding.length;
      this.dimension = this.status.dimension;
      console.log(`[AgentForge] Real embedding provider active: ollama/${model} (dim=${this.status.dimension})`);
    } catch (error) {
      this.status.error = String(error);
      console.log(`[AgentForge] Ollama embedding init failed: ${error}`);
    }
  }

  async embed(text: string): Promise<Embedding> {
    if (this.ollamaBaseUrl && this.ollamaModel) {
      try {
        const results = await callOllamaEmbeddings(this.ollamaBaseUrl, this.ollamaModel, text);
        return results[0];
      } catch (error) {
        console.warn(`[AgentForge] Ollama embedding failed, falling back to hash: ${error}`);
      }
    }
    if (this.provider) {
      try {
        const embedding = await this.provider.embedQuery(text);
        return embedding;
      } catch (error) {
        console.warn(`[AgentForge] Real embedding failed, falling back to hash: ${error}`);
      }
    }

    if (this.fallbackToHash) {
      return createHashEmbedding(text, this.dimension);
    }

    throw new Error("No embedding provider available and hash fallback disabled");
  }

  async embedBatch(texts: string[]): Promise<Embedding[]> {
    if (this.ollamaBaseUrl && this.ollamaModel) {
      try {
        return await callOllamaEmbeddings(this.ollamaBaseUrl, this.ollamaModel, texts);
      } catch (error) {
        console.warn(`[AgentForge] Ollama batch embedding failed, falling back to hash: ${error}`);
      }
    }
    if (this.provider) {
      try {
        const embeddings = await this.provider.embedBatch(texts);
        return embeddings;
      } catch (error) {
        console.warn(`[AgentForge] Real batch embedding failed, falling back to hash: ${error}`);
      }
    }

    if (this.fallbackToHash) {
      return texts.map((text) => createHashEmbedding(text, this.dimension));
    }

    throw new Error("No embedding provider available and hash fallback disabled");
  }

  getStatus(): EmbeddingProviderStatus {
    return { ...this.status };
  }

  getDimension(): number {
    return this.dimension;
  }

  isReal(): boolean {
    return this.status.mode === "real";
  }
}

let globalProvider: RealEmbeddingProvider | null = null;

export async function getRealEmbeddingProvider(
  config?: RealEmbeddingProviderConfig,
): Promise<RealEmbeddingProvider> {
  if (!globalProvider) {
    globalProvider = new RealEmbeddingProvider(
      config || {
        provider: (process.env.AGENTFORGE_EMBEDDING_PROVIDER as any) || "ollama",
        baseUrl: process.env.AGENTFORGE_EMBEDDING_BASE_URL || process.env.OLLAMA_BASE_URL,
        model: process.env.AGENTFORGE_EMBEDDING_MODEL || "nomic-embed-text",
        fallbackToHash: true,
      },
    );
    await globalProvider.initialize();
  }
  return globalProvider;
}

export function resetRealEmbeddingProvider(): void {
  globalProvider = null;
}
