/**
 * Canonical Approval Object
 * Unified approval state shared across Web, Telegram, Discord, and API.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";
export type InteractionInterface = "web" | "telegram" | "discord" | "api";

export interface ApprovalRequest {
  id: string;
  taskId: string;
  requesterAgentId: string;
  action: string;
  description: string;
  risk: RiskLevel;
  status: ApprovalStatus;

  evidenceSummary?: {
    filesCount: number;
    testsPassed: boolean;
    diffSnippet?: string;
  };

  approverUserId?: string;
  decisionOrigin?: InteractionInterface;
  decisionNotes?: string;
  decidedAt?: string;

  createdAt: string;
  expiresAt?: string;
}
