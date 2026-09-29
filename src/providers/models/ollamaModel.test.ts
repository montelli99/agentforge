import { describe, expect, it, vi } from "vitest";
import { OllamaModelProvider } from "./ollamaModel.js";

describe("OllamaModelProvider", () => {
  it("uses Ollama's native chat response and preserves usage counts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "phi3.5:latest",
      message: { role: "assistant", content: '{"requiredFact":"ok"}' },
      done: true,
      done_reason: "stop",
      prompt_eval_count: 12,
      eval_count: 7,
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await new OllamaModelProvider("http://ollama.test").generate({
      model: "phi3.5:latest",
      messages: [{ role: "user", content: "Return JSON" }],
      temperature: 0,
      maxTokens: 32,
      responseFormat: "json",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://ollama.test/api/chat", expect.objectContaining({ method: "POST" }));
    expect(result.content).toContain("requiredFact");
    expect(result.usage.totalTokens).toBe(19);
    vi.unstubAllGlobals();
  });
});
