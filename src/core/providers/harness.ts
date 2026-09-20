/**
 * HarnessProvider Interface
 * Section 5: Harness Strategy
 * Top two targets: Pi, Pydantic AI Harness, plus AgentForge Native.
 */

export interface HarnessCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsMCP: boolean;
  supportsPauseResume: boolean;
  supportsContextCompaction: boolean;
  supportedRuntimes: string[];
}

export interface HarnessSessionConfig {
  agentId: string;
  taskId?: string;
  systemPrompt: string;
  tools?: Array<{ name: string; description: string; parameters: unknown }>;
  contextWindow?: number;
  environmentVars?: Record<string, string>;
  worktreeDir?: string;
}

export interface HarnessSession {
  sessionId: string;
  harnessId: string;
  agentId: string;
  taskId?: string;
  status: "active" | "idle" | "paused" | "terminated";
  createdAt: string;
}

export interface HarnessTaskPayload {
  taskId: string;
  instruction: string;
  inputFiles?: string[];
  context?: Record<string, unknown>;
}

export interface HarnessTaskResult {
  taskId: string;
  sessionId: string;
  status: "success" | "failure" | "cancelled";
  output: string;
  tokensUsed?: { prompt: number; completion: number; total: number };
  durationMs: number;
  filesModified?: string[];
  error?: string;
}

export type HarnessEventType =
  | "session_started"
  | "token"
  | "tool_call"
  | "tool_result"
  | "status_change"
  | "task_completed"
  | "error";

export interface HarnessEvent {
  sessionId: string;
  taskId?: string;
  type: HarnessEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface HarnessState {
  sessionId: string;
  status: "active" | "idle" | "paused" | "terminated";
  messageCount: number;
  totalTokens: number;
  lastActive: string;
}

export interface HarnessProvider {
  readonly id: string;
  readonly capabilities: HarnessCapabilities;

  startSession(config: HarnessSessionConfig): Promise<HarnessSession>;
  resumeSession(sessionId: string): Promise<HarnessSession>;
  executeTask(sessionId: string, task: HarnessTaskPayload): Promise<HarnessTaskResult>;
  streamEvents(sessionId: string): AsyncIterable<HarnessEvent>;
  cancelTask(sessionId: string, taskId: string): Promise<void>;
  getState(sessionId: string): Promise<HarnessState>;
  shutdown(): Promise<void>;
}
