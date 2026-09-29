import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WorkspaceStore } from "../store/workspaceStore.js";
import { TaskWorkerRuntime, type TaskExecutionBackend } from "./taskWorkerRuntime.js";
import { AgentForgeWebServer } from "../../server/webServer.js";
import type { Task } from "../types/task.js";
import { OperationalMemoryProvider } from "../../providers/memory/operationalMemory.js";

/** Explicit test double. Production never receives a fake executor. */
function testExecutionBackend(): TaskExecutionBackend {
  return {
    getReadiness: () => ({
      ready: true,
      blockers: [],
      capabilities: { modelPlanning: true, isolatedCompute: true, realVerification: true, evidenceCollection: true },
    }),
    execute: async ({ task }) => ({
      commandsExecuted: task.contract.requiredChecks.map(check => ({
        command: check.command || `check:${check.type}`, cwd: process.cwd(), timestamp: new Date().toISOString(), exitCode: 0, durationMs: 1,
      })),
      testResults: task.contract.requiredChecks.map(check => ({
        checkName: check.type, command: check.command || `check:${check.type}`, passed: true, exitCode: 0, stdout: "test executor", stderr: "", durationMs: 1,
      })),
      filesChanged: [], artifacts: [], finalSha: "test-sha",
    }),
  };
}

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
    // Without an execution backend, start must remain fail-closed.
    expect(runtime.isRunning()).toBe(false);
    expect(runtime.getActiveWorkerCount()).toBe(0);
    expect(runtime.getActiveTasksCount()).toBe(0);
    expect(runtime.getActiveTaskIds()).toEqual([]);

    // Calling start without a real backend must not set the running flag
    runtime.start();
    expect(runtime.isRunning()).toBe(false);
    expect(runtime.getActiveWorkerCount()).toBe(0);
    expect(runtime.canExecuteTasks()).toBe(false);

    // The block reason must be present and descriptive
    const reason = runtime.getExecutionBlockReason();
    expect(reason).toBeDefined();
    expect(reason).toMatch(/no execution backend/i);

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

    await expect(runtime.executeTask(task.id)).rejects.toThrow(/no execution backend/i);
    // Task should NOT have been moved to completed
    expect(["ready", "backlog"].includes(store.getTask(task.id)?.status ?? "")).toBe(true);
  });

  it("can attach a backend after setup and records its readiness", () => {
    const readiness = runtime.configureBackend(testExecutionBackend());
    expect(readiness.ready).toBe(true);
    expect(runtime.canExecuteTasks()).toBe(true);
    expect(store.listAuditEntries().some(entry => entry.action === "TASK_WORKER_BACKEND_CONFIGURED")).toBe(true);
  });

  it("runs only through an explicit execution backend", async () => {
    const simRuntime = new TaskWorkerRuntime(store, testExecutionBackend(), {
      repoRoot: process.cwd(),
      autoStart: false,
    });

    try {
      simRuntime.start();
      expect(simRuntime.isRunning()).toBe(true);
      expect(simRuntime.getActiveWorkerCount()).toBe(2);
      expect(simRuntime.canExecuteTasks()).toBe(true);
      expect(simRuntime.getExecutionBlockReason()).toBeUndefined();

      const task = store.createTask({
        id: "TASK-SIM-E2E",
        title: "Explicit test backend end-to-end task execution",
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
      // The coordinator preserves what the executor reported; it invents no diff.
      expect(ev.filesChanged).toEqual([]);
    } finally {
      simRuntime.stop();
    }
  });

  it("never treats verified work as final when the contract requires human approval", async () => {
    const approvalRuntime = new TaskWorkerRuntime(store, testExecutionBackend(), {
      repoRoot: process.cwd(),
      autoStart: false,
    });
    try {
      const task = store.createTask({
        id: "TASK-HUMAN-APPROVAL",
        title: "Require review before completion",
        priority: "high",
        status: "ready",
        contract: {
          id: "contract-human-approval", taskId: "TASK-HUMAN-APPROVAL", version: 1,
          repository: { baseBranch: "vnext", baseSha: "abc1234" },
          workspace: { requireIsolatedWorktree: false },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: [{ type: "unit_tests", command: "pnpm test", required: true }],
          completion: { requireEvidencePack: true, requireHumanApproval: true },
          createdAt: new Date().toISOString(),
        },
      });

      const result = await approvalRuntime.executeTask(task.id);
      expect(result.status).toBe("waiting_approval");
      expect(result.completedAt).toBeUndefined();
      expect(result.evidencePack?.verifiedPassed).toBe(true);
      expect(result.evidencePack?.approvalId).toBeDefined();
      expect(store.listApprovals().some(approval => approval.taskId === task.id && approval.status === "pending")).toBe(true);
    } finally {
      approvalRuntime.stop();
    }
  });

  it("does not accept a worker success claim when required evidence is missing", async () => {
    const backend: TaskExecutionBackend = {
      getReadiness: () => ({
        ready: true,
        blockers: [],
        capabilities: { modelPlanning: true, isolatedCompute: true, realVerification: true, evidenceCollection: true },
      }),
      execute: async () => ({
        commandsExecuted: [],
        // The worker reports one passing check, but the contract requires two.
        testResults: [{
          checkName: "unit_tests", command: "pnpm test", passed: true, exitCode: 0,
          stdout: "unit tests passed", stderr: "", durationMs: 1,
        }],
        filesChanged: [], artifacts: [], finalSha: "evidence-missing-sha",
      }),
    };
    const guardedRuntime = new TaskWorkerRuntime(store, backend, { repoRoot: process.cwd(), autoStart: false });
    try {
      const task = store.createTask({
        id: "TASK-MISSING-EVIDENCE",
        title: "Reject incomplete worker evidence",
        priority: "high",
        status: "ready",
        contract: {
          id: "contract-missing-evidence", taskId: "TASK-MISSING-EVIDENCE", version: 1,
          repository: { baseBranch: "vnext", baseSha: "abc1234" },
          workspace: { requireIsolatedWorktree: false },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: [
            { type: "unit_tests", command: "pnpm test", required: true },
            { type: "diff_scope", required: true },
          ],
          completion: { requireEvidencePack: true, requireHumanApproval: false },
          createdAt: new Date().toISOString(),
        },
      });

      const result = await guardedRuntime.executeTask(task.id);
      expect(result.status).toBe("failed");
      expect(result.evidencePack?.verifiedPassed).toBe(false);
      expect(result.error).toMatch(/required verification check failed/i);
    } finally {
      guardedRuntime.stop();
    }
  });

  it("redacts credential-shaped backend output before persisting an evidence pack", async () => {
    const exposedToken = "sk-evidencepackfixture1234567890";
    const backend: TaskExecutionBackend = {
      getReadiness: () => ({
        ready: true,
        blockers: [],
        capabilities: { modelPlanning: true, isolatedCompute: true, realVerification: true, evidenceCollection: true },
      }),
      execute: async () => ({
        commandsExecuted: [],
        testResults: [{
          checkName: "unit_tests", command: "pnpm test", passed: true, exitCode: 0,
          stdout: `test output included ${exposedToken}`,
          stderr: `test warning included Bearer ${exposedToken}`,
          durationMs: 1,
        }],
        filesChanged: [{
          filePath: "src/example.ts", status: "modified", linesAdded: 1, linesDeleted: 1,
          patch: `+const credential = \"${exposedToken}\";`,
        }],
        artifacts: [], finalSha: "test-sha",
      }),
    };
    const simRuntime = new TaskWorkerRuntime(store, backend, { repoRoot: process.cwd(), autoStart: false });

    try {
      const task = store.createTask({
        id: "TASK-EVIDENCE-REDACTION",
        title: "Redact untrusted executor output",
        priority: "high",
        status: "ready",
        contract: {
          id: "contract-evidence-redaction", taskId: "TASK-EVIDENCE-REDACTION", version: 1,
          repository: { baseBranch: "vnext", baseSha: "abc1234" },
          workspace: { requireIsolatedWorktree: false },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: [{ type: "unit_tests", command: "pnpm test", required: true }],
          completion: { requireEvidencePack: true, requireHumanApproval: false },
          createdAt: new Date().toISOString(),
        },
      });

      const completed = await simRuntime.executeTask(task.id);
      const evidence = completed.evidencePack!;
      const serializedEvidence = JSON.stringify(evidence);
      expect(serializedEvidence).not.toContain(exposedToken);
      expect(evidence.testResults[0].stdout).toContain("[REDACTED_SECRET]");
      expect(evidence.testResults[0].stderr).toBe("test warning included Bearer [REDACTED_SECRET]");
      expect(evidence.filesChanged[0].patch).toContain("[REDACTED_SECRET]");
    } finally {
      simRuntime.stop();
    }
  });

  it("redacts credential-shaped backend failures before persisting task or audit records", async () => {
    const exposedToken = "sk-failurefixture1234567890";
    const backend: TaskExecutionBackend = {
      getReadiness: () => ({
        ready: true,
        blockers: [],
        capabilities: { modelPlanning: true, isolatedCompute: true, realVerification: true, evidenceCollection: true },
      }),
      execute: async () => { throw new Error(`backend failed with Bearer ${exposedToken}`); },
    };
    const simRuntime = new TaskWorkerRuntime(store, backend, { repoRoot: process.cwd(), autoStart: false });

    try {
      const task = store.createTask({
        id: "TASK-FAILURE-REDACTION",
        title: "Redact backend failures",
        priority: "high",
        status: "ready",
        contract: {
          id: "contract-failure-redaction", taskId: "TASK-FAILURE-REDACTION", version: 1,
          repository: { baseBranch: "vnext", baseSha: "abc1234" },
          workspace: { requireIsolatedWorktree: false },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: [{ type: "unit_tests", command: "pnpm test", required: true }],
          completion: { requireEvidencePack: true, requireHumanApproval: false },
          createdAt: new Date().toISOString(),
        },
      });

      const failed = await simRuntime.executeTask(task.id);
      expect(failed.status).toBe("failed");
      expect(failed.error).toContain("Bearer [REDACTED_SECRET]");
      expect(JSON.stringify(failed)).not.toContain(exposedToken);
      const audit = store.listAuditEntries().find(entry => entry.action === "TASK_EXECUTION_FAILED" && entry.targetId === task.id);
      expect(JSON.stringify(audit)).not.toContain(exposedToken);
      expect(JSON.stringify(audit)).toContain("[REDACTED_SECRET]");
    } finally {
      simRuntime.stop();
    }
  });

  it("builds worker context from scoped operational memory without crossing project boundaries", async () => {
    const memory = new OperationalMemoryProvider();
    await memory.record({
      namespace: "workspace",
      category: "do_not_repeat",
      title: "Shared safety rule",
      content: "Keep verification evidence with every completed task.",
      tags: ["safety"],
    });
    await memory.record({
      namespace: "workspace",
      projectId: "project-alpha",
      category: "project_constraint",
      title: "Alpha delivery rule",
      content: "Alpha work requires a release note before completion.",
      tags: ["alpha"],
    });
    await memory.record({
      namespace: "workspace",
      projectId: "project-beta",
      category: "general_fact",
      title: "Beta private note",
      content: "Beta-only information must never enter alpha execution.",
      tags: ["beta"],
    });

    let receivedContextText = "";
    let receivedSourceIds: string[] = [];
    const backend = testExecutionBackend();
    const originalExecute = backend.execute;
    backend.execute = async input => {
      receivedContextText = input.contextPacket?.content || "";
      receivedSourceIds = input.contextPacket?.sources.map(source => source.id) || [];
      return originalExecute(input);
    };
    const runtimeWithMemory = new TaskWorkerRuntime(store, backend, {
      repoRoot: process.cwd(), autoStart: false, memoryProvider: memory, memoryNamespace: "workspace",
    });
    try {
      const task = store.createTask({
        id: "TASK-MEMORY-SCOPED",
        projectId: "project-alpha",
        title: "Prepare alpha release evidence",
        description: "Prepare and verify release evidence.",
        priority: "medium",
        status: "ready",
        contract: {
          id: "contract-memory-scoped", taskId: "TASK-MEMORY-SCOPED", version: 1,
          repository: { baseBranch: "vnext", baseSha: "abc1234" },
          workspace: { requireIsolatedWorktree: false },
          scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
          requiredChecks: [{ type: "unit_tests", required: true }],
          completion: { requireEvidencePack: true, requireHumanApproval: false },
          createdAt: new Date().toISOString(),
        },
      });

      await runtimeWithMemory.executeTask(task.id);
      expect(receivedContextText).toContain("Shared safety rule");
      expect(receivedContextText).toContain("Alpha delivery rule");
      expect(receivedContextText).not.toContain("Beta private note");
      expect(receivedSourceIds).toHaveLength(3);
      expect(store.listAuditEntries().some(entry => entry.action === "TASK_CONTEXT_PACKED" && entry.targetId === task.id)).toBe(true);
    } finally {
      runtimeWithMemory.stop();
    }
  });

  it("explicit backend: requireHumanApproval transitions task to waiting_approval", async () => {
    const simRuntime = new TaskWorkerRuntime(store, testExecutionBackend(), {
      repoRoot: process.cwd(),
      autoStart: false,
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
    const paused = await runtime.pauseTask(task.id);
    expect(paused.status).toBe("paused");
    expect(store.getTask(task.id)?.status).toBe("paused");

    // Resume is rejected without changing the task because no executor is connected
    await expect(runtime.resumeTask(task.id)).rejects.toThrow(/no execution backend/i);
    expect(store.getTask(task.id)?.status).toBe("paused");

    // Cancel is a local record operation — no backend required
    const cancelled = await runtime.cancelTask(task.id);
    expect(cancelled.status).toBe("cancelled");

    // Retry also rejected without executor
    await expect(runtime.retryTask(task.id)).rejects.toThrow(/no execution backend/i);
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
      expect(dataInitial.runtime.activeTaskIds).toEqual([]);
      expect(dataInitial.runtime.readiness.capabilities.modelPlanning).toBe(false);
      expect(dataInitial.runtime.readiness.blockers).toContain("No execution backend is connected.");

      // 2. Starting the shell does not claim execution without an actual backend.
      server.taskWorkerRuntime.start();
      const resUnavailable = await fetch(`http://127.0.0.1:${testPort}/api/harnesses`);
      expect(resUnavailable.status).toBe(200);
      const dataUnavailable = await resUnavailable.json();
      expect(dataUnavailable.runtime.status).toBe("NOT_CONNECTED");
      expect(dataUnavailable.runtime.canExecuteTasks).toBe(false);
      expect(dataUnavailable.runtime.workerCount).toBe(0);
      expect(dataUnavailable.runtime.activeTaskIds).toEqual([]);
      expect(dataUnavailable.runtime.explanation).toMatch(/no execution backend/i);

      const pageRes = await fetch(`http://127.0.0.1:${testPort}/`);
      const page = await pageRes.text();
      expect(page).toContain("AgentForge Harness");
      expect(page).not.toContain("32 GB GGUF");
      expect(page).not.toContain("12ms P95");
      expect(page).not.toContain("55 CONSOLIDATED");

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
