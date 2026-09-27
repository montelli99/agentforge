import { describe, expect, it } from "vitest";
import { SlackSocketModeTransport } from "./slackSocketModeTransport.js";

class FakeSocket {
  private handlers = new Map<string, Array<(event: { data?: string }) => void>>();
  sent: string[] = [];
  addEventListener(type: string, handler: (event: { data?: string }) => void): void { this.handlers.set(type, [...(this.handlers.get(type) || []), handler]); }
  send(payload: string): void { this.sent.push(payload); }
  close(): void { for (const handler of this.handlers.get("close") || []) handler({}); }
  emit(type: string, data?: string): void { for (const handler of this.handlers.get(type) || []) handler({ data }); }
}

describe("SlackSocketModeTransport", () => {
  it("does not process or send before the Socket Mode hello handshake", async () => {
    const socket = new FakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const transport = new SlackSocketModeTransport({
      appToken: "xapp-test", botToken: "xoxb-test", websocketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async () => new Response(JSON.stringify({ ok: true, url: "wss://slack.test/socket", ts: "2.3" }), { status: 200 }),
      onEvent: async event => { events.push(event); },
    });
    const started = transport.start();
    await new Promise(resolve => setTimeout(resolve, 0));
    socket.emit("open");
    await started;

    socket.emit("message", JSON.stringify({ type: "events_api", envelope_id: "pre-hello", payload: { team_id: "team-1", event: { type: "message", channel: "chan-1", user: "user-1", text: "must not run" } } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(JSON.parse(socket.sent[0] || "{}")).toEqual({ envelope_id: "pre-hello" });
    expect(events).toEqual([]);
    await expect(transport.sendMessage("chan-1", "must not send")).rejects.toThrow("not ready");
    transport.stop();
  });

  it("opens Socket Mode, acknowledges events, and normalizes messages", async () => {
    const socket = new FakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const requests: Array<{ url: string; body?: string }> = [];
    const transport = new SlackSocketModeTransport({
      appToken: "xapp-test", botToken: "xoxb-test", websocketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async (input, init) => { requests.push({ url: String(input), body: init?.body as string | undefined }); return new Response(JSON.stringify({ ok: true, url: "wss://slack.test/socket", ts: "2.3" }), { status: 200 }); },
      onEvent: async event => { events.push(event); },
    });
    const started = transport.start();
    await new Promise(resolve => setTimeout(resolve, 0));
    socket.emit("open");
    await started;
    expect(transport.isConnected()).toBe(false);
    socket.emit("message", JSON.stringify({ type: "hello" }));
    expect(transport.isConnected()).toBe(true);
    socket.emit("message", JSON.stringify({ type: "events_api", envelope_id: "env-1", payload: { team_id: "team-1", event: { type: "message", channel: "chan-1", user: "user-1", text: "hello", ts: "1.2" } } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(JSON.parse(socket.sent[0] || "{}")).toEqual({ envelope_id: "env-1" });
    expect(events[0]).toMatchObject({ eventId: "env-1", teamId: "team-1", channelId: "chan-1", userId: "user-1", text: "hello" });
    await expect(transport.sendMessage("chan-1", "reply", "1.2")).resolves.toBe("2.3");
    expect(requests.at(-1)).toMatchObject({ url: "https://slack.com/api/chat.postMessage", body: JSON.stringify({ channel: "chan-1", text: "reply", thread_ts: "1.2" }) });
    transport.stop();
  });

  it("reopens a fresh Socket Mode URL after an unexpected close", async () => {
    const first = new FakeSocket();
    const second = new FakeSocket();
    let socketCount = 0;
    const transport = new SlackSocketModeTransport({
      appToken: "xapp-test", botToken: "xoxb-test", reconnectBaseDelayMs: 0,
      websocketFactory: () => (socketCount++ === 0 ? first : second) as unknown as WebSocket,
      fetchImpl: async () => new Response(JSON.stringify({ ok: true, url: "wss://slack.test/socket" }), { status: 200 }),
      onEvent: async () => undefined,
    });
    const started = transport.start();
    await new Promise(resolve => setTimeout(resolve, 0));
    first.emit("open");
    await started;
    first.emit("message", JSON.stringify({ type: "hello" }));
    first.close();
    await new Promise(resolve => setTimeout(resolve, 0));
    second.emit("open");
    await new Promise(resolve => setTimeout(resolve, 0));
    second.emit("message", JSON.stringify({ type: "hello" }));
    await Promise.resolve();
    expect(transport.isConnected()).toBe(true);
    transport.stop();
  });
});
