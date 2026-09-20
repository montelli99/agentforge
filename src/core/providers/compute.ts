/**
 * ComputeProvider & SandboxProvider Interfaces
 * Section 24: Agent Computers & Sandboxing
 */

export interface ExecutionCommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface CommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface SandboxEnvironment {
  id: string;
  kind: "local_workspace" | "local_sandbox" | "docker" | "cloud";
  workingDirectory: string;
  isolated: boolean;
  status: "running" | "stopped" | "destroyed";
}

export interface ComputeProvider {
  readonly id: string;
  readonly name: string;
  readonly kind: "local" | "docker" | "cloud";

  createEnvironment(config: { worktreeDir: string; agentId: string }): Promise<SandboxEnvironment>;
  executeCommand(environmentId: string, command: string, options?: ExecutionCommandOptions): Promise<CommandExecutionResult>;
  destroyEnvironment(environmentId: string): Promise<void>;
}

export interface SandboxProvider extends ComputeProvider {
  readonly isStrictlyIsolated: boolean;
  restrictNetworkOutbound(environmentId: string, allowedHosts: string[]): Promise<void>;
  takeSnapshot?(environmentId: string): Promise<{ snapshotId: string }>;
}
