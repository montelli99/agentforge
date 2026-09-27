/**
 * AgentForge-native Telegram user-session boundary.
 *
 * This deliberately does not use the Bot API and does not depend on
 * OpenClaw/Hermes. A deployment supplies an MTProto-capable client through
 * this small interface (for example, a reviewed adapter around its chosen
 * Telegram client library). Session material stays in that adapter; it is
 * never persisted by AgentForge or exposed in the public manifest.
 */

export type TelegramUserSessionUpdate = {
  updateId: number;
  chatId: string;
  topicId?: number;
  userId: string;
  username?: string;
  text?: string;
  messageId?: number;
  replyToMessageId?: number;
};

export interface TelegramUserSessionClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(chatId: string, text: string, topicId?: number): Promise<number | string>;
  onUpdate(handler: (update: TelegramUserSessionUpdate) => Promise<void>): () => void;
  isConnected?(): boolean;
}

export class TelegramUserSessionTransport {
  private unsubscribe: (() => void) | undefined;
  private handlerBound = false;
  private connected = false;

  constructor(private readonly client: TelegramUserSessionClient) {}

  isRunning(): boolean {
    return this.connected && (this.client.isConnected?.() ?? true);
  }

  async start(): Promise<void> {
    if (this.connected) return;
    await this.client.connect();
    if (!this.handlerBound) {
      this.unsubscribe = this.client.onUpdate(async () => undefined);
      this.handlerBound = true;
    }
    this.connected = true;
  }

  async stop(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.handlerBound = false;
    this.connected = false;
    await this.client.disconnect();
  }

  /** Register the canonical mirror callback before starting the session. */
  bind(handler: (update: TelegramUserSessionUpdate) => Promise<void>): void {
    if (this.connected) throw new Error("Telegram user session handlers must be bound before start.");
    this.unsubscribe?.();
    this.unsubscribe = this.client.onUpdate(handler);
    this.handlerBound = true;
  }

  sendMessage(chatId: string, text: string, topicId?: number): Promise<number | string> {
    if (!this.isRunning()) throw new Error("Telegram user session is not connected.");
    return this.client.sendMessage(chatId, text, topicId);
  }
}
