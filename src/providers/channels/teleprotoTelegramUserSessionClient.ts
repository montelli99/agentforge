import { TelegramClient } from "teleproto";
import { NewMessage } from "teleproto/events/index.js";
import { StringSession } from "teleproto/sessions/index.js";
import type { TelegramUserSessionClient, TelegramUserSessionUpdate } from "./telegramUserSessionTransport.js";

export type TeleprotoTelegramUserSessionOptions = {
  apiId: number;
  apiHash: string;
  session: string;
  connectionRetries?: number;
  requestRetries?: number;
};

export function normalizeTeleprotoMessage(event: unknown): TelegramUserSessionUpdate {
  const source = event as { message?: Record<string, unknown>; id?: number; chatId?: unknown; senderId?: unknown };
  const message = source.message ?? {};
  const id = typeof message.id === "number" ? message.id : 0;
  const chatId = String(message.chatId ?? source.chatId ?? message.peerId ?? "");
  const userId = String(message.senderId ?? source.senderId ?? "");
  const reply = message.replyTo as { replyToMsgId?: number; replyToTopId?: number; topMsgId?: number } | undefined;
  const rawTopicId = message.replyToTopId ?? reply?.replyToTopId ?? reply?.topMsgId;
  const topicId = typeof rawTopicId === "number" && rawTopicId > 0 ? rawTopicId : undefined;
  return {
    updateId: id,
    chatId,
    userId,
    ...(topicId === undefined ? {} : { topicId }),
    text: typeof message.message === "string" ? message.message : typeof message.text === "string" ? message.text : undefined,
    messageId: id,
    replyToMessageId: reply?.replyToMsgId,
  };
}

/**
 * AgentForge-owned MTProto user session. This is the OpenClaw/Hermes-style
 * direct Telegram connection: it uses a user session and receives updates
 * over MTProto, with no Bot API polling or OpenClaw process involved.
 *
 * The session string is supplied at runtime and is never written by this
 * adapter. Interactive login belongs in a deployment setup flow; production
 * startup requires an already-authorized session.
 */
export class TeleprotoTelegramUserSessionClient implements TelegramUserSessionClient {
  private readonly client: TelegramClient;
  private readonly messageBuilder = new NewMessage({ incoming: true });
  private listener?: (event: unknown) => void;
  private connected = false;

  constructor(private readonly options: TeleprotoTelegramUserSessionOptions) {
    if (!Number.isInteger(options.apiId) || options.apiId <= 0) throw new Error("Telegram MTProto API ID is invalid.");
    if (!options.apiHash.trim()) throw new Error("Telegram MTProto API hash is required.");
    if (!options.session.trim()) throw new Error("An authorized Telegram user session is required.");
    this.client = new TelegramClient(new StringSession(options.session), options.apiId, options.apiHash, {
      connectionRetries: options.connectionRetries ?? 5,
      requestRetries: options.requestRetries ?? 3,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.client.connect();
    if (!(await this.client.checkAuthorization())) {
      await this.client.disconnect();
      throw new Error("Telegram user session is not authorized; complete login in the deployment setup flow first.");
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.removeListener();
    this.connected = false;
    await this.client.disconnect();
  }

  isConnected(): boolean { return this.connected; }

  onUpdate(handler: (update: TelegramUserSessionUpdate) => Promise<void>): () => void {
    this.removeListener();
    this.listener = event => { void handler(this.normalize(event)); };
    this.client.addEventHandler(this.listener, this.messageBuilder);
    return () => this.removeListener();
  }

  async sendMessage(chatId: string, text: string, topicId?: number): Promise<number | string> {
    if (!this.connected) throw new Error("Telegram user session is not connected.");
    const sent = await this.client.sendMessage(chatId, { message: text, replyTo: topicId });
    const id = (sent as unknown as { id?: number }).id;
    if (typeof id !== "number") throw new Error("Telegram MTProto send returned no message ID.");
    return id;
  }

  private removeListener(): void {
    if (this.listener) this.client.removeEventHandler(this.listener, this.messageBuilder);
    this.listener = undefined;
  }

  private normalize(event: unknown): TelegramUserSessionUpdate {
    return normalizeTeleprotoMessage(event);
  }
}

