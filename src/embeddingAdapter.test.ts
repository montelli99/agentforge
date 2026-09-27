import { afterEach, describe, expect, it, vi } from "vitest";
import { RealEmbeddingProvider } from "./embeddingAdapter.js";

describe("RealEmbeddingProvider", () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  });

  it("redacts credential-shaped provider errors from status and diagnostics", async () => {
    const secret = "sk-private-embedding-token";
    globalThis.fetch = vi.fn(async () => { throw new Error(`provider rejected Bearer ${secret}`); }) as typeof fetch;
    const logged: string[] = [];
    console.log = (value: unknown) => logged.push(String(value));

    const provider = new RealEmbeddingProvider({
      provider: "ollama",
      baseUrl: "http://127.0.0.1:11434",
      model: "nomic-embed-text",
      fallbackToHash: true,
    });

    await provider.initialize();

    expect(provider.getStatus().error).not.toContain(secret);
    expect(provider.getStatus().error).toContain("[REDACTED_SECRET]");
    expect(logged.join("\n")).not.toContain(secret);
  });
});
