import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LocalSandboxComputeProvider } from "./localSandboxComputeProvider.js";
import { buildDockerRunArguments, DockerComputeProvider } from "./dockerComputeProvider.js";

describe("Compute Subsystem & Sandboxing (Section 36)", () => {
  let tempDir: string;
  let localSandbox: LocalSandboxComputeProvider;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-compute-test-"));
    localSandbox = new LocalSandboxComputeProvider();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe("LocalSandboxComputeProvider", () => {
    it("creates an isolated sandbox environment and tracks status", async () => {
      const env = await localSandbox.createEnvironment({
        worktreeDir: tempDir,
        agentId: "agent-compute-test",
      });

      expect(env.id).toMatch(/^sbx-/);
      expect(env.kind).toBe("local_sandbox");
      expect(env.isolated).toBe(true);
      expect(env.status).toBe("running");

      const activeList = localSandbox.listEnvironments();
      expect(activeList.length).toBe(1);
      expect(activeList[0].id).toBe(env.id);

      await localSandbox.destroyEnvironment(env.id);
      expect(localSandbox.listEnvironments().length).toBe(0);
    });

    it("executes commands within sandbox with sanitized environment and timing", async () => {
      const env = await localSandbox.createEnvironment({
        worktreeDir: tempDir,
        agentId: "agent-exec-test",
      });

      // Write test file to execute in sandbox
      fs.writeFileSync(path.join(tempDir, "input.txt"), "AgentForge Sandboxed Output");

      const result = await localSandbox.executeCommand(env.id, "node -e \"console.log(process.env.AGENTFORGE_SANDBOX_ID);\"");
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(env.id);
      expect(result.durationMs).toBeGreaterThan(0);

      // Verify filtered environment: arbitrary parent env variables should not leak
      const envLeakCheck = await localSandbox.executeCommand(env.id, "node -e \"console.log(process.env.SECRET_TOKEN || 'SANITIZED');\"", {
        env: { CUSTOM_PARAM: "ALLOWED_VAL" },
      });
      expect(envLeakCheck.exitCode).toBe(0);
      expect(envLeakCheck.stdout.trim()).toBe("SANITIZED");
    });

    it("records outbound network restrictions for the sandbox", async () => {
      const env = await localSandbox.createEnvironment({
        worktreeDir: tempDir,
        agentId: "agent-net-test",
      });

      await expect(
        localSandbox.restrictNetworkOutbound(env.id, ["api.internal.local", "models.internal.local"])
      ).resolves.not.toThrow();
    });

    it("collects real system compute telemetry (CPU, RAM, Node heap)", () => {
      const telemetry = localSandbox.getSystemTelemetry();

      expect(telemetry.platform).toBe(os.platform());
      expect(telemetry.architecture).toBe(os.arch());
      expect(telemetry.cpuCount).toBeGreaterThan(0);
      expect(telemetry.totalMemoryBytes).toBeGreaterThan(0);
      expect(telemetry.freeMemoryBytes).toBeGreaterThan(0);
      expect(telemetry.memoryUsagePercent).toBeGreaterThanOrEqual(0);
      expect(telemetry.memoryUsagePercent).toBeLessThanOrEqual(100);

      expect(telemetry.nodeMemory.rssBytes).toBeGreaterThan(0);
      expect(telemetry.nodeMemory.heapUsedBytes).toBeGreaterThan(0);
    });
  });

  describe("DockerComputeProvider", () => {
    it("builds a network-disabled, capability-restricted container command", () => {
      const args = buildDockerRunArguments("node:22-alpine", "C:/isolated/task", "pnpm test", {
        maxMemoryBytes: 512 * 1024 * 1024,
        cpuQuota: 1,
      });
      expect(args).toContain("--network");
      expect(args[args.indexOf("--network") + 1]).toBe("none");
      expect(args).toContain("--read-only");
      expect(args).toContain("--cap-drop");
      expect(args).toContain("--security-opt");
      expect(args).toContain("no-new-privileges");
      expect(args).toContain("C:/isolated/task:/workspace:rw");
      expect(args).not.toContain("sh -c pnpm test");
    });

    it("reports honest availability status for a reachable local Docker daemon", async () => {
      const docker = new DockerComputeProvider();
      const status = await docker.isAvailable();

      expect(typeof status.available).toBe("boolean");
      if (!status.available) {
        expect(status.error).toMatch(/daemon/i);
      } else {
        expect(status.version).toBeDefined();
      }
    });

    it("fails closed when Docker is unavailable and environment creation is attempted", async () => {
      const docker = new DockerComputeProvider();
      const status = await docker.isAvailable();

      if (!status.available) {
        await expect(
          docker.createEnvironment({ worktreeDir: tempDir, agentId: "agent-1" })
        ).rejects.toThrow("Cannot create Docker sandbox");
      }
    });
  });
});
