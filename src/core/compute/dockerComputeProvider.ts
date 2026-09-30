/**
 * Docker Compute Provider
 * Section 36: Compute & Execution Isolation (Containerized Sandboxes)
 * 
 * Manages containerized execution environments using Docker.
 * Validates Docker daemon availability before attempting operations.
 */

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { promisify } from "node:util";
import type {
  ComputeProvider,
  SandboxEnvironment,
  ExecutionCommandOptions,
  CommandExecutionResult,
} from "../providers/compute.js";

const execFileAsync = promisify(execFile);

export interface DockerProviderOptions {
  defaultImage?: string;
  maxMemoryBytes?: number;
  cpuQuota?: number;
}

/**
 * Container arguments are kept data-only to avoid shell interpolation. The task
 * workspace is the only writable mount; container networking is disabled.
 */
export function buildDockerRunArguments(
  image: string,
  worktreePath: string,
  command: string,
  options: Pick<DockerProviderOptions, "maxMemoryBytes" | "cpuQuota">,
): string[] {
  const args = [
    "run", "--rm",
    "--network", "none",
    "--read-only",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--pids-limit", "256",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
  ];
  if (options.maxMemoryBytes) args.push(`--memory=${options.maxMemoryBytes}b`);
  if (options.cpuQuota) args.push(`--cpus=${options.cpuQuota}`);
  args.push("-v", `${worktreePath}:/workspace:rw`, "-w", "/workspace", image, "sh", "-lc", command);
  return args;
}

export class DockerComputeProvider implements ComputeProvider {
  readonly id = "docker_compute";
  readonly name = "AgentForge Docker Compute Provider";
  readonly kind = "docker" as const;

  private defaultImage: string;
  private maxMemoryBytes?: number;
  private cpuQuota?: number;
  private environments = new Map<string, SandboxEnvironment & { containerName: string; cleanupError?: string }>();
  private activeCommands = new Map<string, { controller: AbortController; finished: Promise<void> }>();

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
      // Desktop Docker can take several seconds to answer while waking up.
      const { stdout } = await execFileAsync("docker", ["info", "--format", "{{.ServerVersion}}"], { timeout: 15000 });
      return { available: true, version: stdout.trim() };
    } catch (err: unknown) {
      return { available: false, error: "Docker daemon is not running, reachable, or authorized for this user." };
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
    if (options.signal?.aborted) throw new Error("Command was cancelled before execution.");
    if (this.activeCommands.has(environmentId)) throw new Error("A command is already running in this environment.");

    const startTime = Date.now();
    const timeout = options.timeoutMs || 60000;

    const dockerArgs = buildDockerRunArguments(this.defaultImage, env.workingDirectory, command, {
      maxMemoryBytes: this.maxMemoryBytes,
      cpuQuota: this.cpuQuota,
    });
    // Killing the Docker client alone does not stop a detached container. Give
    // every run a known name and remove it before releasing the environment.
    const containerName = `${env.containerName}-${crypto.randomUUID().slice(0, 8)}`;
    dockerArgs.splice(1, 0, "--name", containerName);
    dockerArgs[0] = "create";
    dockerArgs.splice(dockerArgs.indexOf("--rm"), 1);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener("abort", cancel, { once: true });
    let finish!: () => void;
    const finished = new Promise<void>(resolve => { finish = resolve; });
    this.activeCommands.set(environmentId, { controller, finished });

    try {
      // Creation does not execute task code. Wait for its acknowledgement before
      // starting so cancellation cannot race a still-being-created container.
      await execFileAsync("docker", dockerArgs, { timeout: 10000, maxBuffer: 1024 * 1024 });
      if (controller.signal.aborted) throw new Error("Command was cancelled before container start.");
      const { stdout, stderr } = await execFileAsync("docker", ["start", "--attach", containerName], { timeout, signal: controller.signal, maxBuffer: 10 * 1024 * 1024 });
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
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      try {
        await execFileAsync("docker", ["rm", "--force", containerName], { timeout: 10000, maxBuffer: 1024 * 1024 });
      } catch (error) {
        const detail = error as { stderr?: string | Buffer; message?: string };
        // A failed create can leave no container. Other failures must remain
        // visible: a stopped client is not proof of stopped execution.
        if (!/No such container/i.test(detail.stderr?.toString() || "")) {
          env.status = "stopped";
          env.cleanupError = `Container cleanup could not be confirmed: ${detail.stderr?.toString() || detail.message}`;
          throw new Error(env.cleanupError);
        }
      } finally {
        this.activeCommands.delete(environmentId);
        finish();
      }
    }
  }

  async destroyEnvironment(environmentId: string): Promise<void> {
    const env = this.environments.get(environmentId);
    if (env) {
      env.status = "stopped";
      const active = this.activeCommands.get(environmentId);
      active?.controller.abort();
      if (active) await active.finished;
      if (env.cleanupError) throw new Error(env.cleanupError);
      env.status = "destroyed";
      this.environments.delete(environmentId);
    }
  }
}
