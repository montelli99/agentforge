/**
 * AgentForge task worker runtime.
 *
 * This module is deliberately a coordinator, not an executor. A worker can only
 * run after a concrete backend declares every production boundary ready and
 * returns evidence captured from work it actually performed.
 */

import crypto from "node:crypto";
import { redactRuntimeError, redactRuntimeText, redactRuntimeValue } from "../secret/runtimeRedaction.js";
import type { Task, TaskStatus } from "../types/task.js";
import type { ArtifactRecord, CommandAuditRecord, EvidencePack, FileDiffRecord, TestResultRecord } from "../types/evidence.js";
import { sealEvidencePack } from "../evidence/evidencePackIntegrity.js";
import type { WorkspaceStore } from "../store/workspaceStore.js";
import { WorktreeManager } from "../worktree/worktreeManager.js";
import type { CompletionEngine } from "../completion/completionEngine.js";
import { ProcessExecutionEngine, type ProcessExecutionTrace } from "../process/processExecutionEngine.js";
import { buildContextPacket, type ContextPacket, type ContextSource } from "../../contextPacket.js";
import type { MemoryProvider } from "../providers/memory.js";
import type { ProcessStep } from "../types/process.js";
import type { AgentTeammate } from "../types/agent.js";
import type { ExecutionContract } from "../types/contract.js";

export interface ExecutionReadiness {
  ready: boolean;
  /** Every missing boundary is user-facing so a connected label cannot hide risk. */
  blockers: string[];
  capabilities: {
    modelPlanning: boolean;
    isolatedCompute: boolean;
    realVerification: boolean;
    evidenceCollection: boolean;
  };
}

export interface TaskExecutionOutput {
  commandsExecuted: CommandAuditRecord[];
  testResults: TestResultRecord[];
  filesChanged: FileDiffRecord[];
  artifacts: ArtifactRecord[];
  /** The backend may supply a source revision it actually observed. */
  finalSha?: string;
}

/**
 * Implementations own model invocation, effect authorization, isolated command
 * execution, and evidence collection. The runtime never fabricates any of them.
 */
export interface TaskExecutionBackend {
  getReadiness(): ExecutionReadiness;
  validateTask?(task: Task): Promise<void>;
  /** False when all effects must come exclusively from the approved command plan. */
  allowsGovernedProcesses?: boolean;
  /** Optional provider hook for executing an already-authorized process step. */
  executeProcessStep?(input: { step: ProcessStep; taskId: string; agent: AgentTeammate; contract: ExecutionContract; worktreePath: string }): Promise<{ output?: string }>;
  execute(input: { task: Task; worktreePath: string; signal: AbortSignal; contextPacket?: ContextPacket }): Promise<TaskExecutionOutput>;
}

/** Backends throw this only after execution and resource cleanup have settled. */
export class TaskExecutionCancelledError extends Error {
  constructor() { super("Task execution was cancelled."); this.name = "TaskExecutionCancelledError"; }
}

interface ActiveTaskExecution {
  abortController: AbortController;
  startedAt: number;
  settled: Promise<void>;
  stopRequested?: "pause" | "cancel" | "shutdown";
  stopFailure?: string;
}

export interface TaskWorkerOptions {
  repoRoot?: string;
  concurrency?: number;
  pollIntervalMs?: number;
  autoStart?: boolean;
  automaticDispatch?: boolean;
  /** Optional scoped operational memory used to build bounded worker context. */
  memoryProvider?: MemoryProvider;
  memoryNamespace?: string;
}

const NO_EXECUTION_BACKEND: ExecutionReadiness = {
  ready: false,
  blockers: [
    "No execution backend is connected.",
    "Model planning, isolated compute, real verification, and evidence collection must all be configured before tasks can run.",
  ],
  capabilities: { modelPlanning: false, isolatedCompute: false, realVerification: false, evidenceCollection: false },
};

export class TaskWorkerRuntime {
  private activeWorkers = 0;
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private readonly worktreeManager: WorktreeManager;
  private activeTaskExecutions = new Map<string, ActiveTaskExecution>();
  public readonly processExecutionEngine: ProcessExecutionEngine;

  constructor(
    private readonly store: WorkspaceStore,
    private executionBackend?: TaskExecutionBackend,
    private readonly options: TaskWorkerOptions = {},
    public readonly completionEngine?: CompletionEngine,
  ) {
    this.worktreeManager = new WorktreeManager(options.repoRoot || process.cwd());
    this.processExecutionEngine = new ProcessExecutionEngine(store);
    if (options.autoStart) this.start();
  }

  /** Attach a real backend after provider setup without reconstructing the workspace runtime. */
  configureBackend(backend: TaskExecutionBackend): ExecutionReadiness {
    if (this.running) this.stop();
    this.executionBackend = backend;
    const readiness = backend.getReadiness();
    this.store.recordAudit({
      origin: "system", actorId: "system", actorType: "system", action: "TASK_WORKER_BACKEND_CONFIGURED",
      targetType: "system", targetId: "worker-pool", details: { readiness },
    });
    return readiness;
  }

  getExecutionReadiness(): ExecutionReadiness {
    return this.executionBackend?.getReadiness() ?? NO_EXECUTION_BACKEND;
  }

  getExecutionBlockReason(): string | undefined {
    const readiness = this.getExecutionReadiness();
    return readiness.ready ? undefined : readiness.blockers.join(" ");
  }

  canExecuteTasks(): boolean { return this.getExecutionReadiness().ready; }
  getActiveTaskIds(): string[] { return [...this.activeTaskExecutions.keys()]; }

  start(): void {
    if (this.running) return;
    const blockReason = this.getExecutionBlockReason();
    if (blockReason) {
      this.store.recordAudit({
        origin: "system", actorId: "system", actorType: "system", action: "TASK_WORKER_START_BLOCKED",
        targetType: "system", targetId: "worker-pool", details: { reason: blockReason, readiness: this.getExecutionReadiness() },
      });
      return;
    }
    this.running = true;
    this.activeWorkers = this.options.concurrency ?? 2;
    const interval = this.options.pollIntervalMs ?? 2500;
    if (this.options.automaticDispatch !== false) this.pollTimer = setInterval(() => {
      void this.tick().catch(error => console.error("[TaskWorkerRuntime] worker tick failed", error));
    }, interval);
    this.store.recordAudit({
      origin: "system", actorId: "system", actorType: "system", action: "TASK_WORKER_STARTED",
      targetType: "system", targetId: "worker-pool", details: { activeWorkers: this.activeWorkers, intervalMs: interval },
    });
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    for (const execution of this.activeTaskExecutions.values()) {
      execution.stopRequested ??= "shutdown";
      execution.abortController.abort();
    }
    this.activeWorkers = 0;
  }

  isRunning(): boolean { return this.running; }
  getActiveWorkerCount(): number { return this.running && this.canExecuteTasks() ? this.activeWorkers : 0; }
  getActiveTasksCount(): number { return this.activeTaskExecutions.size; }

  async tick(): Promise<void> {
    if (this.options.automaticDispatch === false) return;
    if (!this.running || !this.canExecuteTasks()) return;
    const slots = this.activeWorkers - this.activeTaskExecutions.size;
    if (slots <= 0) return;
    const ready = this.store.listTasks().filter(task => task.status === "ready").slice(0, slots);
    for (const task of ready) {
      if (!this.activeTaskExecutions.has(task.id)) {
        void this.executeTask(task.id).catch(error => console.error(`[TaskWorkerRuntime] task ${task.id} failed`, error));
      }
    }
  }

  async executeTask(taskId: string): Promise<Task> {
    const task = this.requireTask(taskId);
    const blockReason = this.getExecutionBlockReason();
    if (blockReason) throw new Error(blockReason);
    if (!this.executionBackend) throw new Error("Task execution backend is unavailable.");
    if (task.status === "completed" || task.status === "cancelled") return task;
    if (this.activeTaskExecutions.has(taskId)) throw new Error(`Task ${taskId} is already executing`);

    const abortController = new AbortController();
    let settle!: () => void;
    const execution: ActiveTaskExecution = { abortController, startedAt: Date.now(), settled: new Promise<void>(resolve => { settle = resolve; }) };
    this.activeTaskExecutions.set(taskId, execution);
    this.store.updateTask(taskId, { status: "in_progress", startedAt: task.startedAt || new Date().toISOString() });
    this.store.recordAudit({
      origin: "system", actorId: "system", actorType: "system", action: "TASK_EXECUTION_STARTED",
      targetType: "task", targetId: taskId, details: { title: task.title, readiness: this.getExecutionReadiness() },
    });

    try {
      await this.executionBackend.validateTask?.(this.requireTask(taskId));
      if (abortController.signal.aborted) throw new TaskExecutionCancelledError();
      const assignedTask = this.assignFirstAvailableAgent(this.requireTask(taskId));
      const worktreePath = await this.resolveWorktree(assignedTask);
      if (abortController.signal.aborted) throw new TaskExecutionCancelledError();
      const processTrace = this.executionBackend.allowsGovernedProcesses === false
        ? undefined : await this.runGovernedProcess(this.requireTask(taskId), worktreePath);
      if (abortController.signal.aborted) throw new TaskExecutionCancelledError();
      if (processTrace) {
        this.store.recordAudit({
          origin: "system", actorId: "process-execution-engine", actorType: "system",
          action: "PROCESS_EXECUTION_TRACE",
          targetType: "task", targetId: taskId,
          details: { processId: processTrace.processId, status: processTrace.status, executionMode: processTrace.executionMode, stepResults: redactRuntimeValue(processTrace.stepResults) },
        });
      }
      if (processTrace?.status === "waiting_for_approval") {
        return this.store.updateTask(taskId, { status: "waiting_approval" });
      }
      if (processTrace?.status === "failed") {
        return this.store.updateTask(taskId, { status: "failed", error: "A governed process step failed.", completedAt: new Date().toISOString() });
      }

      this.store.updateTask(taskId, { status: "verification_running" });
      const currentTask = this.requireTask(taskId);
      const contextPacket = await this.buildWorkerContext(currentTask);
      this.store.recordAudit({
        origin: "system", actorId: "system", actorType: "system", action: "TASK_CONTEXT_PACKED",
        targetType: "task", targetId: taskId,
        details: { packetId: contextPacket.id, sourceCount: contextPacket.sources.length, originalTokens: contextPacket.originalTokens, packedTokens: contextPacket.packedTokens },
      });
      const output = await this.executionBackend.execute({ task: currentTask, worktreePath, signal: abortController.signal, contextPacket });
      if (abortController.signal.aborted) throw new TaskExecutionCancelledError();
      const evidence = this.createEvidencePack(currentTask, output, processTrace);
      const verifiedPassed = requiredChecksPassedByEvidence(currentTask, output.testResults)
        && output.testResults.every(result => result.passed);
      const finalStatus: TaskStatus = verifiedPassed
        ? (currentTask.contract.completion.requireHumanApproval ? "waiting_approval" : "completed")
        : "failed";

      if (currentTask.contract.completion.requireHumanApproval && verifiedPassed) {
        const approval = this.store.createApproval({
          taskId, requesterAgentId: currentTask.assignedAgentId || "agentforge-orchestrator",
          action: `Approve completed task: ${currentTask.title}`,
          description: `Execution completed with evidence pack ${evidence.id}. Human review is required before merge.`,
          risk: currentTask.priority === "critical" ? "critical" : currentTask.priority === "high" ? "high" : "medium",
        });
        evidence.approvalId = approval.id;
      }

      const updated = this.store.updateTask(taskId, {
        status: finalStatus, evidencePack: { ...evidence, verifiedPassed },
        completedAt: finalStatus === "completed" ? new Date().toISOString() : undefined,
        error: verifiedPassed ? undefined : "A required verification check failed or was not returned by the executor.",
      });
      this.store.recordAudit({
        origin: "system", actorId: "system", actorType: "system", action: `TASK_EXECUTION_${finalStatus.toUpperCase()}`,
        targetType: "task", targetId: taskId, details: { verifiedPassed, evidencePackId: evidence.id },
      });
      return updated;
    } catch (error) {
      if (abortController.signal.aborted && error instanceof TaskExecutionCancelledError) {
        // Control requests own their final state after this execution settles.
        if (execution.stopRequested === "shutdown") {
          return this.store.updateTask(taskId, { status: "paused" });
        }
        return this.requireTask(taskId);
      }
      // Backend failures are just as untrusted as their evidence output. A
      // provider or command can put a credential in an error message, and both
      // the task record and audit ledger are durable surfaces.
      const message = redactRuntimeError(error);
      if (abortController.signal.aborted) execution.stopFailure = message;
      const failed = this.store.updateTask(taskId, { status: "failed", error: message, completedAt: new Date().toISOString() });
      this.store.recordAudit({
        origin: "system", actorId: "system", actorType: "system", action: "TASK_EXECUTION_FAILED",
        targetType: "task", targetId: taskId, details: { error: message },
      });
      return failed;
    } finally {
      this.activeTaskExecutions.delete(taskId);
      settle();
    }
  }

  private async buildWorkerContext(task: Task): Promise<ContextPacket> {
    const sources: ContextSource[] = [{ id: task.id, kind: "goal", text: `${task.title}\n${task.description}` }];
    const memory = this.options.memoryProvider;
    if (!memory) return buildContextPacket(sources);
    const queryText = `${task.title} ${task.description}`.slice(0, 2_000);
    let records = await memory.query({
      namespace: this.options.memoryNamespace || "workspace",
      queryText,
      projectId: task.projectId,
      limit: 12,
    });
    if (!records.length) records = await memory.query({
      namespace: this.options.memoryNamespace || "workspace",
      categories: ["do_not_repeat", "project_constraint", "test_failure"],
      projectId: task.projectId,
      limit: 8,
    });
    for (const { record } of records) sources.push({
      id: record.id,
      kind: record.category === "approval" ? "decision" as const : record.category === "artifact" ? "evidence" as const : "memory" as const,
      updatedAt: record.updatedAt || record.createdAt,
      text: `${record.title}\n${record.content}`,
    });
    return buildContextPacket(sources);
  }

  async pauseTask(taskId: string): Promise<Task> {
    const task = this.requireTask(taskId);
    if (["completed", "cancelled"].includes(task.status)) throw new Error("Finished tasks cannot be paused.");
    await this.settleControl(taskId, "pause");
    const updated = this.store.updateTask(taskId, { status: "paused" });
    this.store.recordAudit({ origin: "web", actorId: "operator", actorType: "user", action: "TASK_PAUSED", targetType: "task", targetId: taskId, details: { previousStatus: task.status } });
    return updated;
  }

  async resumeTask(taskId: string): Promise<Task> {
    const task = this.requireTask(taskId);
    if (this.activeTaskExecutions.has(taskId)) throw new Error("Task execution has not stopped yet.");
    if (task.status !== "paused") throw new Error("Only paused tasks can be resumed.");
    const reason = this.getExecutionBlockReason();
    if (reason) throw new Error(reason);
    this.store.updateTask(taskId, { status: "ready" });
    this.store.recordAudit({ origin: "web", actorId: "operator", actorType: "user", action: "TASK_RESUMED", targetType: "task", targetId: taskId, details: { previousStatus: task.status } });
    return this.executeTask(taskId);
  }

  async cancelTask(taskId: string): Promise<Task> {
    const task = this.requireTask(taskId);
    if (task.status === "completed") throw new Error("Completed tasks cannot be cancelled.");
    await this.settleControl(taskId, "cancel");
    // Preserve partial work for review. Cancellation is not permission to delete it.
    const updated = this.store.updateTask(taskId, { status: "cancelled", completedAt: new Date().toISOString() });
    this.store.recordAudit({ origin: "web", actorId: "operator", actorType: "user", action: "TASK_CANCELLED", targetType: "task", targetId: taskId, details: { previousStatus: task.status } });
    return updated;
  }

  async retryTask(taskId: string): Promise<Task> {
    const task = this.requireTask(taskId);
    if (this.activeTaskExecutions.has(taskId)) throw new Error("Task execution has not stopped yet.");
    if (!["failed", "cancelled"].includes(task.status)) throw new Error("Only failed or cancelled tasks can be retried.");
    const reason = this.getExecutionBlockReason();
    if (reason) throw new Error(reason);
    this.store.updateTask(taskId, { status: "ready", error: undefined, evidencePack: undefined, completedAt: undefined });
    this.store.recordAudit({ origin: "web", actorId: "operator", actorType: "user", action: "TASK_RETRIED", targetType: "task", targetId: taskId, details: { previousStatus: task.status } });
    return this.executeTask(taskId);
  }

  private async settleControl(taskId: string, request: "pause" | "cancel"): Promise<void> {
    const execution = this.activeTaskExecutions.get(taskId);
    if (!execution) return;
    if (execution.stopRequested && execution.stopRequested !== request) throw new Error("Another stop request is still being completed.");
    execution.stopRequested = request;
    execution.abortController.abort();
    await execution.settled;
    if (execution.stopFailure) throw new Error(`Execution did not stop cleanly: ${execution.stopFailure}`);
  }

  private requireTask(taskId: string): Task {
    const task = this.store.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    return task;
  }

  private assignFirstAvailableAgent(task: Task): Task {
    if (task.assignedAgentId) return task;
    const agent = this.store.listAgents()[0];
    return agent ? this.store.updateTask(task.id, { assignedAgentId: agent.id }) : task;
  }

  private async resolveWorktree(task: Task): Promise<string> {
    if (!task.contract.workspace.requireIsolatedWorktree) return this.options.repoRoot || process.cwd();
    if (task.worktree?.worktreePath) {
      return this.worktreeManager.validateWorktree(task.worktree, task.id, task.contract.repository.baseSha);
    }
    if (!/^[a-f0-9]{40,64}$/i.test(task.contract.repository.baseSha)) {
      throw new Error("An isolated task requires a full immutable base commit before execution.");
    }
    const worktree = await this.worktreeManager.createWorktree({
      taskId: task.id, branchName: `worktree/${task.id}`,
      baseBranch: task.contract.repository.baseSha,
    });
    this.store.updateTask(task.id, { worktree });
    return worktree.worktreePath;
  }

  private async runGovernedProcess(task: Task, worktreePath: string): Promise<ProcessExecutionTrace | undefined> {
    const agent = task.assignedAgentId ? this.store.getAgent(task.assignedAgentId) : undefined;
    const processId = task.processId || (agent ? this.store.listProcessAgentBindings({ agentId: agent.id })[0]?.processId : undefined);
    const process = processId ? this.store.getProcess(processId) : undefined;
    if (!process || !agent) return undefined;
    const executeStep = this.executionBackend?.executeProcessStep;
    return this.processExecutionEngine.executeGovernedProcess({
      process, agent, contract: task.contract, taskId: task.id, worktreePath,
      stepExecutor: executeStep ? input => executeStep.call(this.executionBackend, input) : undefined,
    });
  }

  private createEvidencePack(task: Task, output: TaskExecutionOutput, processTrace?: ProcessExecutionTrace): EvidencePack {
    return sealEvidencePack({
      id: `ev-${crypto.randomUUID()}`, taskId: task.id,
      agentId: task.assignedAgentId || "agentforge-orchestrator", objective: task.title,
      contractId: task.contract.id, baseSha: task.worktree?.baseSha || task.contract.repository?.baseSha || "UNKNOWN",
      finalSha: output.finalSha || task.worktree?.headSha, filesChanged: output.filesChanged.map(file => ({ ...file, patch: file.patch ? redactRuntimeText(file.patch) : undefined })),
      diffStat: {
        filesCount: output.filesChanged.length,
        insertions: output.filesChanged.reduce((total, file) => total + file.linesAdded, 0),
        deletions: output.filesChanged.reduce((total, file) => total + file.linesDeleted, 0),
      },
      commandsExecuted: output.commandsExecuted.map(command => ({ ...command, command: redactRuntimeText(command.command), cwd: redactRuntimeText(command.cwd) })),
      testResults: output.testResults.map(result => ({ ...result, command: redactRuntimeText(result.command), stdout: redactRuntimeText(result.stdout), stderr: redactRuntimeText(result.stderr) })), artifacts: output.artifacts,
      processExecution: processTrace ? {
        processId: processTrace.processId,
        status: processTrace.status,
        executionMode: processTrace.executionMode,
        stepResults: processTrace.stepResults.map(step => ({ stepId: step.stepId, status: step.status, output: step.output ? redactRuntimeText(step.output) : undefined, error: step.error ? redactRuntimeText(step.error) : undefined })),
      } : undefined,
      generatedAt: new Date().toISOString(), verifiedPassed: false,
    });
  }
}

function requiredChecksPassedByEvidence(task: Task, testResults: TestResultRecord[]): boolean {
  return task.contract.requiredChecks
    .filter(check => check.required)
    .every(check => testResults.some(result => result.checkName === check.type && result.passed
      && (!check.command || result.command === check.command)));
}
