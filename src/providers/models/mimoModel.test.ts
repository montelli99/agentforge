import { afterEach, describe, expect, it, vi } from "vitest";
import { MiMoModelProvider } from "./mimoModel.js";

afterEach(() => vi.unstubAllGlobals());

describe("MiMoModelProvider thinking control", () => {
  it("sends explicit disabled thinking for a bounded structured plan", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { thinking?: { type: string } };
      expect(body.thinking).toEqual({ type: "disabled" });
      expect(JSON.parse(String(init.body)).messages).toEqual([
        { role: "assistant", content: "", tool_calls: [{ id: "call-1", type: "function", function: { name: "inspect_task", arguments: "{}" } }] },
        { role: "tool", content: "{}", tool_call_id: "call-1" },
      ]);
      return new Response(JSON.stringify({ id: "response-1", model:"mimo-v2.6-pro", choices: [{ message: { content: "{}" }, finish_reason: "stop" }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await new MiMoModelProvider("test-key", "https://example.invalid/v1")
      .generate({ model: "mimo-v2.6-pro", messages: [
        { role: "assistant", content: "", toolCalls: [{ id: "call-1", type: "function", function: { name: "inspect_task", arguments: "{}" } }] },
        { role: "tool", content: "{}", toolCallId: "call-1" },
      ], thinking: "disabled" });
    expect(response.content).toBe("{}");
    expect(response.reportedModel).toBe("mimo-v2.6-pro");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("keeps the provider default unchanged when thinking is omitted", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { thinking?: unknown };
      expect(body).not.toHaveProperty("thinking");
      return new Response(JSON.stringify({ id: "response-2", choices: [{ message: { content: "ok" } }] }), { status: 200 });
    }));
    await new MiMoModelProvider("test-key", "https://example.invalid/v1")
      .generate({ model: "mimo-v2.6-pro", messages: [] });
  });
});
