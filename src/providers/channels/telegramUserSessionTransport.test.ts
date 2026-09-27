import { describe, expect, it } from "vitest";
import { TelegramUserSessionTransport, type TelegramUserSessionUpdate } from "./telegramUserSessionTransport.js";

describe("TelegramUserSessionTransport", () => {
  it("owns lifecycle and forwards a native user-session update", async () => {
    let connected = false;
    let listener: ((update: TelegramUserSessionUpdate) => Promise<void>) | undefined;
    const client = {
      async connect() { connected = true; },
      async disconnect() { connected = false; },
      async sendMessage() { return "message-1"; },
      onUpdate(handler: (update: TelegramUserSessionUpdate) => Promise<void>) {
        listener = handler;
        return () => { listener = undefined; };
      },
      isConnected() { return connected; },
    };
    const transport = new TelegramUserSessionTransport(client);
    const seen: TelegramUserSessionUpdate[] = [];
    transport.bind(async update => { seen.push(update); });
    await transport.start();
    expect(transport.isRunning()).toBe(true);
    await listener?.({ updateId: 1, chatId: "chat-1", userId: "user-1", text: "hello" });
    expect(seen).toHaveLength(1);
    expect(await transport.sendMessage("chat-1", "reply")).toBe("message-1");
    await transport.stop();
    expect(transport.isRunning()).toBe(false);
  });

  it("does not allow sends before connection", async () => {
    const transport = new TelegramUserSessionTransport({
      async connect() {}, async disconnect() {}, async sendMessage() { return 1; },
      onUpdate() { return () => undefined; },
    });
    expect(() => transport.sendMessage("chat", "text")).toThrow(/not connected/i);
  });
});
