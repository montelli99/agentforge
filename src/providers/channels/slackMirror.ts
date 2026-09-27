import crypto from "node:crypto";
import type {
  ChannelProvider,
  InboundChannelEvent,
  OutboundChannelMessage,
  OutboundTopicUpdate,
  ChannelProviderReadiness,
} from "../../core/providers/channel.js";
import type { ApprovalRequest } from "../../core/types/approval.js";
import type { SlackSocketModeTransport } from "./slackSocketModeTransport.js";

/** Slack mirror with an optional AgentForge-owned Socket Mode transport. */
export class SlackMirrorProvider implements ChannelProvider {
  readonly id = "slack_mirror";
  readonly type = "slack" as const;

  readiness(): ChannelProviderReadiness {
    const live = Boolean(this.transport?.isConnected());
    return { status: live ? "live" : "sandbox", summary: live ? "Slack Socket Mode is connected through the AgentForge-owned transport." : "Provider-neutral Slack mirror; attach a Socket Mode transport to go live.", capabilities: ["event normalization", "thread fields", "approval-card contract", "outbound message contract", "Socket Mode lifecycle"], missing: live ? ["live provider acceptance"] : ["Slack app and bot token", "Socket Mode transport", "live provider acceptance"] };
  }
  private handlers: Array<(event: InboundChannelEvent) => Promise<void>> = [];
  private sentMessages: Array<{ messageId: string; targetChannel: string; text: string }> = [];
  private transport?: SlackSocketModeTransport;

  attachTransport(transport: SlackSocketModeTransport): void {
    this.transport = transport;
    transport.setEventHandler(async event => this.ingestEvent(event));
  }

  async initialize(): Promise<void> { if (this.transport) await this.transport.start(); }

  async shutdown(): Promise<void> {
    this.handlers = [];
    this.transport?.stop();
  }

  onEvent(handler: (event: InboundChannelEvent) => Promise<void>): void {
    this.handlers.push(handler);
  }

  async ingestEvent(event: {
    eventId: string;
    teamId: string;
    channelId: string;
    userId: string;
    username?: string;
    text?: string;
    threadTs?: string;
    command?: string;
  }): Promise<void> {
    const inbound: InboundChannelEvent = {
      id: `slack-${event.eventId}`,
      provider: "slack",
      eventType: event.command ? "command" : "message",
      externalWorkspaceId: event.teamId,
      externalChannelId: event.channelId,
      externalThreadId: event.threadTs,
      externalUserId: event.userId,
      externalUsername: event.username,
      payload: event.command
        ? { command: event.command, commandArgs: [] }
        : { text: event.text || "" },
      timestamp: new Date().toISOString(),
    };
    for (const handler of this.handlers) await handler(inbound);
  }

  async sendMessage(message: OutboundChannelMessage): Promise<{ externalMessageId: string }> {
    if (this.transport) return { externalMessageId: await this.transport.sendMessage(message.canonicalChannelId, message.text) };
    const externalMessageId = `slack-msg-${crypto.randomUUID().slice(0, 8)}`;
    this.sentMessages.push({ messageId: externalMessageId, targetChannel: message.canonicalChannelId, text: message.text });
    return { externalMessageId };
  }

  async updateTopic(_update: OutboundTopicUpdate): Promise<{ externalTopicId: string }> {
    return { externalTopicId: `slack-topic-${Date.now()}` };
  }

  async postApprovalCard(channelId: string, approval: ApprovalRequest): Promise<{ externalMessageId: string }> {
    return this.sendMessage({
      canonicalChannelId: channelId,
      text: `Approval required: ${approval.action} (${approval.risk})`,
      interactiveActions: [
        { id: "approve", label: "Approve", style: "primary", payload: { approvalId: approval.id } },
        { id: "reject", label: "Reject", style: "danger", payload: { approvalId: approval.id } },
      ],
    });
  }

  getSentMessages() {
    return [...this.sentMessages];
  }
}
