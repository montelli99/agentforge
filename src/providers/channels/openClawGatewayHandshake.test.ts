import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OpenClawGatewayTransport } from "./openClawGatewayTransport.js";
class Socket extends EventTarget {
  static OPEN = 1;
  static CONNECTING = 0;
  static latest: Socket;
  readyState = 1;
  sent: any[] = [];
  constructor(_url: string) { super(); Socket.latest = this; }
  send(raw: string) { this.sent.push(JSON.parse(raw)); }
  close() { this.readyState = 3; this.dispatchEvent(new Event("close")); }
  receive(frame: unknown) { this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(frame) })); }
}
const dirs: string[] = [];
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
function setup() {
  vi.stubGlobal("WebSocket", Socket);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-handshake-")); dirs.push(dir);
  const client = new OpenClawGatewayTransport({ url: "ws://127.0.0.1:18789", identityPath: path.join(dir, "device.json") });
  client.start(); return { client, socket: Socket.latest };
}
function authenticate(socket: Socket) {
  socket.receive({ type: "event", event: "connect.challenge", payload: { nonce: "test-challenge", ts: 123456789 } });
  socket.receive({ type: "res", id: socket.sent[0].id, ok: true, payload: { type: "hello-ok", protocol: 4, auth: { role: "operator", scopes: ["operator.read", "operator.write"] } } });
}
describe("gateway authentication and interrupted delivery", () => {
  it("requires the matching challenge response before sends or inbound events", async () => {
    const { client, socket } = setup(); const inbound = vi.fn(); client.subscribe(inbound);
    expect(client.isConnected()).toBe(false); expect(client.isConnecting()).toBe(true);
    expect(socket.sent).toHaveLength(0);
    socket.receive({ type: "res", id: "unrelated", ok: true, payload: { type: "hello-ok", protocol: 4, auth: { role: "operator", scopes: ["operator.read", "operator.write"] } } });
    socket.receive({ type: "event", event: "chat", payload: { text: "untrusted", chatId: 1 } });
    expect(inbound).not.toHaveBeenCalled();
    await expect(client.sendMessage(1, "test")).rejects.toThrow(/authentication/);
    authenticate(socket); expect(client.isConnected()).toBe(true);
    const result = client.sendMessage(1, "test");
    socket.receive({ type: "res", id: socket.sent[1].id, ok: true, payload: { messageId: 42 } });
    await expect(result).resolves.toBe(42); client.stop();
  });
  it("rejects pending work on stop and ignores the old socket after restart", async () => {
    const { client, socket } = setup(); authenticate(socket);
    const result = client.sendMessage(1, "test"); const rejected = expect(result).rejects.toThrow(/uncertain/);
    client.stop(); await rejected; client.start(); const next = Socket.latest;
    socket.close(); expect(client.isConnecting()).toBe(true);
    authenticate(next); expect(client.isConnected()).toBe(true); expect(next.sent).toHaveLength(1); client.stop();
  });
  it("reports an uncertain timeout without retrying the message", async () => {
    vi.useFakeTimers(); const { client, socket } = setup(); authenticate(socket);
    const result = client.sendMessage(1, "test"); const rejected = expect(result).rejects.toThrow(/uncertain/);
    await vi.advanceTimersByTimeAsync(30_000); await rejected;
    expect(socket.sent).toHaveLength(2); client.stop();
  });
});

describe("gateway failure boundaries", () => {
  it("bounds missing challenge and failed authentication", async () => {
    vi.useFakeTimers(); const { client, socket } = setup();
    socket.receive(null); socket.receive([]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(client.isConnecting()).toBe(false); expect(socket.sent).toHaveLength(0);
    client.start(); const next = Socket.latest;
    next.receive({ type: "event", event: "connect.challenge", payload: { nonce: "test", ts: 123456789 } });
    next.receive({ type: "res", id: next.sent[0].id, ok: false });
    expect(client.isConnected()).toBe(false); expect(client.isConnecting()).toBe(false);
  });
  it("does not invent a receipt for an acknowledged send with no message ID", async () => {
    const { client, socket } = setup(); authenticate(socket);
    const sent = client.sendMessage(1, "test");
    socket.receive({ type: "res", id: socket.sent[1].id, ok: true, payload: {} });
    await expect(sent).rejects.toThrow(/no valid message receipt/); client.stop();
  });
  it("rejects pending sends on a network error and allows a fresh handshake", async () => {
    const { client, socket } = setup(); authenticate(socket);
    const sent = client.sendMessage(1, "test");
    socket.dispatchEvent(new Event("error"));
    await expect(sent).rejects.toThrow(/uncertain/);
    expect(client.isConnected()).toBe(false);
    client.start(); authenticate(Socket.latest); expect(client.isConnected()).toBe(true); client.stop();
  });
});

describe("current gateway protocol contract", () => {
  it("uses protocol 4 and the server challenge time rather than the local clock", () => {
    const { client, socket } = setup(); authenticate(socket);
    expect(socket.sent[0].params).toMatchObject({ minProtocol: 4, maxProtocol: 4, device: { signedAt: 123456789, nonce: "test-challenge" } }); client.stop();
  });
  it.each([undefined, -1, 1.5, "123"])("rejects an invalid challenge timestamp %s", ts => {
    const { client, socket } = setup();
    socket.receive({ type: "event", event: "connect.challenge", payload: { nonce: "test", ts } });
    expect(socket.sent).toHaveLength(0); expect(client.isConnecting()).toBe(false);
  });
  it("does not send under a read-only grant", async () => {
    const { client, socket } = setup();
    socket.receive({ type: "event", event: "connect.challenge", payload: { nonce: "test", ts: 123 } });
    socket.receive({ type: "res", id: socket.sent[0].id, ok: true, payload: { type: "hello-ok", protocol: 4, auth: { role: "operator", scopes: ["operator.read"] } } });
    expect(client.isConnected()).toBe(true);
    await expect(client.sendMessage(1, "test")).rejects.toThrow(/write permission/);
    expect(socket.sent).toHaveLength(1); client.stop();
  });
});
