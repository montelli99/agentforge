/**
 * AgentForge Harness Native Execution Provider
 * Section 6: AgentForge Native Harness
 * Built around execution contracts, policy enforcement, durability, worktree isolation,
 * verification, evidence, and provider routing.
 */

import crypto from "node:crypto";
import { redactRuntimeError } from "../../core/secret/runtimeRedaction.js";
import type {
  HarnessProvider,
  HarnessCapabilities,
  HarnessSessionConfig,
  HarnessSession,
  HarnessTaskPayload,
  HarnessTaskResult,
  HarnessEvent,
  HarnessState,
} from "../../core/providers/harness.js";
import { ContractEnforcer } from "../../core/contract/contractEnforcer.js";
import type { NativeComputeExecutor } from "./nativeComputeExecutor.js";

export class AgentForgeNativeHarnessProvider implements HarnessProvider {
  readonly id = "agentforge_native";
  readonly capabilities: HarnessCapabilities;

  constructor(private readonly simulationEnabled = false, private readonly executor?: NativeComputeExecutor) {
    this.capabilities = { supportsStreaming: false, supportsTools: Boolean(executor), supportsMCP: false, supportsPauseResume: Boolean(executor), supportsContextCompaction: false, supportedRuntimes: executor ? ["agentforge-compute"] : [] };
  }

  private contractEnforcer = new ContractEnforcer();
  private sessions = new Map<string, HarnessSession>();
  private sessionStates = new Map<string, HarnessState>();
  private activeStreams = new Map<string, HarnessEvent[]>();

  async startSession(config: HarnessSessionConfig): Promise<HarnessSession> {
    const sessionId = `af-native-sess-${crypto.randomUUID().slice(0, 8)}`;
    const session: HarnessSession = {
      sessionId,
      harnessId: this.id,
      agentId: config.agentId,
      taskId: config.taskId,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    this.sessionStates.set(sessionId, {
      sessionId,
      status: "active",
      messageCount: 0,
      totalTokens: 0,
      lastActive: new Date().toISOString(),
    });
    this.activeStreams.set(sessionId, [
      {
        sessionId,
        taskId: config.taskId,
        type: "session_started",
        payload: { harness: "agentforge_native", simulationOnly: true },
        timestamp: new Date().toISOString(),
      },
    ]);

    if (this.executor) await this.executor.createSession({ session });

    return session;
  }

  async resumeSession(sessionId: string): Promise<HarnessSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`AgentForge native session ${sessionId} not found`);
    }
    session.status = "active";
    const state = this.sessionStates.get(sessionId);
    if (state) {
      state.status = "active";
      state.lastActive = new Date().toISOString();
    }
    return session;
  }

  async executeTask(sessionId: string, task: HarnessTaskPayload): Promise<HarnessTaskResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`AgentForge native session ${sessionId} not found`);
    }

    const events = this.activeStreams.get(sessionId) || [];
    const startTime = Date.now();

    // Enforce the contract before either simulation or a real executor can run.
    if (task.contract && task.inputFiles && task.inputFiles.length > 0) {
      const validation = this.contractEnforcer.validateFileModifications(task.contract, task.inputFiles);
      if (!validation.allowed) {
        const errorMsg = `Contract boundary violation: ${validation.violations.map(v => v.description).join("; ")}`;
        events.push({
          sessionId,
          taskId: task.taskId,
          type: "error",
          payload: { error: errorMsg, violations: validation.violations },
          timestamp: new Date().toISOString(),
        });
        return {
          taskId: task.taskId,
          sessionId,
          status: "failure",
          output: "",
          error: errorMsg,
          durationMs: Date.now() - startTime,
        };
      }
    }

    if (this.executor) {
      if (!task.contract) {
        return {
          taskId: task.taskId,
          sessionId,
          status: "failure",
          output: "",
          error: "Native execution requires an execution contract.",
          durationMs: Date.now() - startTime,
        };
      }
      try {
        const result = await this.executor.executeTask({ session, task });
        return { taskId: task.taskId, sessionId, status: "success", output: result.output, filesModified: result.filesModified, durationMs: Date.now() - startTime };
      } catch (error) {
        return { taskId: task.taskId, sessionId, status: "failure", output: "", error: redactRuntimeError(error), durationMs: Date.now() - startTime };
      }
    }
    if (!this.simulationEnabled) {
      return {
        taskId: task.taskId,
        sessionId,
        status: "failure",
        output: "",
        error: "AgentForge Harness has no execution backend configured. No task was executed.",
        durationMs: 0,
      };
    }

    // Enforce timeouts
    if (task.timeoutMs !== undefined && task.timeoutMs <= 0) {
      return {
        taskId: task.taskId,
        sessionId,
        status: "failure",
        output: "",
        error: `Task execution timed out (limit: ${task.timeoutMs}ms)`,
        durationMs: 0,
      };
    }

    const state = this.sessionStates.get(sessionId);
    if (state) {
      state.messageCount += 1;
      state.totalTokens += 120;
      state.lastActive = new Date().toISOString();
    }

    events.push({
      sessionId,
      taskId: task.taskId,
      type: "task_completed",
      payload: { instruction: task.instruction },
      timestamp: new Date().toISOString(),
    });

    return {
      taskId: task.taskId,
      sessionId,
      status: "success",
      output: `[AgentForge Native] Task executed within isolated boundary: ${task.instruction.slice(0, 100)}`,
      tokensUsed: { prompt: 80, completion: 40, total: 120 },
      durationMs: Date.now() - startTime,
    };
  }

  async *streamEvents(sessionId: string): AsyncIterable<HarnessEvent> {
    const events = this.activeStreams.get(sessionId) || [];
    for (const evt of events) {
      yield evt;
    }
  }

  async cancelTask(sessionId: string, taskId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "idle";
      const events = this.activeStreams.get(sessionId);
      if (events) {
        events.push({
          sessionId,
          taskId,
          type: "status_change",
          payload: { status: "cancelled" },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  async getState(sessionId: string): Promise<HarnessState> {
    const state = this.sessionStates.get(sessionId);
    if (!state) {
      throw new Error(`AgentForge native session ${sessionId} not found`);
    }
    return state;
  }

  async shutdown(): Promise<void> {
    if (this.executor) await this.executor.shutdown();
    this.sessions.clear();
    this.sessionStates.clear();
    this.activeStreams.clear();
  }
}
