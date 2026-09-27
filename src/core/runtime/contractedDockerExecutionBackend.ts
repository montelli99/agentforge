/**
 * A production-oriented verification backend for AgentForge.
 *
 * It intentionally does not invent a task plan. A plan provider must supply
 * explicitly approved commands, and every command is checked against the task
 * contract before Docker receives it. This makes it useful for local/open-source
 * verification without connecting any personal model or SaaS account.
 */

import type { Task } from "../types/task.js";
import type { CommandAuditRecord, TestResultRecord } from "../types/evidence.js";
import { ContractEnforcer } from "../contract/contractEnforcer.js";
import { DockerComputeProvider } from "../compute/dockerComputeProvider.js";
import type { ExecutionReadiness, TaskExecutionBackend, TaskExecutionOutput } from "./taskWorkerRuntime.js";
import { TaskExecutionCancelledError } from "./taskWorkerRuntime.js";
import { collectGitExecutionEvidence, readGitHeadSha } from "./gitExecutionEvidence.js";
import { collectExecutionArtifacts } from "./executionArtifacts.js";

export interface ApprovedExecutionPlan {
  taskId: string;
  /** "human_approved" is valid for local verification before a model connector exists. */
  source: "human_approved" | "model";
  commands: Array<{ checkName: string; command: string; timeoutMs?: number }>;
}

export interface ExecutionPlanProvider {
  getReadiness(): { ready: boolean; blocker?: string };
  getPlan(task: Task): Promise<ApprovedExecutionPlan>;
}

export interface ContractedDockerExecutionBackendOptions {
  agentId?: string;
}

/**
 * This backend is inert until initialize succeeds. Server startup never calls
 * initialize automatically, preserving the local-first no-side-effects default.
 */
export class ContractedDockerExecutionBackend implements TaskExecutionBackend {
  readonly allowsGovernedProcesses = false;
  private dockerReady = false;
  private dockerBlocker = "Docker capability has not been checked.";
  private readonly contractEnforcer = new ContractEnforcer();

  constructor(
    private readonly docker: DockerComputeProvider,
    private readonly planProvider: ExecutionPlanProvider,
    private readonly options: ContractedDockerExecutionBackendOptions = {},
  ) {}

  async initialize(): Promise<ExecutionReadiness> {
    const availability = await this.docker.isAvailable();
    this.dockerReady = availability.available;
    this.dockerBlocker = availability.available ? "" : availability.error || "Docker is unavailable.";
    return this.getReadiness();
  }

  getReadiness(): ExecutionReadiness {
    const plan = this.planProvider.getReadiness();
    const blockers = [
      ...(plan.ready ? [] : [plan.blocker || "No approved task plan provider is connected."]),
      ...(this.dockerReady ? [] : [this.dockerBlocker]),
    ];
    return {
      ready: blockers.length === 0,
      blockers,
      capabilities: {
        modelPlanning: plan.ready,
        isolatedCompute: this.dockerReady,
        realVerification: this.dockerReady,
        evidenceCollection: this.dockerReady,
      },
    };
  }

  async validateTask(task: Task): Promise<void> {
    if (!task.contract.workspace.requireIsolatedWorktree) throw new Error("Docker task execution requires an isolated worktree.");
    if (task.processId) throw new Error("Approved-command execution does not run process-bound tasks. Review the process execution route separately.");
    this.assertPlan(task, await this.planProvider.getPlan(task));
  }

  async execute(input: { task: Task; worktreePath: string; signal: AbortSignal }): Promise<TaskExecutionOutput> {
    const readiness = this.getReadiness();
    if (!readiness.ready) throw new Error(readiness.blockers.join(" "));
    if (!input.task.contract.workspace.requireIsolatedWorktree) {
      throw new Error("Docker task execution requires an isolated worktree; direct repository writes are not supported.");
    }
    if (input.signal.aborted) throw new TaskExecutionCancelledError();

    const plan = await this.planProvider.getPlan(input.task);
    this.assertPlan(input.task, plan);
    if (input.signal.aborted) throw new TaskExecutionCancelledError();
    // Fail before executing if the contracted revision cannot produce evidence.
    await collectGitExecutionEvidence(input.worktreePath, input.task.contract.repository.baseSha);
    if (input.signal.aborted) throw new TaskExecutionCancelledError();
    const environment = await this.docker.createEnvironment({
      worktreeDir: input.worktreePath,
      agentId: this.options.agentId || input.task.assignedAgentId || "agentforge-worker",
    });
    const commandsExecuted: CommandAuditRecord[] = [];
    const testResults: TestResultRecord[] = [];

    try {
      for (const plannedCommand of plan.commands) {
        if (input.signal.aborted) throw new TaskExecutionCancelledError();
        const startedAt = new Date().toISOString();
        const result = await this.docker.executeCommand(environment.id, plannedCommand.command, {
          timeoutMs: plannedCommand.timeoutMs,
          signal: input.signal,
        });
        if (input.signal.aborted) throw new TaskExecutionCancelledError();
        commandsExecuted.push({
          command: plannedCommand.command,
          cwd: input.worktreePath,
          timestamp: startedAt,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
        });
        testResults.push({
          checkName: plannedCommand.checkName,
          command: plannedCommand.command,
          passed: result.exitCode === 0,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
        });
      }
      const filesChanged = await collectGitExecutionEvidence(input.worktreePath, input.task.contract.repository.baseSha);
      const artifacts = await collectExecutionArtifacts(input.worktreePath, filesChanged);
      const scope = this.contractEnforcer.validateFileModifications(input.task.contract, filesChanged.map(file => file.filePath), input.worktreePath);
      const forbiddenDeletion = !input.task.contract.authority.deleteFiles && filesChanged.some(file => file.status === "deleted");
      const changedLines = filesChanged.reduce((total, file) => total + file.linesAdded + file.linesDeleted, 0);
      const lineLimit = input.task.contract.scope.maxLinesChanged;
      const exceededLines = lineLimit !== undefined && changedLines > lineLimit;
      testResults.push({ checkName: "execution_scope", command: "Verify changed paths against execution contract",
        passed: scope.allowed && !forbiddenDeletion && !exceededLines, exitCode: scope.allowed && !forbiddenDeletion && !exceededLines ? 0 : 1,
        stdout: "", stderr: [...scope.violations.map(violation => violation.description), ...(forbiddenDeletion ? ["File deletion is not authorized."] : []), ...(exceededLines ? [`Changed lines (${changedLines}) exceed contract maximum (${lineLimit}).`] : [])].join("\n"), durationMs: 0 });
      if (input.signal.aborted) throw new TaskExecutionCancelledError();
      // Capture the observed revision as part of the evidence pack. A run is
      // not complete evidence unless the control plane can identify the exact
      // repository state it inspected.
      const finalSha = await readGitHeadSha(input.worktreePath);
      return { commandsExecuted, testResults, filesChanged, artifacts, finalSha };
    } finally {
      await this.docker.destroyEnvironment(environment.id);
    }
  }

  private assertPlan(task: Task, plan: ApprovedExecutionPlan): void {
    if (plan.taskId !== task.id) throw new Error("Approved execution plan does not belong to this task.");
    if (!plan.commands.length) throw new Error("An execution plan must contain at least one command.");
    for (const requiredCheck of task.contract.requiredChecks.filter(check => check.required)) {
      if (!plan.commands.some(command => command.checkName === requiredCheck.type && (!requiredCheck.command || command.command === requiredCheck.command))) {
        throw new Error(`Approved execution plan is missing the contracted check command: ${requiredCheck.type}`);
      }
    }
    for (const plannedCommand of plan.commands) {
      const commandPolicy = this.contractEnforcer.validateBashCommand(plannedCommand.command, task.contract);
      if (!commandPolicy.allowed) throw new Error(commandPolicy.violation || "Execution contract rejected a planned command.");
    }
  }
}
