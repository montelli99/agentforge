/**
 * Activity & Audit Log Entry
 * Section 29: Activity / Audit Log
 */

export type AuditOrigin = "web" | "telegram" | "discord" | "cli" | "agent" | "system" | "api";

export interface AuditEntry {
  id: string;
  timestamp: string;
  origin: AuditOrigin;
  actorId: string;
  actorType: "user" | "agent" | "system";
  action: string;
  targetType: "task" | "agent" | "contract" | "approval" | "message" | "file" | "model" | "worktree" | "channel"
    | "workspace" | "space" | "process" | "process_revision" | "processAgentBinding" | "call" | "package"
    | "installation" | "memory" | "benchmark" | "user" | "system" | "harness";
  targetId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  previousHash?: string;
  hash?: string;
}

export const GENESIS_AUDIT_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

import crypto from "node:crypto";

export function computeAuditHash(entry: {
  id: string;
  timestamp: string;
  origin: string;
  actorId: string;
  actorType: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  previousHash?: string;
}): string {
  const prev = entry.previousHash || GENESIS_AUDIT_HASH;
  const details = entry.details || {};
  const sortedDetails = JSON.stringify(details, Object.keys(details).sort());
  const ip = entry.ipAddress || "";
  const payload = `${prev}:${entry.id}:${entry.timestamp}:${entry.origin}:${entry.actorId}:${entry.actorType}:${entry.action}:${entry.targetType}:${entry.targetId}:${ip}:${sortedDetails}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
