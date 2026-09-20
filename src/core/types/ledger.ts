/**
 * Durable ExternalBinding and Canonical EventLedger
 * Section 15: External Bindings
 * Section 16: Event Ledger
 */

export type SyncDirection = "bidirectional" | "inbound_only" | "outbound_only";
export type SyncState = "active" | "paused" | "error" | "reconciling";

export interface ExternalBinding {
  id: string;
  provider: "telegram" | "discord" | "slack" | string;

  // External identifiers
  externalWorkspaceId?: string; // e.g. Telegram chat_id or Discord guild_id
  externalSpaceId?: string;
  externalChannelId?: string;   // e.g. Telegram message_thread_id or Discord channel_id
  externalThreadId?: string;
  externalMessageId?: string;

  // Canonical AgentForge identifiers
  agentforgeWorkspaceId: string;
  agentforgeSpaceId?: string;
  agentforgeChannelId?: string;
  agentforgeThreadId?: string;
  agentforgeMessageId?: string;

  syncDirection: SyncDirection;
  syncState: SyncState;
  lastCursor?: string;
  providerVersion?: string;

  createdAt: string;
  updatedAt: string;
}

export type EventStatus =
  | "pending"
  | "accepted"
  | "applied"
  | "delivered"
  | "failed"
  | "dead_letter";

export interface EventLedgerEntry {
  id: string;                    // unique ledger entry sequence id
  eventId: string;               // unique deduplication id (e.g. hash of provider + external id)
  origin: "telegram" | "discord" | "web" | "agent" | "system" | "api";
  eventType: string;             // e.g. "message.created", "channel.created", "approval.resolved"
  payload: Record<string, unknown>;
  status: EventStatus;
  retryCount: number;
  error?: string;
  createdAt: string;
  appliedAt?: string;
}
