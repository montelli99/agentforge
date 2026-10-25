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
      thinking: "disabled",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://ollama.test/api/chat", expect.objectContaining({ method: "POST" }));
    const payload = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(payload).toMatchObject({ format: "json", options: { temperature: 0, num_predict: 32 }, think: false, stream: false });
    expect(payload).not.toHaveProperty("temperature");
    expect(result.content).toContain("requiredFact");
    expect(result.usage?.totalTokens).toBe(19);
    expect(result.reportedModel).toBe("phi3.5:latest");
    vi.unstubAllGlobals();
  });
  it("applies the same generation controls to streaming requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"message":{"content":"ok"},"done":true}\n', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const chunks = [];
      for await (const chunk of new OllamaModelProvider("http://ollama.test").stream({
        model: "phi3.5:latest", messages: [{ role: "user", content: "test" }],
        temperature: 0, maxTokens: 32, thinking: "disabled",
      })) chunks.push(chunk);
      expect(chunks).toHaveLength(1);
      const payload = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
      expect(payload).toMatchObject({ options: { temperature: 0, num_predict: 32 }, think: false, stream: true });
      expect(payload).not.toHaveProperty("temperature");
    } finally { vi.unstubAllGlobals(); }
  });
  it.each([
    {},
    { prompt_eval_count: 4 },
    { prompt_eval_count: -1, eval_count: 2 },
    { prompt_eval_count: 1.5, eval_count: 2 },
  ])("leaves missing or invalid provider usage unknown", async counts => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { content: "ok" }, done: true, ...counts,
    }), { status: 200 })));
    try {
      const result = await new OllamaModelProvider("http://ollama.test").generate({
        model: "phi3.5:latest", messages: [{ role: "user", content: "test" }],
      });
      expect(result.usage).toBeUndefined();
    } finally { vi.unstubAllGlobals(); }
  });
});
