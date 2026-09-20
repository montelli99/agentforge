/**
 * Identity & Unified Permissions
 * Section 17: Identity
 * Permissions follow the USER across Web, Telegram, Discord, CLI, and API.
 */

export type UserRole = "owner" | "admin" | "engineer" | "operator" | "viewer";

export interface ExternalIdentity {
  provider: "telegram" | "discord" | "github" | "google";
  externalUserId: string;
  externalUsername?: string;
  linkedAt: string;
}

export interface AgentForgeUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  permissions: string[];
  externalIdentities: ExternalIdentity[];
  createdAt: string;
  updatedAt: string;
}
