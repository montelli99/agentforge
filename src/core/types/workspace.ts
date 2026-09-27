/**
 * Canonical Workspace Hierarchy
 * Workspace -> Space -> Channel -> Thread -> Message
 * 
 * Shared across Web, Telegram, Discord, CLI, and API.
 */

export type WorkspaceExperience = "command" | "workspace" | "studio";

export interface CanonicalWorkspace {
  id: string;
  name: string;
  /** Reversible presentation path; it never changes projects, people, or work. */
  experience?: WorkspaceExperience;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalSpace {
  instructions?: string;
  repositoryPath?: string;
  repositoryAccess?: { rootPath: string; mode: "read"; grantedBy: string; grantedAt: string; device: number; inode: number };
  archived?: boolean;
  id: string;
  workspaceId: string;
  /** Optional parent department/space, enabling nested business areas. */
  parentSpaceId?: string;
  name: string;
  description?: string;
  provider: "agentforge" | "telegram" | "discord" | "slack" | "web" | "cli" | "api";
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
  provider: "agentforge" | "telegram" | "discord" | "slack" | "web" | "cli" | "api";
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalThread {
  id: string;
  channelId: string;
  title?: string;
  archived?: boolean;
  pinned?: boolean;
  starterMessageId?: string;
  parentThreadId?: string;
  parentMessageId?: string;
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
  revisions?: Array<{ content: string; editedAt: string; editedBy: string }>;
  generation?: { model: string; provider: string; status: "complete" | "stopped" | "failed"; promptMessageId: string; contextMemories?: Array<{ id: string; title: string; version: number }> };
  externalMessageId?: string;
  externalProvider?: "telegram" | "discord" | "slack" | "web" | "api" | "cli";
  createdAt: string;
  updatedAt: string;
}
