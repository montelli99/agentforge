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
} from "../../core/providers/channel.js";
import type { ApprovalRequest } from "../../core/types/approval.js";

export class DiscordMirrorProvider implements ChannelProvider {
  readonly id = "discord_mirror";
  readonly type: ChannelProviderType = "discord";

  private eventHandlers: Array<(event: InboundChannelEvent) => Promise<void>> = [];
  private channelBindings = new Map<string, string>(); // canonicalChannelId <-> discordChannelId
  private sentMessages: Array<{ messageId: string; targetChannel: string; text: string }> = [];

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {
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
  }): Promise<void> {
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
