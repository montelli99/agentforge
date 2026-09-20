/**
 * Activity & Audit Log Entry
 * Section 29: Activity / Audit Log
 */

export type AuditOrigin = "web" | "telegram" | "discord" | "agent" | "system" | "api";

export interface AuditEntry {
  id: string;
  timestamp: string;
  origin: AuditOrigin;
  actorId: string;
  actorType: "user" | "agent" | "system";
  action: string;
  targetType: "task" | "agent" | "contract" | "approval" | "message" | "file" | "model" | "worktree";
  targetId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
}
