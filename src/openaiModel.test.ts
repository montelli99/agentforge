import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIModelProvider, reportedChatCompletionUsage } from "./providers/models/openaiModel.js";

afterEach(() => vi.unstubAllGlobals());

describe("OpenAI-compatible model adapter", () => {
  it("forwards tool/JSON options and returns tool calls from a non-streaming response", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
      id: "resp-1",
      model: "test-model-2026-09-30",
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
    const options = {
      model: "test-model",
      messages: [{ role: "user" as const, content: "Use the tool" }],
      tools: [{ type: "function", function: { name: "lookup" } }],
      toolChoice: "auto",
      responseFormat: "json" as const,
      stop: ["DONE"],
    };
    const result = await provider.generate(options);

    expect(result.content).toBe("");
    expect(result.toolCalls?.[0]?.function.name).toBe("lookup");
    expect(result.finishReason).toBe("tool_calls");
    expect(result.model).toBe("test-model");
    expect(result.reportedModel).toBe("test-model-2026-09-30");
    expect(result.usage?.estimatedCostUsd).toBeUndefined();
    const sentBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(provider.auditGenerateBody(options));
    expect(sentBody.tools).toEqual([{ type: "function", function: { name: "lookup" } }]);
    expect(sentBody.tool_choice).toBe("auto");
    expect(sentBody.response_format).toEqual({ type: "json_object" });
    expect(sentBody.stop).toEqual(["DONE"]);
  });

  it.each([
    undefined,
    { prompt_tokens: 2, completion_tokens: 1 },
    { prompt_tokens: -1, completion_tokens: 1, total_tokens: 0 },
    { prompt_tokens: 1.5, completion_tokens: 1, total_tokens: 2.5 },
    { prompt_tokens: 2, completion_tokens: 1, total_tokens: 99 },
  ])("keeps missing or invalid completion usage unknown", usage => {
    expect(reportedChatCompletionUsage(usage)).toBeUndefined();
  });

  it("preserves an explicitly reported zero without inferring it", () => {
    expect(reportedChatCompletionUsage({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }))
      .toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  });

  it("accepts reported totals with a null optional breakdown without inventing cache usage", () => {
    expect(reportedChatCompletionUsage({prompt_tokens:761,completion_tokens:196,total_tokens:957,
      prompt_tokens_details:null,completion_tokens_details:{reasoning_tokens:33}})).toEqual({
        promptTokens:761,completionTokens:196,totalTokens:957,
      });
    for (const details of [false, 0, "", [], "invalid"]) {
      expect(reportedChatCompletionUsage({prompt_tokens:761,completion_tokens:196,total_tokens:957,
        prompt_tokens_details:details})).toBeUndefined();
    }
  });

  it("preserves cache categories as subsets of reported prompt tokens", () => {
    expect(reportedChatCompletionUsage({prompt_tokens:100,completion_tokens:20,total_tokens:120,
      prompt_tokens_details:{cached_tokens:40,cache_write_tokens:10}})).toEqual({
        promptTokens:100,completionTokens:20,totalTokens:120,cachedInputTokens:40,cacheWriteInputTokens:10,
      });
    expect(reportedChatCompletionUsage({prompt_tokens:100,completion_tokens:20,total_tokens:120,
      prompt_tokens_details:{cached_tokens:90,cache_write_tokens:20}})).toBeUndefined();
  });

  it("does not turn omitted HTTP usage into zero-cost accounting", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      id: "resp-no-usage", choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
    }), { status: 200 })));
    const result = await new OpenAIModelProvider("test-key", "https://example.test/v1").generate({
      model: "test-model", messages: [{ role: "user", content: "test" }],
    });
    expect(result.usage).toBeUndefined();
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

  it.each([401,403,500])("does not surface a credential-shaped provider response for HTTP %s", async status => {
    const secret = "sk-response-secret";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(`upstream echoed Bearer ${secret}`, { status })));

    const provider = new OpenAIModelProvider("test-key", "https://example.test/v1");
    await expect(provider.generate({
      model: "test-model",
      messages: [{ role: "user", content: "hello" }],
    })).rejects.toThrow(status===500?"[REDACTED_SECRET]":"Reconnect the provider");
    await expect(provider.generate({
      model: "test-model",
      messages: [{ role: "user", content: "hello" }],
    })).rejects.not.toThrow(secret);
  });
});
