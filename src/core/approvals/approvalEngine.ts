/**
 * Canonical Approval Engine
 * Section 28: Approvals
 * Single canonical approval state synchronized in real time across Web, Telegram, and Discord.
 */

import crypto from "node:crypto";
import type {
  ApprovalRequest,
  ApprovalStatus,
  InteractionInterface,
  RiskLevel,
} from "../types/approval.js";

export type ApprovalChangeListener = (approval: ApprovalRequest) => void;

export class ApprovalEngine {
  private approvals = new Map<string, ApprovalRequest>();
  private listeners: ApprovalChangeListener[] = [];

  createApprovalRequest(params: {
    taskId: string;
    requesterAgentId: string;
    action: string;
    description: string;
    risk: RiskLevel;
    evidenceSummary?: {
      filesCount: number;
      testsPassed: boolean;
      diffSnippet?: string;
    };
    expiresInHours?: number;
  }): ApprovalRequest {
    const id = `appr-${crypto.randomUUID().slice(0, 8)}`;
    const expiresAt = params.expiresInHours
      ? new Date(Date.now() + params.expiresInHours * 3600000).toISOString()
      : undefined;

    const request: ApprovalRequest = {
      id,
      taskId: params.taskId,
      requesterAgentId: params.requesterAgentId,
      action: params.action,
      description: params.description,
      risk: params.risk,
      status: "pending",
      evidenceSummary: params.evidenceSummary,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    this.approvals.set(id, request);
    this.notify(request);
    return request;
  }

  resolveApproval(params: {
    approvalId: string;
    status: "approved" | "rejected";
    approverUserId: string;
    decisionOrigin: InteractionInterface;
    decisionNotes?: string;
  }): ApprovalRequest {
    const request = this.approvals.get(params.approvalId);
    if (!request) {
      throw new Error(`Approval request ${params.approvalId} not found`);
    }
    if (request.status !== "pending") {
      throw new Error(`Approval request ${params.approvalId} is already ${request.status}`);
    }

    request.status = params.status;
    request.approverUserId = params.approverUserId;
    request.decisionOrigin = params.decisionOrigin;
    request.decisionNotes = params.decisionNotes;
    request.decidedAt = new Date().toISOString();

    this.notify(request);
    return request;
  }

  getApproval(id: string): ApprovalRequest | undefined {
    return this.approvals.get(id);
  }

  listPending(): ApprovalRequest[] {
    return Array.from(this.approvals.values()).filter(a => a.status === "pending");
  }

  onApprovalChange(listener: ApprovalChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(approval: ApprovalRequest): void {
    for (const listener of this.listeners) {
      try {
        listener(approval);
      } catch {
        // Prevent listener exception from breaking the approval state machine
      }
    }
  }
}
