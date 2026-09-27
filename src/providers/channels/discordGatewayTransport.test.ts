import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscordGatewayTransport } from "./discordGatewayTransport.js";

class FakeSocket {
  private handlers = new Map<string, Array<(event: { data?: string }) => void>>();
  sent: string[] = [];
  addEventListener(type: string, handler: (event: { data?: string }) => void): void {
    this.handlers.set(type, [...(this.handlers.get(type) || []), handler]);
  }
  send(payload: string): void { this.sent.push(payload); }
  close(): void { for (const handler of this.handlers.get("close") || []) handler({}); }
  emit(type: string, data?: string): void { for (const handler of this.handlers.get(type) || []) handler({ data }); }
}

describe("DiscordGatewayTransport", () => {
  afterEach(() => vi.useRealTimers());
  it("rejects insecure remote gateway URLs", () => {
    expect(() => new DiscordGatewayTransport({ token: "discord-test-token", gatewayUrl: "ws://discord.example", onEvent: async () => undefined })).toThrow(/wss/);
  });

  it("reports a successful socket connection and identifies on Gateway hello", async () => {
    const socket = new FakeSocket();
    const transport = new DiscordGatewayTransport({
      token: "discord-test-token",
      websocketFactory: () => socket as unknown as WebSocket,
      onEvent: async () => undefined,
    });
    const started = transport.start();
    socket.emit("open");
    await started;
    expect(transport.isConnected()).toBe(true);
    expect(transport.isReady()).toBe(false);
    socket.emit("message", "not-json");
    expect(transport.isConnected()).toBe(true);
    socket.emit("message", JSON.stringify({ op: 10, d: { heartbeat_interval: 5_000 } }));
    expect(JSON.parse(socket.sent[0] || "{}")).toMatchObject({ op: 2, d: { token: "discord-test-token" } });
    socket.emit("message", JSON.stringify({ op: 0, t: "READY", d: { session_id: "session-1" } }));
    expect(transport.isReady()).toBe(true);
    transport.stop();
    expect(transport.isConnected()).toBe(false);
  });

  it("normalizes interaction events for the universal mirror", async () => {
    const socket = new FakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const transport = new DiscordGatewayTransport({ websocketFactory: () => socket as unknown as WebSocket, onEvent: async event => { events.push(event); } , token: "discord-test-token" });
    const started = transport.start();
    socket.emit("open");
    await started;
    socket.emit("message", JSON.stringify({ op: 10, d: { heartbeat_interval: 5_000 } }));
    socket.emit("message", JSON.stringify({ op: 0, t: "READY", d: { session_id: "session-1" } }));
    socket.emit("message", JSON.stringify({ op: 0, t: "INTERACTION_CREATE", d: { id: "i1", guild_id: "g1", channel_id: "c1", member: { user: { id: "u1", username: "sam" } }, data: { name: "status", custom_id: "approve-1" } } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(events[0]).toMatchObject({ interactionId: "i1", guildId: "g1", channelId: "c1", userId: "u1", username: "sam", command: "/status", customId: "approve-1" });
    transport.stop();
  });

  it("forwards ordinary channel messages instead of dropping them", async () => {
    const socket = new FakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const transport = new DiscordGatewayTransport({ websocketFactory: () => socket as unknown as WebSocket, onEvent: async event => { events.push(event); }, token: "discord-test-token" });
    const started = transport.start();
    socket.emit("open");
    await started;
    socket.emit("message", JSON.stringify({ op: 10, d: { heartbeat_interval: 5_000 } }));
    socket.emit("message", JSON.stringify({ op: 0, t: "READY", d: { session_id: "session-1" } }));
    socket.emit("message", JSON.stringify({ op: 0, t: "MESSAGE_CREATE", d: { id: "m1", guild_id: "g1", channel_id: "c1", content: "hello", author: { id: "u1", username: "sam" } } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(events[0]).toMatchObject({ eventType: "message", messageId: "m1", text: "hello", channelId: "c1" });
    transport.stop();
  });

  it("refuses outbound and inbound work until Discord confirms the session", async () => {
    const socket = new FakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const transport = new DiscordGatewayTransport({ websocketFactory: () => socket as unknown as WebSocket, onEvent: async event => { events.push(event); }, token: "discord-test-token" });
    const started = transport.start();
    socket.emit("open");
    await started;
    await expect(transport.sendMessage("c1", "not yet")).rejects.toThrow("not ready");
    socket.emit("message", JSON.stringify({ op: 0, t: "MESSAGE_CREATE", d: { id: "m-before", channel_id: "c1", author: { id: "u1" } } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(events).toEqual([]);
    transport.stop();
  });

  it("uses the gateway sequence for heartbeats and waits for acknowledgement", async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    const transport = new DiscordGatewayTransport({ websocketFactory: () => socket as unknown as WebSocket, onEvent: async () => undefined, token: "discord-test-token" });
    const started = transport.start();
    socket.emit("open");
    await started;
    socket.emit("message", JSON.stringify({ op: 10, d: { heartbeat_interval: 5_000 } }));
    socket.emit("message", JSON.stringify({ op: 0, t: "MESSAGE_CREATE", s: 42, d: { id: "m1" } }));
    socket.emit("message", JSON.stringify({ op: 11, d: null }));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(JSON.parse(socket.sent.at(-1) || "{}")).toMatchObject({ op: 1, d: 42 });
    const frameCount = socket.sent.length;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(socket.sent).toHaveLength(frameCount);
    socket.emit("message", JSON.stringify({ op: 11, d: null }));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(socket.sent).toHaveLength(frameCount + 1);
    transport.stop();
  });

  it("resumes an authorized session after an unexpected disconnect", async () => {
    vi.useFakeTimers();
    const first = new FakeSocket();
    const second = new FakeSocket();
    let count = 0;
    const urls: string[] = [];
    const transport = new DiscordGatewayTransport({
      token: "discord-test-token",
      reconnectBaseDelayMs: 0,
      websocketFactory: url => { urls.push(url); return (count++ === 0 ? first : second) as unknown as WebSocket; },
      onEvent: async () => undefined,
    });
    const started = transport.start();
    first.emit("open");
    await started;
    first.emit("message", JSON.stringify({ op: 10, d: { heartbeat_interval: 5_000 } }));
    first.emit("message", JSON.stringify({ op: 0, t: "READY", s: 8, d: { session_id: "session-1", resume_gateway_url: "wss://resume.discord.test/?v=10&encoding=json" } }));
    first.close();
    await vi.advanceTimersByTimeAsync(0);
    second.emit("open");
    await Promise.resolve();
    second.emit("message", JSON.stringify({ op: 10, d: { heartbeat_interval: 5_000 } }));
    expect(urls[1]).toContain("resume.discord.test");
    expect(JSON.parse(second.sent[0] || "{}")).toMatchObject({ op: 6, d: { token: "discord-test-token", session_id: "session-1", seq: 8 } });
    transport.stop();
  });
});
