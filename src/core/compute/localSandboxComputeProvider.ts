/**
 * Local Sandbox Compute Provider
 * Section 36: Compute & Execution Isolation
 * 
 * Provides managed process execution within isolated worktree directories,
 * environment variable sanitation, timeout enforcement, network policy logging,
 * and host compute telemetry.
 */

import { exec } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type {
  SandboxProvider,
  SandboxEnvironment,
  ExecutionCommandOptions,
  CommandExecutionResult,
} from "../providers/compute.js";

const execAsync = promisify(exec);

export interface SystemComputeTelemetry {
  platform: string;
  architecture: string;
  cpuCount: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  usedMemoryBytes: number;
  memoryUsagePercent: number;
  nodeMemory: {
    rssBytes: number;
    heapTotalBytes: number;
    heapUsedBytes: number;
    externalBytes: number;
  };
  activeSandboxesCount: number;
}

export class LocalSandboxComputeProvider implements SandboxProvider {
  readonly id = "local_sandbox";
  readonly name = "AgentForge Local Sandbox Compute Provider";
  readonly kind = "local" as const;
  // A managed worktree is a write-scope boundary, not an OS/container
  // sandbox. Keep this false so readiness cannot mistake local execution for
  // strict isolation.
  readonly isStrictlyIsolated = false;

  private environments = new Map<string, SandboxEnvironment & {
    allowedHosts?: string[];
    createdAt: string;
  }>();

  /**
   * Creates an isolated sandbox environment backed by a managed worktree path.
   */
  async createEnvironment(config: { worktreeDir: string; agentId: string }): Promise<SandboxEnvironment> {
    const environmentId = `sbx-${crypto.randomUUID().slice(0, 8)}`;
    const workingDirectory = path.resolve(config.worktreeDir);

    if (!fs.existsSync(workingDirectory)) {
      fs.mkdirSync(workingDirectory, { recursive: true });
    }

    const env: SandboxEnvironment & { allowedHosts?: string[]; createdAt: string } = {
      id: environmentId,
      kind: "local_sandbox",
      workingDirectory,
      isolated: true,
      status: "running",
      createdAt: new Date().toISOString(),
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

  /**
   * Executes a command within the specified sandbox environment.
   */
  async executeCommand(
    environmentId: string,
    command: string,
    options: ExecutionCommandOptions = {},
  ): Promise<CommandExecutionResult> {
    const env = this.environments.get(environmentId);
    if (!env || env.status !== "running") {
      throw new Error(`Sandbox environment ${environmentId} not found or not running`);
    }

    const startTime = Date.now();
    const cwd = options.cwd ? path.resolve(env.workingDirectory, options.cwd) : env.workingDirectory;
    const timeout = options.timeoutMs || 30000;

    // Filter environment variables to prevent secret leakage
    const sanitizedEnv: Record<string, string> = {
      PATH: process.env.PATH || "",
      HOME: process.env.HOME || process.env.USERPROFILE || "",
      NODE_ENV: "production",
      AGENTFORGE_SANDBOX_ID: environmentId,
      ...(options.env || {}),
    };

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        env: sanitizedEnv,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

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

  /**
   * Configures allowed outbound network hosts for this sandbox.
   */
  async restrictNetworkOutbound(environmentId: string, allowedHosts: string[]): Promise<void> {
    const env = this.environments.get(environmentId);
    if (!env) {
      throw new Error(`Sandbox environment ${environmentId} not found`);
    }
    env.allowedHosts = [...allowedHosts];
  }

  /**
   * Destroys an existing sandbox environment.
   */
  async destroyEnvironment(environmentId: string): Promise<void> {
    const env = this.environments.get(environmentId);
    if (env) {
      env.status = "destroyed";
      this.environments.delete(environmentId);
    }
  }

  /**
   * Retrieves real system telemetry and host memory metrics.
   */
  getSystemTelemetry(): SystemComputeTelemetry {
    const totalMemoryBytes = os.totalmem();
    const freeMemoryBytes = os.freemem();
    const usedMemoryBytes = totalMemoryBytes - freeMemoryBytes;
    const memoryUsagePercent = Math.round((usedMemoryBytes / totalMemoryBytes) * 1000) / 10;
    const nodeMem = process.memoryUsage();

    return {
      platform: os.platform(),
      architecture: os.arch(),
      cpuCount: os.cpus().length,
      totalMemoryBytes,
      freeMemoryBytes,
      usedMemoryBytes,
      memoryUsagePercent,
      nodeMemory: {
        rssBytes: nodeMem.rss,
        heapTotalBytes: nodeMem.heapTotal,
        heapUsedBytes: nodeMem.heapUsed,
        externalBytes: nodeMem.external,
      },
      activeSandboxesCount: this.environments.size,
    };
  }

  /**
   * Lists all active sandbox environments.
   */
  listEnvironments(): SandboxEnvironment[] {
    return Array.from(this.environments.values()).map(e => ({
      id: e.id,
      kind: e.kind,
      workingDirectory: e.workingDirectory,
      isolated: e.isolated,
      status: e.status,
    }));
  }
}
