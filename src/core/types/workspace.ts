/**
 * Canonical Workspace Hierarchy
 * Workspace -> Space -> Channel -> Thread -> Message
 * 
 * Shared across Web, Telegram, Discord, CLI, and API.
 */

export interface CanonicalWorkspace {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalSpace {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  provider: "agentforge" | "telegram" | "discord";
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChannelVisibility = "public" | "private" | "agent_only";

export interface CanonicalChannel {
  id: string;
  workspaceId: string;
  spaceId: string;
  name: string;
  topic?: string;
  visibility: ChannelVisibility;
  archived: boolean;
  provider: "agentforge" | "telegram" | "discord";
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalThread {
  id: string;
  channelId: string;
  title?: string;
  starterMessageId?: string;
  externalThreadId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  sha256?: string;
}

export interface CanonicalMessage {
  id: string;
  channelId: string;
  threadId?: string;
  authorId: string;
  authorType: "user" | "agent" | "system";
  content: string;
  attachments?: MessageAttachment[];
  replyToMessageId?: string;
  externalMessageId?: string;
  externalProvider?: "telegram" | "discord" | "web" | "api";
  createdAt: string;
  updatedAt: string;
}
