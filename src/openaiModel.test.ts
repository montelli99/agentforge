import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIModelProvider } from "./providers/models/openaiModel.js";

afterEach(() => vi.unstubAllGlobals());

describe("OpenAI-compatible model adapter", () => {
  it("forwards tool/JSON options and returns tool calls from a non-streaming response", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
      id: "resp-1",
      choices: [{
        message: {
          content: null,
          tool_calls: [{ id: "call-1", type: "function", function: { name: "lookup", arguments: "{\"id\":1}" } }],
        },
        finish_reason: "tool_calls",
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIModelProvider("test-key", "https://example.test/v1");
    const result = await provider.generate({
      model: "test-model",
      messages: [{ role: "user", content: "Use the tool" }],
      tools: [{ type: "function", function: { name: "lookup" } }],
      toolChoice: "auto",
      responseFormat: "json",
      stop: ["DONE"],
    });

    expect(result.content).toBe("");
    expect(result.toolCalls?.[0]?.function.name).toBe("lookup");
    expect(result.finishReason).toBe("tool_calls");
    expect(result.usage.estimatedCostUsd).toBeUndefined();
    const sentBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(sentBody.tools).toEqual([{ type: "function", function: { name: "lookup" } }]);
    expect(sentBody.tool_choice).toBe("auto");
    expect(sentBody.response_format).toEqual({ type: "json_object" });
    expect(sentBody.stop).toEqual(["DONE"]);
  });

  it("keeps streamed tool-call IDs stable across argument deltas", async () => {
    const chunks = [
      { id: "resp-2", choices: [{ delta: { tool_calls: [{ index: 0, id: "call-2", type: "function", function: { name: "lookup", arguments: "" } }] }, finish_reason: null }] },
      { id: "resp-2", choices: [{ delta: { tool_calls: [{ index: 0, type: "function", function: { arguments: "{\"id\":2}" } }] }, finish_reason: "tool_calls" }] },
    ];
    const streamBody = chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(streamBody, { status: 200 })));

    const provider = new OpenAIModelProvider("test-key", "https://example.test/v1");
    const events = [];
    for await (const event of provider.stream({
      model: "test-model",
      messages: [{ role: "user", content: "Use the tool" }],
      tools: [{ type: "function", function: { name: "lookup" } }],
      toolChoice: "auto",
    })) events.push(event);

    expect(events).toHaveLength(2);
    expect(events[0].toolCalls?.[0]?.id).toBe("call-2");
    expect(events[0].toolCalls?.[0]?.function.name).toBe("lookup");
    expect(events[1].toolCalls?.[0]?.id).toBe("call-2");
    expect(events[1].toolCalls?.[0]?.function.arguments).toBe("{\"id\":2}");
    expect(events[1].finishReason).toBe("tool_calls");
  });

  it("does not surface a credential-shaped provider response", async () => {
    const secret = "sk-response-secret";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(`upstream echoed Bearer ${secret}`, { status: 401 })));

    const provider = new OpenAIModelProvider("test-key", "https://example.test/v1");
    await expect(provider.generate({
      model: "test-model",
      messages: [{ role: "user", content: "hello" }],
    })).rejects.toThrow("[REDACTED_SECRET]");
    await expect(provider.generate({
      model: "test-model",
      messages: [{ role: "user", content: "hello" }],
    })).rejects.not.toThrow(secret);
  });
});
