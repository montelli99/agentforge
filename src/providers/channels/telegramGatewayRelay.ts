import type { TelegramBotUpdate } from "./telegramBotApiTransport.js";
import type { TelegramMirrorProvider } from "./telegramMirror.js";

/**
 * Relay boundary for an existing gateway owner such as OpenClaw.
 * The gateway remains responsible for Telegram polling; AgentForge only
 * consumes normalized updates and sends replies through the gateway callback.
 */
export interface TelegramGatewayBridge {
  isConnected?(): boolean;
  subscribe(handler: (update: TelegramBotUpdate) => Promise<void>): () => void;
  sendMessage(chatId: string | number, text: string, topicId?: number): Promise<number>;
}

export class TelegramGatewayRelay {
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly mirror: TelegramMirrorProvider,
    private readonly bridge: TelegramGatewayBridge,
  ) {}

  status(): "connected" | "disconnected" | "unknown" {
    if (!this.bridge.isConnected) return "unknown";
    return this.bridge.isConnected() ? "connected" : "disconnected";
  }

  start(): void {
    if (this.unsubscribe) return;
    // A gateway client may still be completing its authenticated handshake;
    // its connecting socket reports available. An explicitly disconnected
    // bridge is still refused so configuration errors fail loudly.
    if (this.status() === "disconnected") throw new Error("OpenClaw gateway is disconnected; relay not started.");
    this.unsubscribe = this.bridge.subscribe(async (update) => {
      const message = update.message;
      if (!message || !message.text || !message.from) return;
      await this.mirror.ingestInboundUpdate({
        updateId: update.update_id,
        chatId: String(message.chat.id),
        topicId: message.message_thread_id,
        userId: String(message.from.id),
        username: message.from.username,
        text: message.text,
        messageId: message.message_id,
        replyToMessageId: message.reply_to_message?.message_id,
      });
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  async sendMessage(chatId: string | number, text: string, topicId?: number): Promise<number> {
    return this.bridge.sendMessage(chatId, text, topicId);
  }
}
