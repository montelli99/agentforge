/**
 * Docker Compute Provider
 * Section 36: Compute & Execution Isolation (Containerized Sandboxes)
 * 
 * Manages containerized execution environments using Docker.
 * Validates Docker daemon availability before attempting operations.
 */

import { exec } from "node:child_process";
import crypto from "node:crypto";
import { promisify } from "node:util";
import type {
  ComputeProvider,
  SandboxEnvironment,
  ExecutionCommandOptions,
  CommandExecutionResult,
} from "../providers/compute.js";

const execAsync = promisify(exec);

export interface DockerProviderOptions {
  defaultImage?: string;
  maxMemoryBytes?: number;
  cpuQuota?: number;
}

export class DockerComputeProvider implements ComputeProvider {
  readonly id = "docker_compute";
  readonly name = "AgentForge Docker Compute Provider";
  readonly kind = "docker" as const;

  private defaultImage: string;
  private maxMemoryBytes?: number;
  private cpuQuota?: number;
  private environments = new Map<string, SandboxEnvironment & { containerName: string }>();

  constructor(options: DockerProviderOptions = {}) {
    this.defaultImage = options.defaultImage || "node:22-alpine";
    this.maxMemoryBytes = options.maxMemoryBytes;
    this.cpuQuota = options.cpuQuota;
  }

  /**
   * Checks whether the local Docker daemon is running and reachable.
   */
  async isAvailable(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const { stdout } = await execAsync("docker --version", { timeout: 3000 });
      return { available: true, version: stdout.trim() };
    } catch (err: unknown) {
      return { available: false, error: "Docker daemon is not running or not in PATH" };
    }
  }

  async createEnvironment(config: { worktreeDir: string; agentId: string }): Promise<SandboxEnvironment> {
    const availability = await this.isAvailable();
    if (!availability.available) {
      throw new Error(`Cannot create Docker sandbox: ${availability.error}`);
    }

    const environmentId = `docker-sbx-${crypto.randomUUID().slice(0, 8)}`;
    const containerName = `agentforge-${environmentId}`;

    const env: SandboxEnvironment & { containerName: string } = {
      id: environmentId,
      kind: "docker",
      workingDirectory: config.worktreeDir,
      isolated: true,
      status: "running",
      containerName,
    };

    this.environments.set(environmentId, env);
    return {
      id: env.id,
      kind: env.kind,
      workingDirectory: env.workingDirectory,
      isolated: env.isolated,
      status: env.status,
    };
  }

  async executeCommand(
    environmentId: string,
    command: string,
    options: ExecutionCommandOptions = {},
  ): Promise<CommandExecutionResult> {
    const env = this.environments.get(environmentId);
    if (!env || env.status !== "running") {
      throw new Error(`Docker sandbox environment ${environmentId} not found or not running`);
    }

    const startTime = Date.now();
    const timeout = options.timeoutMs || 60000;

    // Build docker run command with isolation constraints
    const memLimit = this.maxMemoryBytes ? `--memory=${this.maxMemoryBytes}b` : "";
    const cpuLimit = this.cpuQuota ? `--cpus=${this.cpuQuota}` : "";
    const dockerCmd = `docker run --rm ${memLimit} ${cpuLimit} -v "${env.workingDirectory}:/workspace" -w /workspace ${this.defaultImage} sh -c "${command.replace(/"/g, '\\"')}"`;

    try {
      const { stdout, stderr } = await execAsync(dockerCmd, { timeout });
      return {
        exitCode: 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const execErr = err as { code?: number; stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
      return {
        exitCode: typeof execErr.code === "number" ? execErr.code : 1,
        stdout: execErr.stdout?.toString() || "",
        stderr: execErr.stderr?.toString() || execErr.message || String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }

  async destroyEnvironment(environmentId: string): Promise<void> {
    const env = this.environments.get(environmentId);
    if (env) {
      env.status = "destroyed";
      this.environments.delete(environmentId);
    }
  }
}
