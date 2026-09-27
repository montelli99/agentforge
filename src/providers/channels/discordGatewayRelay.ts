import type { DiscordMirrorProvider } from "./discordMirror.js";

export type DiscordGatewayEvent = {
  interactionId: string;
  guildId: string;
  channelId: string;
  userId: string;
  username?: string;
  command?: string;
  customId?: string;
  actionPayload?: Record<string, unknown>;
};

export interface DiscordGatewayBridge {
  isConnected?(): boolean;
  subscribe(handler: (event: DiscordGatewayEvent) => Promise<void>): () => void;
}

/** Adapts an already-authenticated Discord gateway/session without storing a bot token. */
export class DiscordGatewayRelay {
  private unsubscribe: (() => void) | undefined;
  constructor(private readonly mirror: DiscordMirrorProvider, private readonly bridge: DiscordGatewayBridge) {}
  status(): "connected" | "disconnected" | "unknown" {
    if (!this.bridge.isConnected) return "unknown";
    return this.bridge.isConnected() ? "connected" : "disconnected";
  }
  start(): void {
    if (this.unsubscribe) return;
    if (this.status() === "disconnected") throw new Error("Discord gateway is disconnected; relay not started.");
    this.unsubscribe = this.bridge.subscribe((event) => this.mirror.ingestInboundInteraction(event));
  }
  stop(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }
}
