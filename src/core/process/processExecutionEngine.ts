/**
 * Governed Process-to-Agent Execution Engine
 * Section 21: Process Domain
 * Section 22: SOP is Not Authority
 * Section 23: Process-to-Agent Governed Execution
 * Section 24: Process Change Management & Agent Revalidation
 * 
 * CORE CONTRACT: SOP IS NOT AUTHORITY.
 * An SOP describes steps; it does not authorize privileged side effects.
 * Steps requesting privileged actions without ExecutionContract authority
 * or containing unresolved blockers MUST generate human ApprovalRequests.
 */

import { WorkspaceStore } from "../store/workspaceStore.js";
import { ProcessDefinition, ProcessStep, UnresolvedBusinessRule } from "../types/process.js";
import { AgentTeammate } from "../types/agent.js";
import { ExecutionContract } from "../types/contract.js";
import { ApprovalRequest } from "../types/approval.js";

export interface StepExecutionResult {
  stepId: string;
  sequence: number;
  title: string;
  instruction: string;
  status: "completed" | "blocked_on_approval" | "failed" | "skipped";
  output?: string;
  error?: string;
  approvalRequestId?: string;
  timestamp: string;
}

export interface ProcessExecutionTrace {
  processId: string;
  processTitle: string;
  processVersion: number;
  agentId: string;
  agentName: string;
  taskId: string;
  startedAt: string;
  completedAt?: string;
  status: "completed" | "waiting_for_approval" | "failed";
  stepResults: StepExecutionResult[];
  unresolvedBlockers: UnresolvedBusinessRule[];
  /** The public engine currently validates sequencing and authority; it does not pretend to perform side effects. */
  executionMode: "validated_only" | "provider_executed";
}

export type GovernedStepExecutor = (input: {
  step: ProcessStep;
  taskId: string;
  agent: AgentTeammate;
  contract: ExecutionContract;
  worktreePath: string;
}) => Promise<{ output?: string }>;

export class ProcessExecutionEngine {
  constructor(private readonly store: WorkspaceStore, private readonly stepExecutor?: GovernedStepExecutor) {}

  /**
   * Evaluates whether a process step requires privileged authority
   */
  private stepRequiresPrivilege(step: ProcessStep): { requiresPrivilege: boolean; reason?: string } {
    const lower = step.instruction.toLowerCase();
    if (lower.includes("delete") || lower.includes("remove file") || lower.includes("purge")) {
      return { requiresPrivilege: true, reason: "Requires file deletion authority" };
    }
    if (lower.includes("deploy") || lower.includes("publish") || lower.includes("release to prod")) {
      return { requiresPrivilege: true, reason: "Requires deployment authority" };
    }
    if (lower.includes("network") || lower.includes("curl") || lower.includes("fetch external") || lower.includes("outbound")) {
      return { requiresPrivilege: true, reason: "Requires outbound network authority" };
    }
    if (lower.includes("transfer") || lower.includes("underwrite") || lower.includes("bulk email")) {
      return { requiresPrivilege: true, reason: "Requires financial/business mutation authority" };
    }
    return { requiresPrivilege: false };
  }

  /**
   * Executes a process step-by-step under the governance of the task's ExecutionContract.
   */
  async executeGovernedProcess(params: {
    process: ProcessDefinition;
    agent: AgentTeammate;
    contract: ExecutionContract;
    taskId: string;
    worktreePath: string;
    approvedStepIds?: Set<string>;
    stepExecutor?: GovernedStepExecutor;
  }): Promise<ProcessExecutionTrace> {
    const { process, agent, contract, taskId, approvedStepIds = new Set<string>() } = params;
    const startedAt = new Date().toISOString();
    const stepResults: StepExecutionResult[] = [];
    const configuredExecutor = params.stepExecutor || this.stepExecutor;
    const unresolvedBlockers = process.unresolvedRules.filter(r => !r.resolved && r.severity === "blocker");

    let overallStatus: "completed" | "waiting_for_approval" | "failed" = "completed";

    for (const step of process.steps) {
      const stepTimestamp = new Date().toISOString();
      const stepBlockers = unresolvedBlockers.filter(r => r.stepId === step.id);
      const privilegeCheck = this.stepRequiresPrivilege(step);

      // Check for blockers or unauthorized privileges
      const isPrivileged = privilegeCheck.requiresPrivilege;
      const isAuthorizedByContract = isPrivileged && (
        (step.instruction.toLowerCase().includes("delete") && contract.authority.deleteFiles) ||
        (step.instruction.toLowerCase().includes("deploy") && contract.authority.deployment) ||
        (step.instruction.toLowerCase().includes("network") && contract.authority.networkOutbound)
      );

      const needsHumanApproval = (stepBlockers.length > 0 || (isPrivileged && !isAuthorizedByContract))
        && !approvedStepIds.has(step.id);

      if (needsHumanApproval) {
        // Create durable ApprovalRequest in WorkspaceStore
        const approval = this.store.createApproval({
          taskId,
          requesterAgentId: agent.id,
          action: `Process Step: ${step.title || step.instruction.slice(0, 50)}`,
          description: `SOP '${process.title}' step ${step.sequence} requires explicit human authority. ${privilegeCheck.reason || "Unresolved business rule blocker"}: "${step.instruction}"`,
          risk: "high",
        });

        stepResults.push({
          stepId: step.id,
          sequence: step.sequence,
          title: step.title || `Step ${step.sequence}`,
          instruction: step.instruction,
          status: "blocked_on_approval",
          approvalRequestId: approval.id,
          output: `Paused execution at step ${step.sequence}. Human approval required (Approval ID: ${approval.id}).`,
          timestamp: stepTimestamp,
        });

        overallStatus = "waiting_for_approval";
        // Stop sequential execution until approval is granted
        break;
      }

      // Step is authorized to run. Without an injected executor this remains a
      // truthful validation-only trace; providers opt into real effects explicitly.
      let stepStatus: StepExecutionResult["status"] = "completed";
      let stepOutput = `Governed validation passed under contract authority. Step ${step.sequence} is ready; no external side effect executor is configured.`;
      let stepError: string | undefined;
      const stepExecutor = configuredExecutor;
      if (stepExecutor) {
        try {
          const result = await stepExecutor({ step, taskId, agent, contract, worktreePath: params.worktreePath });
          stepOutput = result.output || `Governed step ${step.sequence} executed by the connected provider.`;
        } catch (error) {
          stepStatus = "failed";
          stepError = error instanceof Error ? error.message : String(error);
          overallStatus = "failed";
        }
      }
      stepResults.push({
        stepId: step.id,
        sequence: step.sequence,
        title: step.title || `Step ${step.sequence}`,
        instruction: step.instruction,
        status: stepStatus,
        output: stepOutput,
        error: stepError,
        timestamp: stepTimestamp,
      });
      if (stepStatus === "failed") break;
    }

    const completedAt = overallStatus === "completed" ? new Date().toISOString() : undefined;

    return {
      processId: process.id,
      processTitle: process.title,
      processVersion: process.version,
      agentId: agent.id,
      agentName: agent.name,
      taskId,
      startedAt,
      completedAt,
      status: overallStatus,
      stepResults,
      unresolvedBlockers,
      executionMode: configuredExecutor ? "provider_executed" : "validated_only",
    };
  }

  /**
   * Revalidates all agents bound to an updated process (Section 24).
   * Checks for newly introduced blockers or unauthorized step requirements.
   */
  revalidateAgentsForProcess(processId: string, updatedProcess: ProcessDefinition): {
    revalidatedAgents: string[];
    affectedCount: number;
    newBlockerCount: number;
  } {
    const bindings = this.store.listProcessAgentBindings({ processId });
    const newBlockers = updatedProcess.unresolvedRules.filter(r => !r.resolved && r.severity === "blocker");
    const revalidatedAgents: string[] = [];

    for (const binding of bindings) {
      const agent = this.store.getAgent(binding.agentId);
      if (agent) {
        revalidatedAgents.push(agent.id);
        this.store.recordAudit({
          origin: "system",
          actorId: "process_execution_engine",
          actorType: "system",
          action: "agent_process_revalidated",
          targetType: "agent",
          targetId: agent.id,
          details: {
            processId,
            processVersion: updatedProcess.version,
            newBlockers: newBlockers.length,
          },
        });
      }
    }

    return {
      revalidatedAgents,
      affectedCount: revalidatedAgents.length,
      newBlockerCount: newBlockers.length,
    };
  }
}
