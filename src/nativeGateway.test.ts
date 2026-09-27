import { describe, expect, it } from "vitest";
import { ChannelRuntimeRegistry } from "./channelRuntimeRegistry.js";
import { TelegramMirrorProvider } from "./providers/channels/telegramMirror.js";
import { NativeAgentForgeGateway } from "./nativeGateway.js";

describe("NativeAgentForgeGateway", () => {
  it("owns channel runtime lifecycle without an external gateway", async () => {
    const gateway = new NativeAgentForgeGateway();
    const snapshot = await gateway.start();
    expect(snapshot.nativeOwnership).toBe(true);
    expect(snapshot.state).toBe("degraded");
    expect(snapshot.channels).toHaveLength(3);
    await gateway.stop();
    expect(gateway.snapshot().state).toBe("stopped");
  });

  it("dispatches inbound provider events and routes outbound messages through the native registry", async () => {
    const telegram = new TelegramMirrorProvider();
    const gateway = new NativeAgentForgeGateway(new ChannelRuntimeRegistry({ telegram }));
    const received: string[] = [];
    gateway.onInbound(async event => { received.push(event.payload.text ?? ""); });
    telegram.bindTopic("chat-1", 7, "channel-1", "General");
    await gateway.start(["telegram"]);
    await telegram.ingestInboundUpdate({ updateId: 1, chatId: "chat-1", topicId: 7, userId: "user-1", text: "hello" });
    expect(received).toEqual(["hello"]);
    const sent = await gateway.send("telegram", { canonicalChannelId: "channel-1", text: "reply" });
    expect(sent.externalMessageId).toMatch(/^tg-msg-/);
    await gateway.stop(["telegram"]);
  });
});
