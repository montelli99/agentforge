import { createAgentSession, SessionManager, type AgentSession } from "@earendil-works/pi-coding-agent";
import type { PiHarnessExecutor } from "./piHarness.js";
import type { HarnessSession, HarnessTaskPayload } from "../../core/providers/harness.js";

/**
 * Real Pi SDK executor. It is opt-in: constructing it does not read or store
 * credentials, and Pi itself remains responsible for provider authentication.
 */
export class PiSdkExecutor implements PiHarnessExecutor {
  private readonly sessions = new Map<string, AgentSession>();

  async createSession(input: { session: HarnessSession; systemPrompt: string; worktreeDir?: string }): Promise<void> {
    const { session: piSession } = await createAgentSession({
      cwd: input.worktreeDir,
      sessionManager: SessionManager.inMemory(),
    });
    this.systemPrompts.set(input.session.sessionId, input.systemPrompt);
    this.sessions.set(input.session.sessionId, piSession);
  }
  private readonly systemPrompts = new Map<string, string>();

  async executeTask(input: { session: HarnessSession; task: HarnessTaskPayload }): Promise<{ output: string; tokensUsed?: { prompt: number; completion: number; total: number } }> {
    const session = this.sessions.get(input.session.sessionId);
    if (!session) throw new Error("Pi SDK session has not been created.");
    const prefix = this.systemPrompts.get(input.session.sessionId);
    await session.prompt(prefix ? `${prefix}\n\nTask:\n${input.task.instruction}` : input.task.instruction, { source: "rpc" });
    const output = session.getLastAssistantText() || "";
    const stats = session.getSessionStats();
    const usage = stats?.tokens;
    return {
      output,
      ...(usage ? { tokensUsed: { prompt: usage.input, completion: usage.output, total: usage.input + usage.output } } : {}),
    };
  }

  async shutdown(): Promise<void> {
    for (const session of this.sessions.values()) session.dispose();
    this.sessions.clear();
    this.systemPrompts.clear();
  }
}
