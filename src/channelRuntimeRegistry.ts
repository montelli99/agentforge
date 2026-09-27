import type { ChannelProvider, ChannelProviderReadiness } from "./core/providers/channel.js";
import { DiscordMirrorProvider } from "./providers/channels/discordMirror.js";
import { SlackMirrorProvider } from "./providers/channels/slackMirror.js";
import { TelegramMirrorProvider } from "./providers/channels/telegramMirror.js";
import { redactRuntimeError } from "./core/secret/runtimeRedaction.js";

export type PublicChannel = "telegram" | "discord" | "slack";
export type RuntimeState = "stopped" | "starting" | "ready" | "error";

export type ChannelRuntimeStatus = {
  provider: PublicChannel;
  state: RuntimeState;
  readiness: ChannelProviderReadiness;
  initializedAt?: string;
  lastError?: string;
};

export class ChannelRuntimeRegistry {
  private readonly providers: Map<PublicChannel, ChannelProvider>;
  private readonly statuses: Map<PublicChannel, ChannelRuntimeStatus>;
  constructor(overrides: Partial<Record<PublicChannel, ChannelProvider>> = {}) {
    this.providers = new Map<PublicChannel, ChannelProvider>([
      ["telegram", overrides.telegram ?? new TelegramMirrorProvider()],
      ["discord", overrides.discord ?? new DiscordMirrorProvider()],
      ["slack", overrides.slack ?? new SlackMirrorProvider()],
    ]);
    this.statuses = new Map<PublicChannel, ChannelRuntimeStatus>(
      [...this.providers.entries()].map(([provider, adapter]) => [provider, {
        provider,
        state: "stopped" as const,
        readiness: adapter.readiness?.() || {
          status: "unconfigured" as const,
          summary: "Adapter readiness is unavailable.",
          capabilities: [],
          missing: ["readiness contract"],
        },
      }]),
    );
  }

  async start(provider: PublicChannel): Promise<ChannelRuntimeStatus> {
    const adapter = this.providers.get(provider);
    if (!adapter) throw new Error(`Unsupported public channel: ${provider}`);
    this.statuses.set(provider, { provider, state: "starting", readiness: this.statuses.get(provider)!.readiness });
    try {
      await adapter.initialize();
      const readiness = adapter.readiness?.() || this.statuses.get(provider)!.readiness;
      // Some gateways authenticate asynchronously after their socket opens.
      // Report that truth as starting until the adapter reports a live session.
      const state = (readiness.status === "live" || readiness.status === "local") ? "ready" as const : "starting" as const;
      const status = { provider, state, readiness, initializedAt: new Date().toISOString() };
      this.statuses.set(provider, status);
      return status;
    } catch (error) {
      const status = { provider, state: "error" as const, readiness: adapter.readiness?.() || this.statuses.get(provider)!.readiness, lastError: redactRuntimeError(error) };
      this.statuses.set(provider, status);
      return status;
    }
  }

  async stop(provider: PublicChannel): Promise<ChannelRuntimeStatus> {
    const adapter = this.providers.get(provider);
    if (!adapter) throw new Error(`Unsupported public channel: ${provider}`);
    await adapter.shutdown();
    const status = { provider, state: "stopped" as const, readiness: adapter.readiness?.() || this.statuses.get(provider)!.readiness };
    this.statuses.set(provider, status);
    return status;
  }

  get(provider: PublicChannel): ChannelProvider {
    const adapter = this.providers.get(provider);
    if (!adapter) throw new Error(`Unsupported public channel: ${provider}`);
    return adapter;
  }

  list(): ChannelRuntimeStatus[] {
    return [...this.statuses.values()].map(status => {
      const adapter = this.providers.get(status.provider)!;
      const readiness = adapter.readiness?.() || status.readiness;
      if (status.state === "stopped") return { ...status, readiness };
      if (readiness.status === "live" || readiness.status === "local") {
        return { ...status, state: "ready" as const, readiness, lastError: undefined };
      }
      return {
        ...status,
        state: status.state === "starting" ? "starting" as const : "error" as const,
        readiness,
        ...(status.state === "starting" ? {} : { lastError: "Channel transport is not connected." }),
      };
    });
  }
}
