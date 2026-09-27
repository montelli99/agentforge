/**
 * Runtime Telegram transport contract used by the AgentForge mirror.
 *
 * This is deliberately provider-neutral. The normal AgentForge path is an
 * AgentForge-owned BotFather bot transport; an MTProto user session is an
 * advanced option and a gateway relay is only a migration bridge.
 */
export interface TelegramLiveTransport {
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  /** Optional provider health separate from the desired polling/session state. */
  isHealthy?(): boolean;
  sendMessage(chatId: string | number, text: string, topicId?: number): Promise<number | string>;
}
