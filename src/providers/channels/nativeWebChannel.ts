/**
 * AgentForge Native Web Channel Provider
 * Section 14: AgentForge Native Channels
 * First-class native messaging channels without needing external third parties.
 */

import crypto from "node:crypto";
import type {
  ChannelProvider,
  ChannelProviderType,
  InboundChannelEvent,
  OutboundChannelMessage,
} from "../../core/providers/channel.js";
import type { ApprovalRequest } from "../../core/types/approval.js";

export class NativeWebChannelProvider implements ChannelProvider {
  readonly id = "agentforge_native_web";
  readonly type: ChannelProviderType = "web";

  private eventHandlers: Array<(event: InboundChannelEvent) => Promise<void>> = [];
  private liveFeed: OutboundChannelMessage[] = [];

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {
    this.eventHandlers = [];
  }

  onEvent(handler: (event: InboundChannelEvent) => Promise<void>): void {
    this.eventHandlers.push(handler);
  }

  async sendUserMessage(channelId: string, userId: string, text: string): Promise<void> {
    const event: InboundChannelEvent = {
      id: `web-evt-${crypto.randomUUID().slice(0, 8)}`,
      provider: "web",
      eventType: "message",
      externalWorkspaceId: "default",
      externalChannelId: channelId,
      externalUserId: userId,
      payload: { text },
      timestamp: new Date().toISOString(),
    };
    for (const h of this.eventHandlers) await h(event);
  }

  async sendMessage(message: OutboundChannelMessage): Promise<{ externalMessageId: string }> {
    const externalMessageId = `web-msg-${crypto.randomUUID().slice(0, 8)}`;
    this.liveFeed.push(message);
    return { externalMessageId };
  }

  async postApprovalCard(channelId: string, approval: ApprovalRequest): Promise<{ externalMessageId: string }> {
    return this.sendMessage({
      canonicalChannelId: channelId,
      text: `Approval Required: ${approval.action} for task ${approval.taskId}`,
      interactiveActions: [
        { id: "approve", label: "Approve", style: "primary", payload: { approvalId: approval.id } },
        { id: "reject", label: "Reject", style: "danger", payload: { approvalId: approval.id } },
      ],
    });
  }

  getLiveFeed(): OutboundChannelMessage[] {
    return this.liveFeed;
  }
}
