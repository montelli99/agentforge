import { describe, expect, it } from "vitest";
import { ChannelRuntimeRegistry } from "./channelRuntimeRegistry.js";
import { TelegramMirrorProvider } from "./providers/channels/telegramMirror.js";
import type { ChannelProvider } from "./core/providers/channel.js";

describe("channel runtime registry", () => {
  it("starts the public adapters without requiring credentials", async () => {
    const registry = new ChannelRuntimeRegistry();
    for (const provider of ["telegram", "discord", "slack"] as const) {
      expect((await registry.start(provider)).state).toBe("starting");
    }
    expect(registry.list().every(status => status.state === "starting")).toBe(true);
    expect(registry.list().every(status => status.readiness.status === "sandbox")).toBe(true);
    expect(registry.list().every(status => status.readiness.missing.length > 0)).toBe(true);
  });

  it("stops an adapter and exposes its provider contract", async () => {
    const registry = new ChannelRuntimeRegistry();
    await registry.start("slack");
    expect(registry.get("slack").id).toBe("slack_mirror");
    expect((await registry.stop("slack")).state).toBe("stopped");
  });

  it("uses an injected provider instance for live transport ownership", () => {
    const telegram = new TelegramMirrorProvider();
    const registry = new ChannelRuntimeRegistry({ telegram });
    expect(registry.get("telegram")).toBe(telegram);
  });

  it("refreshes a ready provider to error when its live transport disconnects", async () => {
    let connected = true;
    const telegram = new TelegramMirrorProvider();
    telegram.attachLiveTransport({
      async start() {},
      stop() {},
      isRunning: () => connected,
      isHealthy: () => connected,
      async sendMessage() { return 1; },
    });
    const registry = new ChannelRuntimeRegistry({ telegram });
    expect((await registry.start("telegram")).state).toBe("ready");
    connected = false;
    expect(registry.list()[0]).toMatchObject({ state: "error", readiness: { status: "sandbox" }, lastError: "Channel transport is not connected." });
  });

  it("redacts credentials from a failed provider status", async () => {
    const telegram: ChannelProvider = {
      id: "test", type: "telegram", async initialize() { throw new Error("upstream rejected Bearer sk-failurefixture123456789"); },
      async shutdown() {}, async sendMessage() { return { externalMessageId: "unused" }; }, onEvent() {},
    };
    const status = await new ChannelRuntimeRegistry({ telegram }).start("telegram");
    expect(status.lastError).toBe("upstream rejected Bearer [REDACTED_SECRET]");
  });
});
