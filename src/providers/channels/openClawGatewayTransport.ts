import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { TelegramBotUpdate } from "./telegramBotApiTransport.js";
import type { TelegramGatewayBridge } from "./telegramGatewayRelay.js";

type GatewayEvent = { type: "event"; event: string; payload?: unknown; seq?: number };
type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

function b64url(value: Buffer): string {
  return value.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

type DeviceIdentity = { deviceId: string; publicKeyPem: string; privateKeyPem: string };
function identity(filePath: string): DeviceIdentity {
  try {
    const saved = JSON.parse(fs.readFileSync(filePath, "utf8")) as { deviceId?: string; publicKeyPem?: string; privateKeyPem?: string };
    if (saved.deviceId && saved.publicKeyPem && saved.privateKeyPem) return { deviceId: saved.deviceId, publicKeyPem: saved.publicKeyPem, privateKeyPem: saved.privateKeyPem };
  } catch { /* create below */ }
  const pair = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const raw = (pair.publicKey.export({ type: "spki", format: "der" }) as Buffer).subarray(-32);
  const created = { deviceId: crypto.createHash("sha256").update(raw).digest("hex"), publicKeyPem, privateKeyPem };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(created, null, 2)}\n`, { mode: 0o600 });
  return created;
}

/** OpenClaw/Hermes-style gateway client. It never polls Telegram and never owns a Telegram token. */
export class OpenClawGatewayTransport implements TelegramGatewayBridge {
  private socket?: WebSocket;
  private connected = false;
  private nonce?: string;
  private seq = 0;
  private readonly pending = new Map<string, Pending>();
  private readonly subscribers = new Set<(update: TelegramBotUpdate) => Promise<void>>();
  private readonly device;

  constructor(private readonly options: { url: string; token?: string; identityPath: string }) {
    const parsed = new URL(options.url);
    if (parsed.protocol !== "wss:" && !(parsed.protocol === "ws:" && ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname))) {
      throw new Error("Gateway URL must use wss://, or ws:// on loopback only.");
    }
    this.device = identity(options.identityPath);
  }

  // Report a connecting socket as available so the relay can subscribe before
  // the gateway handshake completes; a disconnected socket is false.
  isConnected(): boolean { return Boolean(this.socket) && (this.connected || this.socket?.readyState === WebSocket.CONNECTING); }

  start(): void {
    if (this.socket) return;
    const socket = new WebSocket(this.options.url);
    this.socket = socket;
    socket.addEventListener("open", () => this.sendConnect());
    socket.addEventListener("message", event => this.handle(String(event.data)));
    socket.addEventListener("close", () => {
      this.connected = false;
      this.socket = undefined;
      for (const pending of this.pending.values()) pending.reject(new Error("gateway disconnected"));
      this.pending.clear();
    });
  }

  stop(): void { this.socket?.close(); this.socket = undefined; this.connected = false; }

  subscribe(handler: (update: TelegramBotUpdate) => Promise<void>): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  async sendMessage(chatId: string | number, text: string, topicId?: number): Promise<number> {
    const result = await this.request<Record<string, unknown>>("send", {
      channel: "telegram", target: String(chatId), message: text,
      ...(topicId ? { threadId: topicId } : {}),
    });
    const id = result.messageId ?? result.id;
    return typeof id === "number" ? id : Number(id ?? Date.now());
  }

  private sendConnect() {
    const scopes = ["operator.read", "operator.write"];
    const signedAt = Date.now();
    const payload = ["v2", this.device.deviceId, "gateway-client", "backend", "operator", scopes.join(","), String(signedAt), this.options.token ?? "", this.nonce ?? ""].join("|");
    const publicRaw = (crypto.createPublicKey(this.device.publicKeyPem).export({ type: "spki", format: "der" }) as Buffer).subarray(-32);
    const signature = b64url(crypto.sign(null, Buffer.from(payload), crypto.createPrivateKey(this.device.privateKeyPem)));
    this.send({ type: "req", id: crypto.randomUUID(), method: "connect", params: {
      minProtocol: 3, maxProtocol: 3,
      client: { id: "gateway-client", version: "agentforge", platform: process.platform, mode: "backend" },
      caps: [], role: "operator", scopes, auth: this.options.token ? { token: this.options.token } : undefined,
      device: { id: this.device.deviceId, publicKey: b64url(publicRaw), signature, signedAt, ...(this.nonce ? { nonce: this.nonce } : {}) },
    }});
  }

  private handle(raw: string) {
    let frame: Record<string, unknown>;
    try { frame = JSON.parse(raw) as Record<string, unknown>; } catch { return; }
    if (frame.type === "event") {
      const event = frame as unknown as GatewayEvent;
      if (event.event === "connect.challenge") {
        const nonce = (event.payload as { nonce?: unknown } | undefined)?.nonce;
        if (typeof nonce === "string") { this.nonce = nonce; this.sendConnect(); }
      } else if (event.event === "chat") this.emitChat(event.payload);
      return;
    }
    if (frame.type === "res" && typeof frame.id === "string") {
      const waiter = this.pending.get(frame.id); if (!waiter) return;
      this.pending.delete(frame.id);
      if (frame.ok === true) waiter.resolve(frame.payload); else waiter.reject(new Error(String((frame.error as { message?: unknown } | undefined)?.message ?? "gateway request failed")));
      const payload = frame.payload as { type?: string } | undefined;
      if (payload?.type === "hello-ok") this.connected = true;
    }
  }

  private emitChat(payload: unknown) {
    const value = payload as Record<string, unknown> | undefined;
    const msg = (value?.message ?? value?.payload ?? value) as Record<string, unknown> | undefined;
    const text = typeof msg?.text === "string" ? msg.text : typeof msg?.content === "string" ? msg.content : undefined;
    const chatId = msg?.chatId ?? msg?.chat_id ?? value?.chatId;
    if (!text || (typeof chatId !== "string" && typeof chatId !== "number")) return;
    const update: TelegramBotUpdate = { update_id: ++this.seq, message: { message_id: Number(msg?.messageId ?? msg?.message_id ?? Date.now()), chat: { id: Number(chatId) }, text, ...(typeof msg?.topicId === "number" ? { message_thread_id: msg.topicId } : {}) } };
    for (const subscriber of this.subscribers) void subscriber(update);
  }

  private send(frame: unknown) { if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error("gateway not connected"); this.socket.send(JSON.stringify(frame)); }
  private request<T>(method: string, params: unknown): Promise<T> {
    const id = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => { this.pending.set(id, { resolve: value => resolve(value as T), reject }); this.send({ type: "req", id, method, params }); });
  }
}
