export type DiscordGatewayTransportOptions = {
  token: string;
  intents?: number;
  gatewayUrl?: string;
  websocketFactory?: (url: string) => WebSocket;
  reconnect?: boolean;
  reconnectBaseDelayMs?: number;
  onEvent: (event: { interactionId: string; guildId: string; channelId: string; userId: string; username?: string; command?: string; customId?: string; text?: string; messageId?: string; eventType?: "interaction" | "message"; actionPayload?: Record<string, unknown> }) => Promise<void>;
};

/** Minimal Discord Gateway v10 transport. It owns the bot session when explicitly started. */
export class DiscordGatewayTransport {
  private socket: WebSocket | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private connected = false;
  private ready = false;
  private identified = false;
  private sequence: number | null = null;
  private heartbeatAcknowledged = true;
  private missedHeartbeatAcks = 0;
  private sessionId: string | undefined;
  private resumeGatewayUrl: string | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempt = 0;
  private stopping = false;
  private readonly options: Required<Pick<DiscordGatewayTransportOptions, "gatewayUrl" | "intents">> & DiscordGatewayTransportOptions;

  constructor(options: DiscordGatewayTransportOptions) {
    if (!options.token.trim()) throw new Error("Discord gateway token is required.");
    const gatewayUrl = options.gatewayUrl || "wss://gateway.discord.gg/?v=10&encoding=json";
    let parsed: URL;
    try { parsed = new URL(gatewayUrl); } catch { throw new Error("Discord gateway URL is invalid."); }
    const loopback = parsed.hostname.replace(/^\[|\]$/g, "");
    if (parsed.protocol !== "wss:" && !["localhost", "127.0.0.1", "::1"].includes(loopback)) {
      throw new Error("Discord gateway URL must use wss:// unless it is loopback.");
    }
    this.options = { gatewayUrl, intents: options.intents ?? 512, ...options };
  }

  isConnected(): boolean { return this.connected; }
  /** Gateway readiness requires Discord to accept IDENTIFY or RESUME, not just a TCP/WebSocket open. */
  isReady(): boolean { return this.ready; }

  async sendMessage(channelId: string, text: string): Promise<string> {
    if (!this.isReady()) throw new Error("Discord gateway is not ready.");
    const response = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, {
      method: "POST",
      headers: { authorization: `Bot ${this.options.token}`, "content-type": "application/json" },
      body: JSON.stringify({ content: text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Discord message send failed with HTTP ${response.status}.`);
    const payload = await response.json() as { id?: string };
    if (!payload.id) throw new Error("Discord message send returned no message ID.");
    return payload.id;
  }

  async start(): Promise<void> {
    if (this.socket || this.reconnectTimer) return;
    this.stopping = false;
    await this.connectSocket(true);
  }

  private async connectSocket(initial: boolean): Promise<void> {
    const factory = this.options.websocketFactory ?? ((url: string) => new WebSocket(url));
    const socket = factory(this.resumeGatewayUrl || this.options.gatewayUrl);
    this.socket = socket;
    this.identified = false;
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => { this.connected = true; resolve(); }, { once: true });
      socket.addEventListener("error", () => {
        if (this.socket === socket) this.socket = undefined;
        this.connected = false;
        this.ready = false;
        this.identified = false;
        if (initial) reject(new Error("Discord gateway connection failed."));
        else resolve();
      }, { once: true });
    });
    socket.addEventListener("message", (event) => this.handleMessage(String(event.data)));
    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = undefined;
      this.connected = false;
      this.ready = false;
      this.identified = false;
      this.clearHeartbeat();
      if (!this.stopping && this.options.reconnect !== false) this.scheduleReconnect();
    });
  }

  stop(): void {
    this.stopping = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.connected = false;
    this.ready = false;
    this.identified = false;
    this.clearHeartbeat();
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
  }

  private clearHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.stopping) return;
    const base = Math.max(0, this.options.reconnectBaseDelayMs ?? 1_000);
    const delay = Math.min(30_000, base * 2 ** this.reconnectAttempt++);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connectSocket(false).then(() => { this.reconnectAttempt = 0; }).catch(() => this.scheduleReconnect());
    }, delay);
  }

  private handleMessage(raw: string): void {
    let frame: { op?: number; t?: string; s?: number | null; d?: unknown };
    try {
      frame = JSON.parse(raw) as { op?: number; t?: string; d?: unknown };
    } catch {
      // Gateway extensions and proxy noise must not tear down the session.
      return;
    }
    if (typeof frame.s === "number") {
      this.sequence = frame.s;
    }
    if (frame.op === 10) {
      const hello = frame.d as { heartbeat_interval?: number };
      const identify = this.sessionId && this.sequence !== null
        ? { op: 6, d: { token: this.options.token, session_id: this.sessionId, seq: this.sequence } }
        : { op: 2, d: { token: this.options.token, intents: this.options.intents, properties: { os: "agentforge", browser: "agentforge", device: "agentforge" } } };
      this.socket?.send(JSON.stringify(identify));
      this.identified = true;
      this.heartbeatAcknowledged = true;
      this.clearHeartbeat();
      const interval = Math.max(5_000, hello.heartbeat_interval ?? 41_250);
      this.heartbeat = setInterval(() => {
        if (!this.socket) return;
        // Two missed ACKs means the session is stale. The first missed ACK is
        // tolerated because the acknowledgement can race the next interval.
        if (!this.heartbeatAcknowledged) {
          this.missedHeartbeatAcks += 1;
          if (this.missedHeartbeatAcks >= 2) this.socket.close();
          return;
        }
        this.missedHeartbeatAcks = 0;
        this.heartbeatAcknowledged = false;
        this.socket.send(JSON.stringify({ op: 1, d: this.sequence }));
      }, interval);
      return;
    }
    if (frame.op === 11) {
      this.heartbeatAcknowledged = true;
      this.missedHeartbeatAcks = 0;
      return;
    }
    if (frame.op === 0 && frame.t === "READY") {
      if (!this.identified) return;
      const ready = frame.d as { session_id?: string; resume_gateway_url?: string } | undefined;
      if (ready?.session_id) this.sessionId = ready.session_id;
      if (ready?.resume_gateway_url) this.resumeGatewayUrl = ready.resume_gateway_url;
      this.heartbeatAcknowledged = true;
      this.missedHeartbeatAcks = 0;
      this.ready = true;
      return;
    }
    if (frame.op === 0 && frame.t === "RESUMED") {
      if (!this.identified) return;
      this.heartbeatAcknowledged = true;
      this.missedHeartbeatAcks = 0;
      this.ready = true;
      return;
    }
    if (frame.op === 7) { this.ready = false; this.socket?.close(); return; }
    if (frame.op === 9 && frame.d === false) { this.ready = false; this.sessionId = undefined; this.sequence = null; this.socket?.close(); return; }
    // Ignore application events until Discord has accepted IDENTIFY or RESUME.
    // A socket open or a Gateway hello is not authority to act for the bot.
    if (!this.ready) return;
    if (frame.op === 0 && frame.t === "INTERACTION_CREATE") {
      const data = frame.d as Record<string, unknown>;
      void this.options.onEvent({
        interactionId: String(data.id ?? ""),
        guildId: String(data.guild_id ?? ""),
        channelId: String(data.channel_id ?? ""),
        userId: String(((data.member as { user?: { id?: string } } | undefined)?.user?.id) ?? ((data.user as { id?: string } | undefined)?.id ?? "")),
        username: String(((data.member as { user?: { username?: string } } | undefined)?.user?.username) ?? ((data.user as { username?: string } | undefined)?.username ?? "")),
        command: typeof data.data === "object" && data.data !== null && "name" in data.data ? `/${String((data.data as { name: unknown }).name)}` : undefined,
        customId: typeof data.data === "object" && data.data !== null && "custom_id" in data.data ? String((data.data as { custom_id: unknown }).custom_id) : undefined,
        eventType: "interaction",
      });
    }
    if (frame.op === 0 && frame.t === "MESSAGE_CREATE") {
      const data = frame.d as Record<string, unknown>;
      const author = data.author as { id?: string; username?: string } | undefined;
      void this.options.onEvent({
        interactionId: String(data.id ?? ""),
        messageId: String(data.id ?? ""),
        guildId: String(data.guild_id ?? ""),
        channelId: String(data.channel_id ?? ""),
        userId: String(author?.id ?? ""),
        username: author?.username,
        text: typeof data.content === "string" ? data.content : undefined,
        eventType: "message",
      });
    }
  }
}
