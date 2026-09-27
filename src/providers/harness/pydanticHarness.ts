/**
 * Optional Pydantic AI Execution Engine
 * Section 5: Planned harness target #2.
 * No Python service adapter is implemented; contract simulation is test-only and opt-in.
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
import type { PydanticHttpExecutor } from "./pydanticHttpExecutor.js";

export class PydanticHarnessProvider implements HarnessProvider {
  readonly id = "pydantic";
  readonly capabilities: HarnessCapabilities;

  constructor(private readonly simulationEnabled = false, private readonly executor?: PydanticHttpExecutor) {
    this.capabilities = { supportsStreaming: false, supportsTools: Boolean(executor), supportsMCP: false, supportsPauseResume: false, supportsContextCompaction: false, supportedRuntimes: executor ? ["pydantic-http"] : [] };
  }

  private sessions = new Map<string, HarnessSession>();
  private sessionStates = new Map<string, HarnessState>();
  private activeStreams = new Map<string, HarnessEvent[]>();

  isConfigured(): boolean {
    return Boolean(this.executor);
  }

  getStatus(): "NOT_CONFIGURED" | "ACTIVE" {
    return this.executor ? "ACTIVE" : "NOT_CONFIGURED";
  }

  async startSession(config: HarnessSessionConfig): Promise<HarnessSession> {
    const sessionId = `pydantic-sess-${crypto.randomUUID().slice(0, 8)}`;
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
        payload: { harness: "pydantic", agentId: config.agentId },
        timestamp: new Date().toISOString(),
      },
    ]);

    return session;
  }

  async resumeSession(sessionId: string): Promise<HarnessSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Pydantic session ${sessionId} not found`);
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
      throw new Error(`Pydantic session ${sessionId} not found`);
    }

    if (this.executor) {
      const startTime = Date.now();
      try {
        const result = await this.executor.executeTask({ session, task });
        const state = this.sessionStates.get(sessionId);
        if (state) { state.messageCount += 1; state.totalTokens += result.tokensUsed?.total ?? 0; state.lastActive = new Date().toISOString(); }
        return { taskId: task.taskId, sessionId, status: "success", output: result.output, tokensUsed: result.tokensUsed, durationMs: Date.now() - startTime };
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
        error: "Pydantic execution is unavailable: no Pydantic service adapter is implemented. No task was executed.",
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    const state = this.sessionStates.get(sessionId);
    if (state) {
      state.messageCount += 1;
      state.totalTokens += 200;
      state.lastActive = new Date().toISOString();
    }

    return {
      taskId: task.taskId,
      sessionId,
      status: "success",
      output: `[Pydantic AI Execution Engine] Structured output validated for task: ${task.taskId}`,
      tokensUsed: { prompt: 140, completion: 60, total: 200 },
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
    }
  }

  async getState(sessionId: string): Promise<HarnessState> {
    const state = this.sessionStates.get(sessionId);
    if (!state) {
      throw new Error(`Pydantic session ${sessionId} not found`);
    }
    return state;
  }

  async shutdown(): Promise<void> {
    this.sessions.clear();
    this.sessionStates.clear();
    this.activeStreams.clear();
  }
}
