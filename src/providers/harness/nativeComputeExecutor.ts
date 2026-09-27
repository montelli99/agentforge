import type { ComputeProvider, SandboxEnvironment } from "../../core/providers/compute.js";
import type { HarnessSession, HarnessTaskPayload } from "../../core/providers/harness.js";

/** Executes an explicitly approved command through AgentForge's compute provider. */
export class NativeComputeExecutor {
  private readonly environments = new Map<string, SandboxEnvironment>();
  constructor(private readonly compute: ComputeProvider, private readonly worktreeDir: string) {}

  async createSession(input: { session: HarnessSession }): Promise<void> {
    const environment = await this.compute.createEnvironment({ worktreeDir: this.worktreeDir, agentId: input.session.agentId });
    this.environments.set(input.session.sessionId, environment);
  }

  async executeTask(input: { session: HarnessSession; task: HarnessTaskPayload }): Promise<{ output: string; filesModified?: string[] }> {
    const environment = this.environments.get(input.session.sessionId);
    if (!environment) throw new Error("Native compute session is not initialized.");
    const command = typeof input.task.context?.command === "string" ? input.task.context.command.trim() : "";
    if (!command) throw new Error("Native execution requires an explicitly approved command in task context.");
    const result = await this.compute.executeCommand(environment.id, command, { timeoutMs: input.task.timeoutMs });
    if (result.exitCode !== 0) throw new Error(`Native command failed with exit code ${result.exitCode}: ${result.stderr}`);
    return { output: result.stdout, filesModified: [] };
  }

  async shutdown(): Promise<void> {
    for (const environment of this.environments.values()) await this.compute.destroyEnvironment(environment.id);
    this.environments.clear();
  }
}
