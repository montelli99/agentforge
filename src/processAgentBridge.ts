import crypto from "node:crypto";
import { ProcessCompiler } from "./providers/process/processCompiler.js";
import type { AgentSpecification, ProcessDefinition, ProcessAgentBinding } from "./core/types/process.js";
import type { ExecutionContract } from "./core/types/contract.js";

/**
 * Turns a saved process/agent binding into a reviewable AgentForge task.
 *
 * This is deliberately a preparation boundary: an SOP never grants write,
 * network, or deployment authority and a prepared task is not auto-started.
 * A real worker may execute it only after the normal task approval gates pass.
 */
export class ProcessAgentBridge {
  constructor(private readonly compiler = new ProcessCompiler()) {}

  prepare(params: {
    process: ProcessDefinition;
    binding: ProcessAgentBinding;
    taskId?: string;
    input?: string;
  }): {
    taskId: string;
    processId: string;
    agentId: string;
    specification: AgentSpecification;
    contract: ExecutionContract;
    status: "ready" | "waiting_approval";
    blockers: string[];
    instruction: string;
  } {
    const specification = this.compiler.compile(params.process);
    const taskId = params.taskId || `AF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const blockers = specification.unresolvedRules
      .filter(rule => !rule.resolved)
      .map(rule => rule.question);
    const contract: ExecutionContract = {
      id: `contract-${taskId}`,
      taskId,
      version: 1,
      repository: { baseBranch: "unresolved", baseSha: "unresolved" },
      workspace: { requireIsolatedWorktree: true },
      scope: specification.suggestedExecutionContract.scope,
      authority: specification.suggestedExecutionContract.authority,
      requiredChecks: [
        { type: "diff_scope", required: true },
        { type: "security_scan", required: true },
      ],
      completion: {
        ...specification.suggestedExecutionContract.completion,
        requireHumanApproval: true,
      },
      createdAt: new Date().toISOString(),
    };
    const instruction = params.input?.trim()
      ? `${params.input.trim()}\n\nFollow the '${params.process.title}' process.\n${specification.systemPrompt}`
      : `Follow the '${params.process.title}' process.\n${specification.systemPrompt}`;
    return {
      taskId,
      processId: params.process.id,
      agentId: params.binding.agentId,
      specification,
      contract,
      status: blockers.length ? "waiting_approval" : "ready",
      blockers,
      instruction,
    };
  }
}
