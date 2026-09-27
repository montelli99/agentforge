import { describe, expect, it, vi } from "vitest";
import { TelegramGatewayRelay } from "./telegramGatewayRelay.js";
import { TelegramMirrorProvider } from "./telegramMirror.js";

describe("TelegramGatewayRelay", () => {
  it("consumes gateway-owned updates without starting a second poller", async () => {
    type Update = { update_id: number; message: { message_id: number; chat: { id: number }; from: { id: number; username: string }; text: string } };
    let handler: ((update: Update) => Promise<void>) | undefined;
    const unsubscribe = vi.fn(() => { handler = undefined; });
    const bridge = {
      subscribe: vi.fn((next: (update: Update) => Promise<void>) => { handler = next; return unsubscribe; }),
      sendMessage: vi.fn(async () => 42),
    };
    const mirror = new TelegramMirrorProvider();
    const event = vi.fn(async () => {});
    mirror.onEvent(event);
    const relay = new TelegramGatewayRelay(mirror, bridge);
    relay.start();
    relay.start();
    await handler?.({ update_id: 7, message: { message_id: 8, chat: { id: 9 }, from: { id: 10, username: "owner" }, text: "hello" } });
    expect(bridge.subscribe).toHaveBeenCalledTimes(1);
    expect(event).toHaveBeenCalledWith(expect.objectContaining({ eventType: "message", externalWorkspaceId: "9" }));
    relay.stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("refuses to start when the gateway is explicitly disconnected", () => {
    const bridge = { isConnected: () => false, subscribe: vi.fn(), sendMessage: vi.fn() };
    const relay = new TelegramGatewayRelay(new TelegramMirrorProvider(), bridge);
    expect(relay.status()).toBe("disconnected");
    expect(() => relay.start()).toThrow(/gateway is disconnected/i);
    expect(bridge.subscribe).not.toHaveBeenCalled();
  });
});
