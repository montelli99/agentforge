import { afterEach, describe, expect, it, vi } from "vitest";
import { MiMoModelProvider } from "./mimoModel.js";

afterEach(() => vi.unstubAllGlobals());

describe("MiMoModelProvider thinking control", () => {
  it("sends explicit disabled thinking for a bounded structured plan", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { thinking?: { type: string } };
      expect(body.thinking).toEqual({ type: "disabled" });
      return new Response(JSON.stringify({ id: "response-1", choices: [{ message: { content: "{}" }, finish_reason: "stop" }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await new MiMoModelProvider("test-key", "https://example.invalid/v1")
      .generate({ model: "mimo-v2.5-pro", messages: [], thinking: "disabled" });
    expect(response.content).toBe("{}");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("keeps the provider default unchanged when thinking is omitted", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { thinking?: unknown };
      expect(body).not.toHaveProperty("thinking");
      return new Response(JSON.stringify({ id: "response-2", choices: [{ message: { content: "ok" } }] }), { status: 200 });
    }));
    await new MiMoModelProvider("test-key", "https://example.invalid/v1")
      .generate({ model: "mimo-v2.5-pro", messages: [] });
  });
});
