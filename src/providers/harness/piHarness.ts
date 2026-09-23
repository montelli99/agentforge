/**
 * Pi Harness Provider
 * Section 5: Planned harness target #1.
 * Contract behavior is available only as an explicit test simulation; the Pi SDK is not integrated.
 */

import crypto from "node:crypto";
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

export class PiHarnessProvider implements HarnessProvider {
  readonly id = "pi";
  readonly capabilities: HarnessCapabilities = {
    supportsStreaming: false,
    supportsTools: false,
    supportsMCP: false,
    supportsPauseResume: false,
    supportsContextCompaction: false,
    supportedRuntimes: [],
  };

  constructor(private readonly simulationEnabled = false) {}

  private sessions = new Map<string, HarnessSession>();
  private sessionStates = new Map<string, HarnessState>();
  private activeStreams = new Map<string, HarnessEvent[]>();

  async startSession(config: HarnessSessionConfig): Promise<HarnessSession> {
    const sessionId = `pi-sess-${crypto.randomUUID().slice(0, 8)}`;
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
        payload: { harness: "pi", agentId: config.agentId },
        timestamp: new Date().toISOString(),
      },
    ]);

    return session;
  }

  async resumeSession(sessionId: string): Promise<HarnessSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Pi session ${sessionId} not found`);
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
      throw new Error(`Pi session ${sessionId} not found`);
    }

    if (!this.simulationEnabled) {
      return {
        taskId: task.taskId,
        sessionId,
        status: "failure",
        output: "",
        error: "Pi execution is unavailable: the official Pi harness integration is not installed. No task was executed.",
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    const state = this.sessionStates.get(sessionId);
    if (state) {
      state.messageCount += 1;
      state.totalTokens += 150;
      state.lastActive = new Date().toISOString();
    }

    // Record stream event
    const events = this.activeStreams.get(sessionId) || [];
    events.push({
      sessionId,
      taskId: task.taskId,
      type: "task_completed",
      payload: { instruction: task.instruction },
      timestamp: new Date().toISOString(),
    });

    // Handle timeout enforcement
    if (task.timeoutMs !== undefined && task.timeoutMs <= 0) {
      events.push({
        sessionId,
        taskId: task.taskId,
        type: "error",
        payload: { error: `Task execution timed out (limit: ${task.timeoutMs}ms)` },
        timestamp: new Date().toISOString(),
      });
      return {
        taskId: task.taskId,
        sessionId,
        status: "failure",
        output: "",
        error: `Task execution timed out (limit: ${task.timeoutMs}ms)`,
        durationMs: 0,
      };
    }

    return {
      taskId: task.taskId,
      sessionId,
      status: "success",
      output: `[Pi Harness] Successfully executed instruction: ${task.instruction.slice(0, 100)}`,
      tokensUsed: { prompt: 100, completion: 50, total: 150 },
      durationMs: Date.now() - startTime,
    };
  }

  async invokeTool(sessionId: string, toolName: string, args: Record<string, unknown>): Promise<{ result: unknown }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Pi session ${sessionId} not found`);
    }

    if (!this.simulationEnabled) {
      throw new Error("Pi tool execution is unavailable: the official Pi harness integration is not installed.");
    }

    const events = this.activeStreams.get(sessionId) || [];
    events.push({
      sessionId,
      type: "tool_call",
      payload: { tool: toolName, args },
      timestamp: new Date().toISOString(),
    });

    const result = { executed: true, tool: toolName, output: `Tool '${toolName}' executed cleanly via Pi harness protocol.` };
    events.push({
      sessionId,
      type: "tool_result",
      payload: { tool: toolName, result },
      timestamp: new Date().toISOString(),
    });

    return { result };
  }

  getReadinessDetails(): { readiness: string; blocker: string; candidateTier: string } {
    return {
      readiness: "TEST_IMPLEMENTATION",
      candidateTier: "Planned harness target (not implemented)",
      blocker: "The official Pi integration is not implemented; only an explicitly enabled contract simulation is available.",
    };
  }

  async *streamEvents(sessionId: string): AsyncIterable<HarnessEvent> {
    const events = this.activeStreams.get(sessionId) || [];
    for (const evt of events) {
      yield evt;
    }
  }

  async cancelTask(sessionId: string, taskId: string): Promise<void> {
    const events = this.activeStreams.get(sessionId) || [];
    events.push({
      sessionId,
      taskId,
      type: "status_change",
      payload: { status: "cancelled" },
      timestamp: new Date().toISOString(),
    });
  }

  async getState(sessionId: string): Promise<HarnessState> {
    const state = this.sessionStates.get(sessionId);
    if (!state) {
      throw new Error(`Pi session ${sessionId} not found`);
    }
    return state;
  }

  async shutdown(): Promise<void> {
    this.sessions.clear();
    this.sessionStates.clear();
    this.activeStreams.clear();
  }
}
