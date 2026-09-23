import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WorkspaceStore } from "../store/workspaceStore.js";
import { TaskWorkerRuntime } from "./taskWorkerRuntime.js";
import { AgentForgeWebServer } from "../../server/webServer.js";
import type { Task } from "../types/task.js";

describe("TaskWorkerRuntime & Server Integration", () => {
  let store: WorkspaceStore;
  let runtime: TaskWorkerRuntime;

  beforeEach(() => {
    store = new WorkspaceStore();
    runtime = new TaskWorkerRuntime(store, undefined, {
      repoRoot: process.cwd(),
      autoStart: false,
    });
  });

  afterEach(() => {
    runtime.stop();
  });

  it("initializes with honest initial state and fails closed without a production backend", () => {
    // Without simulationMode, isRunning must remain false after start() — the block fires
    expect(runtime.isRunning()).toBe(false);
    expect(runtime.getActiveWorkerCount()).toBe(0);
    expect(runtime.getActiveTasksCount()).toBe(0);

    // Calling start without a real backend must not set the running flag
    runtime.start();
    expect(runtime.isRunning()).toBe(false);
    expect(runtime.getActiveWorkerCount()).toBe(0);
    expect(runtime.canExecuteTasks()).toBe(false);

    // The block reason must be present and descriptive
    const reason = runtime.getExecutionBlockReason();
    expect(reason).toBeDefined();
    expect(reason).toMatch(/no production execution backend/i);

    // Stop is idempotent even when not started
    runtime.stop();
    expect(runtime.isRunning()).toBe(false);
  });

  it("executeTask is fail-closed — throws when no production backend is connected", async () => {
    const task = store.createTask({
      id: "TASK-FAILCLOSED",
      title: "Attempt task without backend",
      priority: "medium",
      status: "ready",
      contract: {
        id: "contract-failclosed",
        taskId: "TASK-FAILCLOSED",
        version: 1,
        repository: { baseBranch: "vnext", baseSha: "abc1234" },
        workspace: { requireIsolatedWorktree: false },
        scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
        authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
        requiredChecks: [{ type: "unit_tests", required: true }],
        completion: { requireEvidencePack: true, requireHumanApproval: false },
        createdAt: new Date().toISOString(),
      },
    });

    await expect(runtime.executeTask(task.id)).rejects.toThrow(/no production execution backend/i);
    // Task should NOT have been moved to completed
    expect(["ready", "backlog"].includes(store.getTask(task.id)?.status ?? "")).toBe(true);
  });

  it("simulationMode unlocks the runtime for isolated unit test execution", async () => {
    const simRuntime = new TaskWorkerRuntime(store, undefined, {
      repoRoot: process.cwd(),
      autoStart: false,
      simulationMode: true,
    });

    try {
      simRuntime.start();
      expect(simRuntime.isRunning()).toBe(true);
      expect(simRuntime.getActiveWorkerCount()).toBe(2);
      expect(simRuntime.canExecuteTasks()).toBe(true);
      expect(simRuntime.getExecutionBlockReason()).toBeUndefined();

      const task = store.createTask({
        id: "TASK-SIM-E2E",
        title: "Simulation mode end-to-end task execution",
        priority: "high",
        status: "ready",
        contract: {
          id: "contract-sim-e2e",
          taskId: "TASK-SIM-E2E",
          version: 1,
          repository: { baseBranch: "vnext", baseSha: "abc1234" },
          workspace: { requireIsolatedWorktree: false },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: [
            { type: "unit_tests", command: "npm test", required: true },
            { type: "diff_scope", required: true },
          ],
          completion: { requireEvidencePack: true, requireHumanApproval: false },
          createdAt: new Date().toISOString(),
        },
      });

      const completed = await simRuntime.executeTask(task.id);
      expect(completed.status).toBe("completed");
      expect(completed.completedAt).toBeDefined();
      expect(completed.evidencePack).toBeDefined();

      const ev = completed.evidencePack!;
      expect(ev.taskId).toBe(task.id);
      expect(ev.verifiedPassed).toBe(true);
      expect(ev.commandsExecuted.length).toBeGreaterThan(0);
      expect(ev.testResults.length).toBe(2);
      expect(ev.testResults.every(t => t.passed)).toBe(true);
      expect(ev.filesChanged.length).toBeGreaterThan(0);
    } finally {
      simRuntime.stop();
    }
  });

  it("simulationMode: requireHumanApproval transitions task to waiting_approval", async () => {
    const simRuntime = new TaskWorkerRuntime(store, undefined, {
      repoRoot: process.cwd(),
      autoStart: false,
      simulationMode: true,
    });

    try {
      const task = store.createTask({
        id: "TASK-SIM-APPROVAL",
        title: "Deploy database migration schema v2",
        priority: "critical",
        status: "ready",
        contract: {
          id: "contract-sim-approval",
          taskId: "TASK-SIM-APPROVAL",
          version: 1,
          repository: { baseBranch: "vnext", baseSha: "abc1234" },
          workspace: { requireIsolatedWorktree: false },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: [{ type: "unit_tests", required: true }],
          completion: { requireEvidencePack: true, requireHumanApproval: true },
          createdAt: new Date().toISOString(),
        },
      });

      const waiting = await simRuntime.executeTask(task.id);
      expect(waiting.status).toBe("waiting_approval");
      expect(waiting.evidencePack).toBeDefined();

      const approvals = store.listApprovals("pending");
      expect(approvals.some(a => a.taskId === task.id)).toBe(true);
    } finally {
      simRuntime.stop();
    }
  });

  it("supports pausing and cancelling tasks (no backend required)", async () => {
    const task = store.createTask({
      id: "TASK-TEST-CONTROL",
      title: "Optimize image compression pipeline",
      status: "ready",
      priority: "medium",
      contract: {
        id: "contract-test-control",
        taskId: "TASK-TEST-CONTROL",
        version: 1,
        repository: { baseBranch: "vnext", baseSha: "abc1234" },
        workspace: { requireIsolatedWorktree: false },
        scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
        authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
        requiredChecks: [{ type: "unit_tests", required: true }],
        completion: { requireEvidencePack: true, requireHumanApproval: false },
        createdAt: new Date().toISOString(),
      },
    });

    // Pause is a local record operation — no backend required
    const paused = runtime.pauseTask(task.id);
    expect(paused.status).toBe("paused");
    expect(store.getTask(task.id)?.status).toBe("paused");

    // Resume is rejected without changing the task because no executor is connected
    await expect(runtime.resumeTask(task.id)).rejects.toThrow(/no production execution backend/i);
    expect(store.getTask(task.id)?.status).toBe("paused");

    // Cancel is a local record operation — no backend required
    const cancelled = await runtime.cancelTask(task.id);
    expect(cancelled.status).toBe("cancelled");

    // Retry also rejected without executor
    await expect(runtime.retryTask(task.id)).rejects.toThrow(/no production execution backend/i);
    expect(store.getTask(task.id)?.status).toBe("cancelled");
  });

  it("exposes connected worker status and task controls through AgentForgeWebServer", async () => {
    const testPort = 3591;
    const server = new AgentForgeWebServer(store, testPort);
    await server.start();

    try {
      // 1. Initial state without worker started reports NOT_CONNECTED
      const resInitial = await fetch(`http://127.0.0.1:${testPort}/api/harnesses`);
      expect(resInitial.status).toBe(200);
      const dataInitial = await resInitial.json();
      expect(dataInitial.runtime.status).toBe("NOT_CONNECTED");
      expect(dataInitial.runtime.canExecuteTasks).toBe(false);

      // 2. Starting the shell does not claim execution without an actual backend.
      server.taskWorkerRuntime.start();
      const resUnavailable = await fetch(`http://127.0.0.1:${testPort}/api/harnesses`);
      expect(resUnavailable.status).toBe(200);
      const dataUnavailable = await resUnavailable.json();
      expect(dataUnavailable.runtime.status).toBe("NOT_CONNECTED");
      expect(dataUnavailable.runtime.canExecuteTasks).toBe(false);
      expect(dataUnavailable.runtime.workerCount).toBe(0);

      // 3. Create task and execute via REST controls
      const task = store.createTask({
        id: "TASK-API-FLOW",
        title: "Verify REST API task controls",
        status: "ready",
        priority: "medium",
        contract: {
          id: "contract-test-api",
          taskId: "TASK-API-FLOW",
          version: 1,
          repository: { baseBranch: "vnext", baseSha: "abc1234" },
          workspace: { requireIsolatedWorktree: false },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: [{ type: "unit_tests", required: true }],
          completion: { requireEvidencePack: true, requireHumanApproval: false },
          createdAt: new Date().toISOString(),
        },
      });

      // Pause is a local record operation; resume is blocked without a real worker.
      const pauseRes = await fetch(`http://127.0.0.1:${testPort}/api/tasks/${task.id}/pause`, { method: "POST" });
      expect(pauseRes.status).toBe(200);
      const pauseData = await pauseRes.json();
      expect(pauseData.task.status).toBe("paused");

      // Resume must not claim that execution happened.
      const resumeRes = await fetch(`http://127.0.0.1:${testPort}/api/tasks/${task.id}/resume`, { method: "POST" });
      expect(resumeRes.status).toBe(409);
      expect((await resumeRes.json()).error).toMatch(/not connected/i);

      // No invented evidence becomes available.
      const evRes = await fetch(`http://127.0.0.1:${testPort}/api/tasks/${task.id}/evidence`);
      expect(evRes.status).toBe(409);
      expect((await evRes.json()).available).toBe(false);

      // No invented diff becomes available.
      const diffRes = await fetch(`http://127.0.0.1:${testPort}/api/tasks/${task.id}/diff`);
      expect(diffRes.status).toBe(409);
      expect((await diffRes.json()).available).toBe(false);
    } finally {
      await server.stop();
    }
  });
});
