export type SlackSocketModeTransportOptions = {
  appToken: string;
  botToken: string;
  websocketFactory?: (url: string) => WebSocket;
  fetchImpl?: typeof fetch;
  reconnect?: boolean;
  reconnectBaseDelayMs?: number;
  onEvent: (event: { eventId: string; teamId: string; channelId: string; userId: string; username?: string; text?: string; threadTs?: string; command?: string }) => Promise<void>;
};

/** AgentForge-owned Slack Socket Mode session. Credentials are runtime-only. */
export class SlackSocketModeTransport {
  private socket: WebSocket | undefined;
  private connected = false;
  private ready = false;
  private stopping = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempt = 0;
  private readonly fetchImpl: typeof fetch;
  private readonly options: SlackSocketModeTransportOptions;
  private eventHandler: SlackSocketModeTransportOptions["onEvent"];

  constructor(options: SlackSocketModeTransportOptions) {
    if (!options.appToken.trim()) throw new Error("Slack app token is required.");
    if (!options.botToken.trim()) throw new Error("Slack bot token is required.");
    this.options = options;
    this.eventHandler = options.onEvent;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** Slack only becomes live after its Socket Mode hello frame arrives. */
  isConnected(): boolean { return this.connected && this.ready; }

  setEventHandler(handler: SlackSocketModeTransportOptions["onEvent"]): void { this.eventHandler = handler; }

  async start(): Promise<void> {
    if (this.socket || this.reconnectTimer) return;
    this.stopping = false;
    await this.connectSocket();
  }

  private async connectSocket(): Promise<void> {
    const response = await this.fetchImpl("https://slack.com/api/apps.connections.open", {
      method: "POST",
      headers: { authorization: `Bearer ${this.options.appToken}`, "content-type": "application/x-www-form-urlencoded" },
    });
    if (!response.ok) throw new Error(`Slack Socket Mode setup failed with HTTP ${response.status}.`);
    const payload = await response.json() as { ok?: boolean; url?: string; error?: string };
    if (!payload.ok || !payload.url) throw new Error(`Slack Socket Mode setup failed: ${payload.error || "missing WebSocket URL"}.`);
    const socket = (this.options.websocketFactory ?? ((url: string) => new WebSocket(url)))(payload.url);
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => { this.connected = true; resolve(); }, { once: true });
      socket.addEventListener("error", () => {
        if (this.socket === socket) this.socket = undefined;
        this.connected = false;
        this.ready = false;
        reject(new Error("Slack Socket Mode connection failed."));
      }, { once: true });
    });
    socket.addEventListener("message", event => {
      void this.handleMessage(socket, String(event.data)).catch(() => {
        // Event-level failures must not kill the long-lived Socket Mode session.
      });
    });
    socket.addEventListener("close", () => {
      this.connected = false;
      this.ready = false;
      if (this.socket === socket) this.socket = undefined;
      if (!this.stopping && this.options.reconnect !== false) this.scheduleReconnect();
    });
  }

  stop(): void {
    this.stopping = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.connected = false;
    this.ready = false;
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) return;
    const base = Math.max(0, this.options.reconnectBaseDelayMs ?? 1_000);
    const delay = Math.min(30_000, base * 2 ** this.reconnectAttempt++);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connectSocket()
        .then(() => { this.reconnectAttempt = 0; })
        .catch(() => this.scheduleReconnect());
    }, delay);
  }

  async sendMessage(channelId: string, text: string, threadTs?: string): Promise<string> {
    // An open WebSocket only proves reachability. Do not send as the bot until
    // Slack has completed its Socket Mode hello handshake for this session.
    if (!this.isConnected()) throw new Error("Slack Socket Mode is not ready.");
    const response = await this.fetchImpl("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { authorization: `Bearer ${this.options.botToken}`, "content-type": "application/json" },
      body: JSON.stringify({ channel: channelId, text, ...(threadTs ? { thread_ts: threadTs } : {}) }),
    });
    if (!response.ok) throw new Error(`Slack message send failed with HTTP ${response.status}.`);
    const payload = await response.json() as { ok?: boolean; ts?: string; error?: string };
    if (!payload.ok || !payload.ts) throw new Error(`Slack message send failed: ${payload.error || "missing message timestamp"}.`);
    return payload.ts;
  }

  private async handleMessage(socket: WebSocket, raw: string): Promise<void> {
    let frame: { envelope_id?: string; type?: string; payload?: Record<string, unknown> };
    try { frame = JSON.parse(raw) as typeof frame; } catch { return; }
    // A WebSocket open event only proves transport reachability. Slack's
    // Socket Mode hello is the protocol-level proof that this is a usable
    // authenticated session.
    if (frame.type === "hello") {
      if (this.socket === socket) this.ready = true;
      return;
    }
    // ACK on the socket which delivered the envelope. A reconnect must never
    // acknowledge an old envelope through a different Socket Mode session.
    if (frame.envelope_id && this.socket === socket) socket.send(JSON.stringify({ envelope_id: frame.envelope_id }));
    // A socket open is not authority to process an event. Socket Mode normally
    // sends hello first, but keep a proxy or malformed test peer from invoking
    // application work before the authenticated session is ready.
    if (!this.ready || this.socket !== socket) return;
    if (frame.type !== "events_api" || !frame.payload) return;
    const event = frame.payload.event as Record<string, unknown> | undefined;
    if (!event || event.type !== "message" || event.subtype === "message_changed") return;
    await this.eventHandler({
      eventId: String(frame.envelope_id || event.ts || ""),
      teamId: String(frame.payload.team_id || ""),
      channelId: String(event.channel || ""),
      userId: String(event.user || ""),
      text: typeof event.text === "string" ? event.text : undefined,
      threadTs: typeof event.thread_ts === "string" ? event.thread_ts : undefined,
    });
  }
}
