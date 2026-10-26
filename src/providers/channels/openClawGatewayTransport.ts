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
    const saved = JSON.parse(fs.readFileSync(filePath, "utf8")) as DeviceIdentity;
    if (!saved || typeof saved.deviceId !== "string" || typeof saved.publicKeyPem !== "string" || typeof saved.privateKeyPem !== "string") throw new Error("invalid identity");
    const publicKey = crypto.createPublicKey(saved.publicKeyPem);
    const privateKey = crypto.createPrivateKey(saved.privateKeyPem);
    if (publicKey.asymmetricKeyType !== "ed25519" || privateKey.asymmetricKeyType !== "ed25519") throw new Error("invalid key type");
    const encoded = publicKey.export({ type: "spki", format: "der" });
    const derived = crypto.createPublicKey(privateKey).export({ type: "spki", format: "der" });
    if (!encoded.equals(derived) || crypto.createHash("sha256").update(encoded.subarray(-32)).digest("hex") !== saved.deviceId) throw new Error("identity mismatch");
    return { deviceId: saved.deviceId, publicKeyPem: saved.publicKeyPem, privateKeyPem: saved.privateKeyPem };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("Gateway identity could not be validated; existing file preserved. Restore its backup before reconnecting.");
  }
  const pair = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const raw = (pair.publicKey.export({ type: "spki", format: "der" }) as Buffer).subarray(-32);
  const created = { deviceId: crypto.createHash("sha256").update(raw).digest("hex"), publicKeyPem, privateKeyPem };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(created, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return created;
}

/** Experimental OpenClaw gateway client. It never polls Telegram and never owns a Telegram token. */
export class OpenClawGatewayTransport implements TelegramGatewayBridge {
  private socket?: WebSocket;
  private connected = false;
  private nonce?: string;
  private connectId?: string;
  private handshakeTimer?: ReturnType<typeof setTimeout>;
  private seq = 0;
  private stopGeneration = 0;
  private terminalHandshakeFailure = false;
  private connectingOperation = false;
  private grantedScopes = new Set<string>();
  private readonly pending = new Map<string, Pending>();
  private readonly subscribers = new Set<(update: TelegramBotUpdate) => Promise<void>>();
  private readonly device;

  constructor(private readonly options: { url: string; token?: string; identityPath: string; enableTaskDelegation?: boolean }) {
    this.options = Object.freeze({...options});
    const parsed = new URL(options.url);
    if (parsed.protocol !== "wss:" && !(parsed.protocol === "ws:" && ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname))) {
      throw new Error("Gateway URL must use wss://, or ws:// on loopback only.");
    }
    this.device = identity(options.identityPath);
  }

  /** Configuration binding, not proof of server identity. Credential changes require explicit rebinding. */
  getConnectionId(): string {
    return 'openclaw-' + crypto.createHmac('sha256', this.device.privateKeyPem)
      .update(JSON.stringify({url: new URL(this.options.url).href, token: this.options.token ?? '', ...(this.options.enableTaskDelegation?{taskDelegation:true}:{})})).digest('hex');
  }

  // Only an authenticated handshake establishes connection authority.
  isConnected(): boolean { return this.connected && this.socket?.readyState === WebSocket.OPEN; }
  isConnecting(): boolean { return Boolean(this.socket) && !this.connected; }

  start(): void {
    if (this.socket) return;
    this.nonce = undefined;
    this.connectId = undefined;
    this.terminalHandshakeFailure = false;
    const socket = new WebSocket(this.options.url);
    this.socket = socket;
    this.handshakeTimer = setTimeout(() => { if (this.socket === socket) this.disconnect(); }, 30_000);
    socket.addEventListener("message", event => { if (this.socket === socket) this.handle(String(event.data)); });
    socket.addEventListener("close", () => {
      if (this.socket !== socket) return;
      this.disconnect();
    });
    socket.addEventListener("error", () => { if (this.socket === socket) this.disconnect(); });
  }

  stop(): void { this.stopGeneration++; this.disconnect(); }

  private disconnect(): void {
    clearTimeout(this.handshakeTimer);
    this.handshakeTimer = undefined;
    const socket = this.socket;
    this.socket = undefined;
    this.connected = false;
    this.grantedScopes.clear();
    this.connectId = undefined;
    this.nonce = undefined;
    for (const pending of this.pending.values()) pending.reject(new Error("gateway disconnected; delivery may be uncertain"));
    this.pending.clear();
    socket?.close();
  }

  async connectWhenReady(timeoutMs = 30_000): Promise<void> {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error("Invalid gateway connection deadline");
    if (this.connectingOperation) throw new Error("Gateway connection is already in progress");
    this.connectingOperation = true;
    const generation = this.stopGeneration;
    const deadline = Date.now() + timeoutMs;
    let retryAt = 0;
    let backoff = 250;
    try {
      while (Date.now() < deadline) {
        if (this.stopGeneration !== generation) throw new Error("Gateway connection cancelled");
        if (this.isConnected()) return;
        if (this.terminalHandshakeFailure) throw new Error("Gateway authentication or protocol rejected; review the connection settings");
        if (!this.socket && Date.now() >= retryAt) {
          this.start(); retryAt = Date.now() + backoff; backoff = Math.min(backoff * 2, 2000);
        }
        await new Promise(resolve => setTimeout(resolve, Math.min(25, Math.max(1, deadline - Date.now()))));
      }
      throw new Error("Gateway did not become ready before the connection deadline");
    } catch (error) { this.disconnect(); throw error; }
    finally { this.connectingOperation = false; }
  }

  subscribe(handler: (update: TelegramBotUpdate) => Promise<void>): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  async sendMessage(chatId: string | number, text: string, topicId?: number): Promise<number> {
    if (!this.isConnected()) throw new Error("gateway authentication not complete");
    if (!this.grantedScopes.has("operator.write") && !this.grantedScopes.has("operator.admin")) throw new Error("gateway did not grant message write permission");
    const result = await this.request<Record<string, unknown>>("send", {
      channel: "telegram", target: String(chatId), message: text,
      ...(topicId ? { threadId: topicId } : {}),
    });
    const id = result?.messageId ?? result?.id;
    const parsed = typeof id === "number" ? id : typeof id === "string" && /^\d+$/.test(id) ? Number(id) : NaN;
    if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("gateway returned no valid message receipt; delivery may be uncertain");
    return parsed;
  }

  /** Metadata-only discovery. No transcript import, default selection or send. */
  async listSessions(limit = 25, offset = 0): Promise<{sessions:Array<{key:string;name:string}>;nextOffset?:number}> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0) throw Error('Invalid session page bounds');
    if (!this.isConnected()) throw Error('gateway authentication not complete');
    if (!['operator.read','operator.write','operator.admin'].some(scope=>this.grantedScopes.has(scope))) throw Error('gateway did not grant session read permission');
    const result=await this.request<Record<string,unknown>>('sessions.list',{limit,offset,rowMode:'compact'});
    if (!result || !Array.isArray(result.sessions) || result.sessions.length > limit) throw Error('Invalid gateway session page');
    const keys=new Set<string>();
    const sessions=result.sessions.map((row:unknown)=>{
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error('Invalid gateway session row');
      const value=row as Record<string,unknown>;
      const key=value.key;
      if (typeof key!=='string'||!key.trim()||key.length>512||/[\u0000-\u001f\u007f]/.test(key)||keys.has(key)) throw Error('Invalid or duplicate gateway session key');
      keys.add(key);
      const label=value.displayName ?? value.label;
      const name=typeof label==='string'&&label.trim()&&label.length<=200&&!/[\u0000-\u001f\u007f]/.test(label)?label:key;
      return {key,name};
    });
    const next=result.nextOffset;
    if (next!==undefined&&next!==null&&(!Number.isSafeInteger(next)||Number(next)<=offset)) throw Error('Invalid gateway session pagination');
    return {sessions,...(next===undefined||next===null?{}:{nextOffset:Number(next)})};
  }

  /** Read one explicitly bound session; never infer a session or replay a turn. */
  async readSessionHistory(sessionKey: string, limit = 50): Promise<Record<string, unknown> & { messages: unknown[] }> {
    if (!sessionKey.trim() || sessionKey.length > 512 || /[\u0000-\u001f]/.test(sessionKey)) throw new Error("An explicit valid gateway session key is required");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("History limit must be between 1 and 100");
    if (!this.isConnected()) throw new Error("gateway authentication not complete");
    if (!["operator.read", "operator.write", "operator.admin"].some(scope => this.grantedScopes.has(scope))) throw new Error("gateway did not grant history read permission");
    const result = await this.request<Record<string, unknown>>("chat.history", { sessionKey, limit });
    if (!result || !Array.isArray(result.messages)) throw new Error("gateway returned invalid session history");
    // Preserve activity fields exactly. Missing activeRunIds is not proof of idle.
    return result as Record<string, unknown> & { messages: unknown[] };
  }

  /** Low-level dispatch. The caller must durably record approval and request ID first. */
  async submitSessionTurn(sessionKey: string, message: string, idempotencyKey: string): Promise<{ runId: string }> {
    if (!sessionKey.trim() || sessionKey.length > 512 || /[\u0000-\u001f]/.test(sessionKey)) throw new Error("An explicit valid gateway session key is required");
    if (!message.trim() || message.length > 32_000) throw new Error("Gateway message must contain between 1 and 32000 characters");
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) throw new Error("A durable gateway request identifier is required");
    if (!this.isConnected()) throw new Error("gateway authentication not complete");
    if (!this.grantedScopes.has("operator.write") && !this.grantedScopes.has("operator.admin")) throw new Error("gateway did not grant message write permission");
    if (!this.options.enableTaskDelegation || !this.grantedScopes.has("operator.admin")) throw new Error("Task delegation requires explicit enablement and gateway-granted operator.admin scope for command suppression");
    const result = await this.request<Record<string, unknown>>("chat.send", {
      sessionKey, message, idempotencyKey, deliver: false, suppressCommandInterpretation: true,
    });
    if (!result || typeof result.runId !== "string" || !result.runId.trim() || result.runId.length > 512) throw new Error("gateway returned no run receipt; submission may be uncertain");
    return { runId: result.runId };
  }

  /** Observe a previously saved run without resubmission. Timeout is not completion. */
  async inspectRun(runId: string): Promise<Record<string, unknown> & {runId: string; status: string}> {
    if (!runId.trim() || runId.length > 512 || /[\u0000-\u001f]/.test(runId)) throw new Error("An explicit valid gateway run ID is required");
    if (!this.isConnected()) throw new Error("gateway authentication not complete");
    if (!["operator.read", "operator.write", "operator.admin"].some(scope => this.grantedScopes.has(scope))) throw new Error("gateway did not grant run read permission");
    const result = await this.request<Record<string, unknown>>("agent.wait", {runId, timeoutMs: 0});
    if (!result || result.runId !== runId || typeof result.status !== "string" || !result.status.trim()) throw new Error("gateway returned an invalid or mismatched run observation");
    return result as Record<string, unknown> & {runId: string; status: string};
  }

  /** Request cancellation of exactly one saved run; never send session-wide Stop. */
  async requestRunStop(sessionKey: string, runId: string): Promise<{acknowledged: boolean}> {
    for (const value of [sessionKey,runId]) if (!value.trim() || value.length>512 || /[\u0000-\u001f]/.test(value)) throw new Error('An explicit session and run ID are required for Stop');
    if (!this.isConnected()) throw new Error('gateway authentication not complete');
    if (!this.grantedScopes.has('operator.write') && !this.grantedScopes.has('operator.admin')) throw new Error('gateway did not grant Stop permission');
    const result=await this.request<Record<string,unknown>>('chat.abort',{sessionKey,runId,preserveSideRuns:true,discardPendingInput:false});
    if (!result || result.ok!==true || typeof result.aborted!=='boolean' || !Array.isArray(result.runIds) || !result.runIds.every(id=>typeof id==='string')) throw new Error('Invalid Stop receipt; cancellation may be uncertain');
    // Even acknowledgement is not evidence that every downstream effect ended.
    return {acknowledged:result.aborted===true && result.runIds.includes(runId)};
  }

  private sendConnect(signedAt: number) {
    const scopes = ["operator.read", "operator.write", ...(this.options.enableTaskDelegation ? ["operator.admin"] : [])];
    const payload = ["v2", this.device.deviceId, "gateway-client", "backend", "operator", scopes.join(","), String(signedAt), this.options.token ?? "", this.nonce ?? ""].join("|");
    const publicRaw = (crypto.createPublicKey(this.device.publicKeyPem).export({ type: "spki", format: "der" }) as Buffer).subarray(-32);
    const signature = b64url(crypto.sign(null, Buffer.from(payload), crypto.createPrivateKey(this.device.privateKeyPem)));
    this.connectId = crypto.randomUUID();
    this.send({ type: "req", id: this.connectId, method: "connect", params: {
      minProtocol: 4, maxProtocol: 4,
      client: { id: "gateway-client", version: "agentforge", platform: process.platform, mode: "backend" },
      caps: [], role: "operator", scopes, auth: this.options.token ? { token: this.options.token } : undefined,
      device: { id: this.device.deviceId, publicKey: b64url(publicRaw), signature, signedAt, ...(this.nonce ? { nonce: this.nonce } : {}) },
    }});
  }

  private handle(raw: string) {
    let frame: Record<string, unknown>;
    try { frame = JSON.parse(raw) as Record<string, unknown>; } catch { return; }
    if (!frame || typeof frame !== "object" || Array.isArray(frame)) return;
    if (frame.type === "event") {
      const event = frame as unknown as GatewayEvent;
      if (event.event === "connect.challenge") {
        const challenge = event.payload as { nonce?: unknown; ts?: unknown } | undefined;
        const nonce = challenge?.nonce;
        if (!this.connectId && !this.connected) {
          if (typeof nonce !== "string" || !nonce.trim() || typeof challenge?.ts !== "number" || !Number.isSafeInteger(challenge.ts) || challenge.ts < 0) { this.terminalHandshakeFailure = true; this.disconnect(); return; }
          this.nonce = nonce; this.sendConnect(challenge.ts);
        }
      } else if (event.event === "chat" && this.connected) this.emitChat(event.payload);
      return;
    }
    if (frame.type === "res" && typeof frame.id === "string") {
      if (frame.id === this.connectId) {
        const payload = frame.payload as { type?: string; protocol?: number; auth?: { role?: string; scopes?: unknown } } | undefined;
        this.connectId = undefined;
        if (frame.ok === true && payload?.type === "hello-ok" && payload.protocol === 4 && payload.auth?.role === "operator" && Array.isArray(payload.auth.scopes) && payload.auth.scopes.every(scope => typeof scope === "string")) {
          this.grantedScopes = new Set(payload.auth.scopes);
          clearTimeout(this.handshakeTimer);
          this.handshakeTimer = undefined;
          this.connected = true;
        }
        else {
          const error = frame.error as { code?: string; details?: { reason?: string } } | undefined;
          this.terminalHandshakeFailure = !(error?.code === "UNAVAILABLE" && error.details?.reason === "startup-sidecars");
          this.disconnect();
        }
        return;
      }
      const waiter = this.pending.get(frame.id); if (!waiter) return;
      this.pending.delete(frame.id);
      if (frame.ok === true) waiter.resolve(frame.payload); else waiter.reject(new Error(String((frame.error as { message?: unknown } | undefined)?.message ?? "gateway request failed")));
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
    if (!this.isConnected()) return Promise.reject(new Error("gateway authentication not complete"));
    const id = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("gateway response timed out; delivery may be uncertain"));
      }, 30_000);
      this.pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value as T); },
        reject: error => { clearTimeout(timer); reject(error); },
      });
      try { this.send({ type: "req", id, method, params }); }
      catch (error) {
        this.pending.get(id)?.reject(error instanceof Error ? error : new Error("gateway send failed"));
        this.pending.delete(id);
      }
    });
  }
}
