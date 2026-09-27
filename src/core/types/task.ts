/**
 * Canonical Task & Worktree Binding
 */

import type { ExecutionContract } from "./contract.js";
import type { EvidencePack } from "./evidence.js";
import type { ApprovedPlanRecord } from "../runtime/approvedPlanProvider.js";
import type { ApprovedExecutionPlan } from "../runtime/contractedDockerExecutionBackend.js";

export type TaskStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "verification_running"
  | "waiting_approval"
  | "paused"
  | "approved"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskWorktreeInfo {
  worktreePath: string;
  branchName: string;
  baseSha: string;
  headSha?: string;
  isIsolated: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;

  assignedAgentId?: string;
  originChannelId?: string;
  originThreadId?: string;

  contract: ExecutionContract;
  processId?: string;
  worktree?: TaskWorktreeInfo;
  evidencePack?: EvidencePack;
  approvedExecutionPlan?: ApprovedPlanRecord;
  /** Last model-generated draft; never treated as approval or executable authority. */
  executionPlanDraft?: ApprovedExecutionPlan;

  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
