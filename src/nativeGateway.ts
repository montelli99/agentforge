import type { ChannelProvider, InboundChannelEvent, OutboundChannelMessage } from "./core/providers/channel.js";
import { ChannelRuntimeRegistry, type PublicChannel, type ChannelRuntimeStatus } from "./channelRuntimeRegistry.js";

export type NativeGatewayState = "stopped" | "starting" | "ready" | "degraded";

export type NativeGatewaySnapshot = {
  state: NativeGatewayState;
  startedAt?: string;
  channels: ChannelRuntimeStatus[];
  nativeOwnership: true;
};

/**
 * AgentForge-owned channel gateway. Provider adapters plug into this runtime;
 * OpenClaw/Hermes bridges are optional adapters, never required infrastructure.
 */
export class NativeAgentForgeGateway {
  private state: NativeGatewayState = "stopped";
  private startedAt?: string;
  private readonly listeners = new Set<(event: InboundChannelEvent) => Promise<void>>();

  constructor(private readonly runtimes = new ChannelRuntimeRegistry()) {
    for (const provider of ["telegram", "discord", "slack"] as const) {
      this.runtimes.get(provider).onEvent(event => this.dispatch(event));
    }
  }

  async start(providers: PublicChannel[] = ["telegram", "discord", "slack"]): Promise<NativeGatewaySnapshot> {
    this.state = "starting";
    const statuses = await Promise.all(providers.map(provider => this.runtimes.start(provider)));
    this.startedAt = new Date().toISOString();
    this.state = statuses.every(status => status.state === "ready") ? "ready" : "degraded";
    return this.snapshot();
  }

  async stop(providers: PublicChannel[] = ["telegram", "discord", "slack"]): Promise<NativeGatewaySnapshot> {
    await Promise.all(providers.map(provider => this.runtimes.stop(provider)));
    this.state = "stopped";
    return this.snapshot();
  }

  onInbound(listener: (event: InboundChannelEvent) => Promise<void>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async send(provider: PublicChannel, message: OutboundChannelMessage): Promise<{ externalMessageId: string }> {
    return this.runtimes.get(provider).sendMessage(message);
  }

  provider(provider: PublicChannel): ChannelProvider { return this.runtimes.get(provider); }
  snapshot(): NativeGatewaySnapshot {
    const channels = this.runtimes.list();
    const state = this.state === "stopped"
      ? "stopped"
      : channels.every(channel => channel.state === "ready") ? "ready" : "degraded";
    return { state, startedAt: this.startedAt, channels, nativeOwnership: true };
  }
  private async dispatch(event: InboundChannelEvent): Promise<void> { for (const listener of this.listeners) await listener(event); }
}
