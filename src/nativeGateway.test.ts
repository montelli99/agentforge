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

  it("reports only started providers in aggregate readiness", async () => {
    const telegram = new TelegramMirrorProvider();
    telegram.attachLiveTransport({
      start: async () => {}, stop: () => {}, isRunning: () => true,
      sendMessage: async () => 1,
    });
    const gateway = new NativeAgentForgeGateway(new ChannelRuntimeRegistry({ telegram }));
    expect((await gateway.start(["telegram"])).state).toBe("ready");
    expect(gateway.snapshot().channels.filter(channel => channel.state === "stopped")).toHaveLength(2);
    expect((await gateway.start(["discord"])).state).toBe("degraded");
    expect((await gateway.stop(["discord"])).state).toBe("ready");
    expect((await gateway.stop(["telegram"])).state).toBe("stopped");
  });
});
