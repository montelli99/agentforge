/**
 * Identity & Unified Permissions
 * Section 11 & 17: Identity + RBAC
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
  passwordHash?: string;
  salt?: string;
  status?: "active" | "suspended" | "pending";
  externalIdentities: ExternalIdentity[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  permissions: string[];
  status: "active" | "suspended" | "pending";
  externalIdentities: ExternalIdentity[];
  createdAt: string;
  updatedAt: string;
}
