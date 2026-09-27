import crypto from "node:crypto";
import type { Task } from "../types/task.js";
import type { ApprovedExecutionPlan, ExecutionPlanProvider } from "./contractedDockerExecutionBackend.js";

export interface ApprovedPlanRecord {
  plan: ApprovedExecutionPlan;
  contractDigest: string;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
}

/** Stable serialization binds approval to the full contract, not just its ID. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return '{' + Object.keys(record).filter(key => record[key] !== undefined).sort()
      .map(key => JSON.stringify(key) + ':' + canonical(record[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

export function executionContractDigest(task: Task): string {
  return crypto.createHash('sha256').update(canonical(task.contract)).digest('hex');
}

/** Storage is supplied by the control plane; model output alone is never approval. */
export class ApprovedPlanProvider implements ExecutionPlanProvider {
  constructor(private readonly read: (taskId: string) => Promise<ApprovedPlanRecord | undefined>) {}

  getReadiness(): { ready: boolean } { return { ready: true }; }

  async getPlan(task: Task): Promise<ApprovedExecutionPlan> {
    const record = await this.read(task.id);
    if (!record) throw new Error('Review and approve an execution plan before running this task.');
    if (record.plan.taskId !== task.id || record.plan.source !== 'human_approved' || !record.approvedBy?.trim()) {
      throw new Error('Execution plan has no valid human approval for this task.');
    }
    const approved = Date.parse(record.approvedAt);
    const expires = Date.parse(record.expiresAt);
    if (!Number.isFinite(approved) || !Number.isFinite(expires) || approved > Date.now() || expires <= Date.now() || expires <= approved) {
      throw new Error('Execution plan approval has expired or has invalid dates.');
    }
    if (record.contractDigest !== executionContractDigest(task)) {
      throw new Error('Task boundaries changed after approval. Review the execution plan again.');
    }
    if (!Array.isArray(record.plan.commands) || !record.plan.commands.length || record.plan.commands.some(command =>
      typeof command.command !== 'string' || !command.command.trim() || typeof command.checkName !== 'string' || !command.checkName.trim()
      || (command.timeoutMs !== undefined && (!Number.isSafeInteger(command.timeoutMs) || command.timeoutMs < 1 || command.timeoutMs > 3600000)))) {
      throw new Error('Execution plan contains invalid commands or time limits.');
    }
    return structuredClone(record.plan);
  }
}
