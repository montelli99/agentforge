/**
 * Telegram Mirror & Remote Control Channel Provider
 * Section 12: Telegram Mirror (Two-way mirroring between Telegram topics and AgentForge channels)
 * Section 18: Telegram as Remote Control Surface (/status, /tasks, /approvals, interactive callbacks)
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

export interface TelegramTopicBinding {
  chatId: string;
  topicId: number;
  canonicalChannelId: string;
  topicName: string;
}

export class TelegramMirrorProvider implements ChannelProvider {
  readonly id = "telegram_mirror";
  readonly type: ChannelProviderType = "telegram";

  private eventHandlers: Array<(event: InboundChannelEvent) => Promise<void>> = [];
  private topicBindings = new Map<string, TelegramTopicBinding>(); // key: `${chatId}:${topicId}`
  private channelToTopic = new Map<string, TelegramTopicBinding>(); // key: canonicalChannelId
  private sentMessages: Array<{ messageId: string; targetChannel: string; text: string }> = [];

  async initialize(): Promise<void> {
    // Initialized ready to receive webhook updates or polling
  }

  async shutdown(): Promise<void> {
    this.eventHandlers = [];
  }

  onEvent(handler: (event: InboundChannelEvent) => Promise<void>): void {
    this.eventHandlers.push(handler);
  }

  // Bind a Telegram topic to an AgentForge canonical channel
  bindTopic(chatId: string, topicId: number, canonicalChannelId: string, topicName: string): void {
    const binding: TelegramTopicBinding = { chatId, topicId, canonicalChannelId, topicName };
    this.topicBindings.set(`${chatId}:${topicId}`, binding);
    this.channelToTopic.set(canonicalChannelId, binding);
  }

  getBindingByTopic(chatId: string, topicId: number): TelegramTopicBinding | undefined {
    return this.topicBindings.get(`${chatId}:${topicId}`);
  }

  getBindingByChannel(channelId: string): TelegramTopicBinding | undefined {
    return this.channelToTopic.get(channelId);
  }

  // Simulate or process an inbound Telegram event (Webhook / Polling)
  async ingestInboundUpdate(update: {
    updateId: number;
    chatId: string;
    topicId?: number;
    userId: string;
    username?: string;
    text?: string;
    callbackData?: string;
    messageId?: number;
    replyToMessageId?: number;
  }): Promise<void> {
    const eventId = `tg-${update.updateId}`;
    const topicId = update.topicId || 1; // Default General topic

    // Handle interactive button callback (e.g. "approve:AF-142", "reject:AF-142")
    if (update.callbackData) {
      const [action, targetId] = update.callbackData.split(":");
      const event: InboundChannelEvent = {
        id: eventId,
        provider: "telegram",
        eventType: "action_button_clicked",
        externalWorkspaceId: update.chatId,
        externalChannelId: String(topicId),
        externalUserId: update.userId,
        externalUsername: update.username,
        payload: {
          actionId: action,
          actionPayload: { targetId },
        },
        timestamp: new Date().toISOString(),
      };
      for (const h of this.eventHandlers) await h(event);
      return;
    }

    // Handle slash commands (e.g. "/status", "/approvals", "/tasks")
    if (update.text?.startsWith("/")) {
      const parts = update.text.trim().split(/\s+/);
      const command = parts[0];
      const commandArgs = parts.slice(1);
      const event: InboundChannelEvent = {
        id: eventId,
        provider: "telegram",
        eventType: "command",
        externalWorkspaceId: update.chatId,
        externalChannelId: String(topicId),
        externalUserId: update.userId,
        externalUsername: update.username,
        payload: { command, commandArgs },
        timestamp: new Date().toISOString(),
      };
      for (const h of this.eventHandlers) await h(event);
      return;
    }

    // Regular conversation message
    const event: InboundChannelEvent = {
      id: eventId,
      provider: "telegram",
      eventType: "message",
      externalWorkspaceId: update.chatId,
      externalChannelId: String(topicId),
      externalThreadId: String(topicId),
      externalUserId: update.userId,
      externalUsername: update.username,
      payload: {
        text: update.text || "",
        replyToExternalMessageId: update.replyToMessageId ? String(update.replyToMessageId) : undefined,
      },
      timestamp: new Date().toISOString(),
    };
    for (const h of this.eventHandlers) await h(event);
  }

  // Outbound: AgentForge Web -> Telegram Topic
  async sendMessage(message: OutboundChannelMessage): Promise<{ externalMessageId: string }> {
    const binding = this.channelToTopic.get(message.canonicalChannelId);
    const externalMessageId = `tg-msg-${crypto.randomUUID().slice(0, 8)}`;

    this.sentMessages.push({
      messageId: externalMessageId,
      targetChannel: message.canonicalChannelId,
      text: message.text,
    });

    return { externalMessageId };
  }

  // Outbound: Web Channel created/renamed -> Telegram Topic created/renamed
  async updateTopic(update: OutboundTopicUpdate): Promise<{ externalTopicId: string }> {
    const externalTopicId = `topic-${Date.now()}`;
    return { externalTopicId };
  }

  // Post interactive approval card to Telegram with [View Diff] [Approve] [Reject]
  async postApprovalCard(channelId: string, approval: ApprovalRequest): Promise<{ externalMessageId: string }> {
    const cardText = `🚨 *Approval Required: Task ${approval.taskId}*\n` +
      `*Action:* ${approval.action}\n` +
      `*Risk:* ${approval.risk.toUpperCase()}\n` +
      `*Description:* ${approval.description}\n` +
      (approval.evidenceSummary ? `*Files Changed:* ${approval.evidenceSummary.filesCount} | *Tests:* ${approval.evidenceSummary.testsPassed ? "Passed ✓" : "Failed ✗"}` : "");

    return this.sendMessage({
      canonicalChannelId: channelId,
      text: cardText,
      interactiveActions: [
        { id: "view_diff", label: "View Diff", style: "secondary", payload: { taskId: approval.taskId } },
        { id: "approve", label: "Approve", style: "primary", payload: { approvalId: approval.id } },
        { id: "reject", label: "Reject", style: "danger", payload: { approvalId: approval.id } },
      ],
    });
  }

  getSentMessages() {
    return this.sentMessages;
  }
}
