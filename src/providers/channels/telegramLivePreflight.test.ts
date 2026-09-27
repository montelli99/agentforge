import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramMirrorProvider } from "./telegramMirror.js";

describe("Telegram live preflight", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads webhook state without changing Telegram ownership", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      result: { url: "", pending_update_count: 0 },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const state = await new TelegramMirrorProvider().inspectWebhookState("123456:abcdefghijklmnopqrstuvwxyz");
    expect(state.url).toBe("");
    expect(state.pendingUpdateCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123456:abcdefghijklmnopqrstuvwxyz/getWebhookInfo",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects malformed tokens before making a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(new TelegramMirrorProvider().inspectWebhookState("not-a-token")).rejects.toThrow("format is invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
