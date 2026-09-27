/**
 * Discord Mirror & Remote Control Channel Provider
 * Section 13: Discord Mirror (Guild -> Space, Channel -> Channel, Thread -> Thread)
 * Section 19: Discord Remote Control (Components & Interactions)
 */

import crypto from "node:crypto";
import type {
  ChannelProvider,
  ChannelProviderType,
  InboundChannelEvent,
  OutboundChannelMessage,
  OutboundTopicUpdate,
  ChannelProviderReadiness,
} from "../../core/providers/channel.js";
import type { ApprovalRequest } from "../../core/types/approval.js";
import { DiscordGatewayRelay, type DiscordGatewayBridge } from "./discordGatewayRelay.js";

type DiscordLiveTransport = { isConnected(): boolean; isReady?(): boolean; start?(): Promise<void>; stop?(): void; sendMessage?(channelId: string, text: string): Promise<string> };

export class DiscordMirrorProvider implements ChannelProvider {
  readonly id = "discord_mirror";
  readonly type: ChannelProviderType = "discord";

  readiness(): ChannelProviderReadiness {
    const live = Boolean(this.liveTransport?.isReady?.() ?? this.liveTransport?.isConnected());
    return { status: live ? "live" : "sandbox", summary: live
      ? "Discord is connected through the standalone Gateway v10 transport and routed through the canonical AgentForge mirror."
      : "Discord mirror contracts and a standalone Gateway v10 transport are available; an authenticated gateway/session relay can also be attached without copying provider secrets.", capabilities: ["channel binding", "interaction normalization", "remote-control policy handling", "outbound message contract", "standalone Gateway v10 transport", "gateway/session relay"], missing: live ? [] : ["live provider acceptance"] };
  }

  attachLiveTransport(transport: DiscordLiveTransport): void { this.liveTransport = transport; }

  createGatewayRelay(bridge: DiscordGatewayBridge): DiscordGatewayRelay {
    return new DiscordGatewayRelay(this, bridge);
  }

  private eventHandlers: Array<(event: InboundChannelEvent) => Promise<void>> = [];
  private channelBindings = new Map<string, string>(); // canonicalChannelId <-> discordChannelId
  private sentMessages: Array<{ messageId: string; targetChannel: string; text: string }> = [];
  private liveTransport?: DiscordLiveTransport;

  async initialize(): Promise<void> {
    await this.liveTransport?.start?.();
  }
  async shutdown(): Promise<void> {
    this.liveTransport?.stop?.();
    this.eventHandlers = [];
  }

  onEvent(handler: (event: InboundChannelEvent) => Promise<void>): void {
    this.eventHandlers.push(handler);
  }

  bindChannel(canonicalChannelId: string, discordChannelId: string): void {
    this.channelBindings.set(canonicalChannelId, discordChannelId);
  }

  async ingestInteraction(interaction: {
    interactionId: string;
    guildId: string;
    channelId: string;
    userId: string;
    username: string;
    customId: string; // e.g. "approve_btn:AF-142"
    actionPayload?: Record<string, unknown>;
  }): Promise<void> {
    const [actionId, targetId] = interaction.customId.split(":");
    const event: InboundChannelEvent = {
      id: `discord-int-${interaction.interactionId}`,
      provider: "discord",
      eventType: "action_button_clicked",
      externalWorkspaceId: interaction.guildId,
      externalChannelId: interaction.channelId,
      externalUserId: interaction.userId,
      externalUsername: interaction.username,
      payload: {
        actionId,
        actionPayload: { targetId, ...interaction.actionPayload },
      },
      timestamp: new Date().toISOString(),
    };
    for (const h of this.eventHandlers) await h(event);
  }

  async ingestInboundInteraction(interaction: {
    interactionId: string;
    guildId: string;
    channelId: string;
    userId: string;
    username?: string;
    command?: string;
    customId?: string;
    actionPayload?: Record<string, unknown>;
    text?: string;
    eventType?: "interaction" | "message";
  }): Promise<void> {
    if (interaction.eventType === "message") {
      const event: InboundChannelEvent = {
        id: `discord-msg-${interaction.interactionId}`,
        provider: "discord",
        eventType: "message",
        externalWorkspaceId: interaction.guildId,
        externalChannelId: interaction.channelId,
        externalUserId: interaction.userId,
        externalUsername: interaction.username,
        payload: { text: interaction.text || "" },
        timestamp: new Date().toISOString(),
      };
      for (const h of this.eventHandlers) await h(event);
      return;
    }
    if (interaction.command) {
      const event: InboundChannelEvent = {
        id: `discord-cmd-${interaction.interactionId}`,
        provider: "discord",
        eventType: "command",
        externalWorkspaceId: interaction.guildId,
        externalChannelId: interaction.channelId,
        externalUserId: interaction.userId,
        externalUsername: interaction.username || interaction.userId,
        payload: {
          command: interaction.command.startsWith("/") ? interaction.command : `/${interaction.command}`,
          commandArgs: [],
        },
        timestamp: new Date().toISOString(),
      };
      for (const h of this.eventHandlers) await h(event);
      return;
    }

    if (interaction.customId) {
      return this.ingestInteraction({
        ...interaction,
        username: interaction.username || interaction.userId,
        customId: interaction.customId,
      });
    }
  }

  async sendMessage(message: OutboundChannelMessage): Promise<{ externalMessageId: string }> {
    const discordChannelId = this.channelBindings.get(message.canonicalChannelId);
    if (this.liveTransport?.sendMessage && discordChannelId) {
      const externalMessageId = await this.liveTransport.sendMessage(discordChannelId, message.text);
      this.sentMessages.push({ messageId: externalMessageId, targetChannel: message.canonicalChannelId, text: message.text });
      return { externalMessageId };
    }
    const externalMessageId = `discord-msg-${crypto.randomUUID().slice(0, 8)}`;
    this.sentMessages.push({
      messageId: externalMessageId,
      targetChannel: message.canonicalChannelId,
      text: message.text,
    });
    return { externalMessageId };
  }

  async updateTopic(update: OutboundTopicUpdate): Promise<{ externalTopicId: string }> {
    return { externalTopicId: `discord-ch-${Date.now()}` };
  }

  async postApprovalCard(channelId: string, approval: ApprovalRequest): Promise<{ externalMessageId: string }> {
    return this.sendMessage({
      canonicalChannelId: channelId,
      text: `**Approval Request [${approval.taskId}]**: ${approval.action} (Risk: ${approval.risk})`,
      interactiveActions: [
        { id: "approve", label: "Approve", style: "primary", payload: { approvalId: approval.id } },
        { id: "reject", label: "Reject", style: "danger", payload: { approvalId: approval.id } },
      ],
    });
  }

  getSentMessages() {
    return this.sentMessages;
  }
}
