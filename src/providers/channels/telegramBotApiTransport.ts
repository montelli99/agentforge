import type { TelegramWebhookInfo } from "./telegramMirror.js";
import type { TelegramLiveTransport } from "./telegramLiveTransport.js";

export interface TelegramBotUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number; username?: string };
    text?: string;
    message_thread_id?: number;
    reply_to_message?: { message_id: number };
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number };
      message_thread_id?: number;
    };
  };
}

export interface TelegramBotApiTransportOptions {
  token: string;
  onUpdate: (update: TelegramBotUpdate) => Promise<void>;
  pollTimeoutSeconds?: number;
  fetchImpl?: typeof fetch;
  /** Official API by default; loopback/custom HTTPS enables self-hosted testing. */
  apiBaseUrl?: string;
}

/** Official Telegram transport. It is opt-in and never starts from adapter construction. */
export class TelegramBotApiTransport implements TelegramLiveTransport {
  private readonly token: string;
  private readonly onUpdate: (update: TelegramBotUpdate) => Promise<void>;
  private readonly pollTimeoutSeconds: number;
  private readonly fetchImpl: typeof fetch;
  private readonly apiBaseUrl: string;
  private running = false;
  private offset = 0;
  private pollAbort: AbortController | undefined;
  private healthy = false;
  private lastPollFailure: "conflict" | "other" | undefined;

  constructor(options: TelegramBotApiTransportOptions) {
    if (!/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(options.token)) throw new Error("Telegram bot token format is invalid.");
    this.token = options.token;
    this.onUpdate = options.onUpdate;
    this.pollTimeoutSeconds = Math.max(0, Math.min(50, options.pollTimeoutSeconds ?? 25));
    this.fetchImpl = options.fetchImpl ?? fetch;
    const apiBaseUrl = options.apiBaseUrl?.replace(/\/$/, "") || "https://api.telegram.org";
    let parsed: URL;
    try { parsed = new URL(apiBaseUrl); } catch { throw new Error("Telegram API base URL is invalid."); }
    const loopback = parsed.hostname.replace(/^\[|\]$/g, "");
    if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(loopback)) {
      throw new Error("Telegram API base URL must use HTTPS unless it is loopback.");
    }
    this.apiBaseUrl = apiBaseUrl;
  }

  isRunning(): boolean { return this.running; }
  /** A poller may be running while Telegram is temporarily unreachable. */
  isHealthy(): boolean { return this.running && this.healthy; }
  getLastPollFailure(): "conflict" | "other" | undefined { return this.lastPollFailure; }

  async getWebhookInfo(): Promise<TelegramWebhookInfo> {
    const payload = await this.call("getWebhookInfo");
    const result = payload.result as Record<string, unknown>;
    return {
      url: typeof result.url === "string" ? result.url : "",
      hasCustomCertificate: result.has_custom_certificate === true,
      pendingUpdateCount: typeof result.pending_update_count === "number" ? result.pending_update_count : 0,
      ...(typeof result.last_error_date === "number" ? { lastErrorDate: result.last_error_date } : {}),
      ...(typeof result.last_error_message === "string" ? { lastErrorMessage: result.last_error_message } : {}),
    };
  }

  async sendMessage(chatId: string | number, text: string, threadId?: number): Promise<number> {
    const payload = await this.call("sendMessage", { chat_id: chatId, text, ...(threadId ? { message_thread_id: threadId } : {}) });
    const message = payload.result as { message_id?: number };
    if (typeof message.message_id !== "number") throw new Error("Telegram sendMessage returned no message ID.");
    return message.message_id;
  }

  async start(): Promise<void> {
    if (this.running) return;
    const webhook = await this.getWebhookInfo();
    if (webhook.url) throw new Error("Telegram polling refused while a webhook is registered.");
    this.running = true;
    this.healthy = false;
    this.lastPollFailure = undefined;
    const controller = new AbortController();
    this.pollAbort = controller;
    void this.pollLoop(controller);
  }

  stop(): void {
    this.running = false;
    this.healthy = false;
    this.pollAbort?.abort();
    this.pollAbort = undefined;
  }

  private async pollLoop(controller: AbortController): Promise<void> {
    while (this.running && !controller.signal.aborted) {
      try {
        const payload = await this.call("getUpdates", { offset: this.offset, timeout: this.pollTimeoutSeconds, allowed_updates: ["message", "callback_query"] }, controller.signal);
        const updates = Array.isArray(payload.result) ? payload.result as TelegramBotUpdate[] : [];
        for (const update of updates) {
          if (!Number.isSafeInteger(update.update_id) || update.update_id < 0) {
            throw new Error("Telegram getUpdates returned an invalid update ID.");
          }
          // Telegram normally applies the requested offset itself. Keep the
          // transport defensive against duplicate or stale data from proxies
          // so it cannot replay a control action after a reconnect.
          if (update.update_id < this.offset) continue;
          // Only update types explicitly requested above can enter the mirror.
          // Unknown payloads are acknowledged without invoking application
          // code, preventing a future Telegram update shape from becoming an
          // accidental control surface.
          if (!update.message && !update.callback_query) {
            this.offset = Math.max(this.offset, update.update_id + 1);
            continue;
          }
          await this.onUpdate(update);
          // Advance only after the mirror accepted the update. A failed handler
          // must be retried instead of silently losing a seller/approval event.
          this.offset = Math.max(this.offset, update.update_id + 1);
        }
        this.healthy = true;
        this.lastPollFailure = undefined;
      } catch (error) {
        this.healthy = false;
        this.lastPollFailure = error instanceof Error && /Telegram getUpdates failed with HTTP 409\./.test(error.message)
          ? "conflict" : "other";
        if (this.running && !controller.signal.aborted) await new Promise(resolve => setTimeout(resolve, 1_000));
      }
    }
    if (this.pollAbort === controller) this.pollAbort = undefined;
  }

  private async call(method: string, body?: Record<string, unknown>, signal?: AbortSignal): Promise<{ ok?: boolean; result?: unknown; description?: string }> {
    const response = await this.fetchImpl(`${this.apiBaseUrl}/bot${this.token}/${method}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Telegram ${method} failed with HTTP ${response.status}.`);
    const payload = await response.json() as { ok?: boolean; result?: unknown; description?: string };
    if (!payload.ok) throw new Error(payload.description || `Telegram ${method} failed.`);
    return payload;
  }
}
