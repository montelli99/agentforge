/**
 * ChannelProvider Interface
 * Sections 12, 13, 18, 19: Bidirectional Workspace Mirror & Remote Control Surface
 * Bridges Web, Telegram, Discord, CLI, and API into canonical objects.
 */

import type { CanonicalMessage, CanonicalChannel, CanonicalSpace } from "../types/workspace.js";
import type { ApprovalRequest } from "../types/approval.js";

export type ChannelProviderType = "web" | "telegram" | "discord" | "cli" | "api";

export interface InboundChannelEvent {
  id: string; // provider event id for deduplication
  provider: ChannelProviderType;
  eventType: "message" | "topic_created" | "topic_renamed" | "topic_closed" | "action_button_clicked" | "command";
  externalWorkspaceId: string;
  externalSpaceId?: string;
  externalChannelId: string;
  externalThreadId?: string;
  externalUserId: string;
  externalUsername?: string;
  payload: {
    text?: string;
    command?: string;
    commandArgs?: string[];
    actionId?: string; // e.g. "approve_task", "reject_task", "view_diff"
    actionPayload?: Record<string, unknown>;
    replyToExternalMessageId?: string;
    mediaUrl?: string;
  };
  timestamp: string;
}

export interface OutboundChannelMessage {
  canonicalChannelId: string;
  canonicalThreadId?: string;
  text: string;
  replyToMessageId?: string;
  interactiveActions?: Array<{
    id: string;
    label: string;
    style?: "primary" | "secondary" | "danger";
    payload: Record<string, unknown>;
  }>;
  attachments?: Array<{
    filename: string;
    url: string;
    mimeType: string;
  }>;
}

export interface OutboundTopicUpdate {
  canonicalSpaceId: string;
  canonicalChannelId: string;
  action: "create" | "rename" | "close" | "reopen";
  title?: string;
}

export interface ChannelProvider {
  readonly id: string;
  readonly type: ChannelProviderType;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Outbound communication
  sendMessage(message: OutboundChannelMessage): Promise<{ externalMessageId: string }>;
  updateTopic?(update: OutboundTopicUpdate): Promise<{ externalTopicId: string }>;
  postApprovalCard?(channelId: string, approval: ApprovalRequest): Promise<{ externalMessageId: string }>;

  // Inbound handler registration
  onEvent(handler: (event: InboundChannelEvent) => Promise<void>): void;
}
