import { describe, it, expect, beforeEach } from "vitest";
import { WorkspaceStore } from "../store/workspaceStore.js";
import { ProcessExecutionEngine } from "./processExecutionEngine.js";
import { TaskWorkerRuntime, type TaskExecutionBackend } from "../runtime/taskWorkerRuntime.js";
import type { ProcessDefinition } from "../types/process.js";
import type { AgentTeammate } from "../types/agent.js";
import type { ExecutionContract } from "../types/contract.js";

const testExecutionBackend: TaskExecutionBackend = {
  getReadiness: () => ({
    ready: true, blockers: [],
    capabilities: { modelPlanning: true, isolatedCompute: true, realVerification: true, evidenceCollection: true },
  }),
  execute: async ({ task }) => ({
    commandsExecuted: [],
    testResults: task.contract.requiredChecks.map(check => ({
      checkName: check.type, command: check.command || `check:${check.type}`, passed: true, exitCode: 0, stdout: "test executor", stderr: "", durationMs: 1,
    })),
    filesChanged: [], artifacts: [], finalSha: "test-sha",
  }),
};

describe("ProcessExecutionEngine (Sections 21-24: Governed Process & SOP Is Not Authority)", () => {
  let store: WorkspaceStore;
  let engine: ProcessExecutionEngine;
  let sampleAgent: AgentTeammate;
  let sampleContract: ExecutionContract;

  beforeEach(() => {
    store = new WorkspaceStore();
    engine = new ProcessExecutionEngine(store);

    sampleAgent = store.createAgent({
      name: "ProcessWorker",
      role: "Operations Engineer",
      description: "Follows processes strictly within contract boundaries.",
      status: "idle",
      harnessPolicy: {
        preferredHarnessId: "native",
        autoResume: true,
      },
      modelPolicy: {
        preferredTier: 2,
        preferredModel: "agentforge-default",
        preferredProvider: "local",
        allowCloudFallback: false,
      },
      decisionPolicy: {
        useSystem1Router: false,
      },
      computePolicy: {
        environment: "local_workspace",
      },
      memoryNamespace: "ops",
      tools: ["fs", "git"],
      permissions: ["tasks:read", "tasks:execute"],
      assignedChannelIds: [],
    });

    sampleContract = {
      id: "contract-test-1",
      taskId: "task-1",
      version: 1,
      repository: {
        baseBranch: "main",
        baseSha: "0000000",
      },
      workspace: {
        requireIsolatedWorktree: false,
      },
      authority: {
        externalMessage: false,
        productionWrite: false,
        deployment: false,  // Default: no deployment authority
        forcePush: false,
        deleteFiles: false, // Default: no deletion authority
        networkOutbound: false,
      },
      scope: {
        allowedPaths: ["src/**"],
        protectedPaths: [".env*"],
        maxFilesChanged: 5,
        maxLinesChanged: 100,
      },
      requiredChecks: [
        { type: "unit_tests", required: true },
      ],
      completion: {
        requireEvidencePack: false,
        requireHumanApproval: false,
      },
      createdAt: new Date().toISOString(),
    };
  });

  it("completes normal steps when no privileged operations or blockers exist", async () => {
    const procDef: ProcessDefinition = {
      id: "proc-1",
      title: "Standard Code Review Process",
      description: "Review code changes against style guide",
      sourceType: "manual",
      version: 1,
      steps: [
        { id: "step-1", sequence: 1, title: "Check formatting", instruction: "Inspect files for linting conventions" },
        { id: "step-2", sequence: 2, title: "Verify tests", instruction: "Check if test coverage is maintained" },
      ],
      inputs: [],
      outputs: [],
      unresolvedRules: [],
      lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const trace = await engine.executeGovernedProcess({
      process: procDef,
      agent: sampleAgent,
      contract: sampleContract,
      taskId: "task-1",
      worktreePath: process.cwd(),
    });

    expect(trace.status).toBe("completed");
    expect(trace.stepResults).toHaveLength(2);
    expect(trace.stepResults[0].status).toBe("completed");
    expect(trace.stepResults[1].status).toBe("completed");
    expect(trace.executionMode).toBe("validated_only");
    expect(trace.completedAt).toBeDefined();
  });

  it("runs approved steps through an injected provider and stops on provider failure", async () => {
    const executed: string[] = [];
    const providerEngine = new ProcessExecutionEngine(store, async ({ step }) => {
      executed.push(step.id);
      if (step.id === "step-2") throw new Error("provider rejected step");
      return { output: "provider evidence" };
    });
    const processDefinition: ProcessDefinition = {
      id: "proc-provider", title: "Provider process", description: "", sourceType: "manual", version: 1,
      steps: [
        { id: "step-1", sequence: 1, title: "Run", instruction: "Inspect files" },
        { id: "step-2", sequence: 2, title: "Fail", instruction: "Inspect tests" },
        { id: "step-3", sequence: 3, title: "Skip", instruction: "Report" },
      ], inputs: [], outputs: [], unresolvedRules: [], lastSynchronizedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const trace = await providerEngine.executeGovernedProcess({ process: processDefinition, agent: sampleAgent, contract: sampleContract, taskId: "task-provider", worktreePath: process.cwd() });
    expect(executed).toEqual(["step-1", "step-2"]);
    expect(trace.status).toBe("failed");
    expect(trace.stepResults.map(step => step.status)).toEqual(["completed", "failed"]);
    expect(trace.stepResults[0].output).toBe("provider evidence");
    expect(trace.executionMode).toBe("provider_executed");
  });

  it("enforces 'SOP Is Not Authority': halts and requests human approval for privileged file deletion", async () => {
    const procDef: ProcessDefinition = {
      id: "proc-del",
      title: "Cleanup Temp Files",
      description: "Deletes temporary build caches",
      sourceType: "manual",
      version: 1,
      steps: [
        { id: "step-1", sequence: 1, title: "Find temp files", instruction: "List all .cache directories" },
        { id: "step-2", sequence: 2, title: "Delete files", instruction: "Delete all files in .cache directory" },
        { id: "step-3", sequence: 3, title: "Report size", instruction: "Echo reclaimed space" },
      ],
      inputs: [],
      outputs: [],
      unresolvedRules: [],
      lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // sampleContract.authority.deleteFiles is false
    const trace = await engine.executeGovernedProcess({
      process: procDef,
      agent: sampleAgent,
      contract: sampleContract,
      taskId: "task-del",
      worktreePath: process.cwd(),
    });

    expect(trace.status).toBe("waiting_for_approval");
    expect(trace.stepResults).toHaveLength(2); // Step 1 completed, Step 2 blocked, Step 3 not reached
    expect(trace.stepResults[0].status).toBe("completed");
    expect(trace.stepResults[1].status).toBe("blocked_on_approval");
    expect(trace.stepResults[1].approvalRequestId).toBeDefined();

    // Check approval request was created in WorkspaceStore
    const approvals = store.listApprovals();
    expect(approvals.length).toBeGreaterThan(0);
    const approval = approvals.find(a => a.id === trace.stepResults[1].approvalRequestId);
    expect(approval).toBeDefined();
    expect(approval?.description).toContain("Requires file deletion authority");
  });

  it("permits privileged step when contract explicitly grants authority", async () => {
    const procDef: ProcessDefinition = {
      id: "proc-del-auth",
      title: "Authorized Cache Clean",
      description: "Deletes cache with explicit authority",
      sourceType: "manual",
      version: 1,
      steps: [
        { id: "step-1", sequence: 1, title: "Delete cache", instruction: "Delete temporary build files" },
      ],
      inputs: [],
      outputs: [],
      unresolvedRules: [],
      lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const authorizedContract: ExecutionContract = {
      ...sampleContract,
      authority: {
        ...sampleContract.authority,
        deleteFiles: true, // Explicitly authorized!
      },
    };

    const trace = await engine.executeGovernedProcess({
      process: procDef,
      agent: sampleAgent,
      contract: authorizedContract,
      taskId: "task-auth",
      worktreePath: process.cwd(),
    });

    expect(trace.status).toBe("completed");
    expect(trace.stepResults[0].status).toBe("completed");
  });

  it("halts execution when step contains an unresolved blocker rule", async () => {
    const procDef: ProcessDefinition = {
      id: "proc-blocker",
      title: "Finance Settlement SOP",
      description: "Process partner payouts",
      sourceType: "manual",
      version: 1,
      steps: [
        { id: "step-1", sequence: 1, title: "Calculate payout", instruction: "Compute commission sums" },
      ],
      inputs: [],
      outputs: [],
      unresolvedRules: [
        {
          id: "rule-1",
          processId: "proc-blocker",
          stepId: "step-1",
          question: "What is the max payout limit for tier 2 partners?",
          description: "Limit not defined in documentation",
          severity: "blocker",
          resolved: false,
        },
      ],
      lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const trace = await engine.executeGovernedProcess({
      process: procDef,
      agent: sampleAgent,
      contract: sampleContract,
      taskId: "task-blocker",
      worktreePath: process.cwd(),
    });

    expect(trace.status).toBe("waiting_for_approval");
    expect(trace.stepResults[0].status).toBe("blocked_on_approval");
  });

  it("revalidates agents bound to an updated process (Section 24)", () => {
    const procDef: ProcessDefinition = {
      id: "proc-onboarding",
      title: "Onboarding SOP",
      description: "Team onboarding",
      sourceType: "manual",
      version: 1,
      steps: [{ id: "step-1", sequence: 1, title: "Create user", instruction: "Add user to roster" }],
      inputs: [],
      outputs: [],
      unresolvedRules: [],
      lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.createProcess(procDef);

    store.bindProcessToAgent({
      processId: procDef.id,
      agentId: sampleAgent.id,
      assignedRole: "executor",
    });

    const updated = store.updateProcess({
      ...procDef,
      version: 2,
      unresolvedRules: [
        {
          id: "new-blocker",
          processId: procDef.id,
          stepId: "step-1",
          question: "Which department budget pays for the license?",
          description: "Budget approval missing",
          severity: "blocker",
          resolved: false,
        },
      ],
    }, 1);

    const result = engine.revalidateAgentsForProcess(procDef.id, updated);
    expect(result.affectedCount).toBe(1);
    expect(result.revalidatedAgents).toContain(sampleAgent.id);
    expect(result.newBlockerCount).toBe(1);

    const audits = store.listAuditEntries().filter(a => a.action === "agent_process_revalidated");
    expect(audits.length).toBe(1);
    expect(audits[0].targetId).toBe(sampleAgent.id);
  });

  it("integrates end-to-end with TaskWorkerRuntime", async () => {
    const runtime = new TaskWorkerRuntime(store, testExecutionBackend);


    const procDef: ProcessDefinition = {
      id: "proc-deploy",
      title: "Production Deployment SOP",
      description: "Deploy artifacts to live environment",
      sourceType: "manual",
      version: 1,
      steps: [
        { id: "step-1", sequence: 1, title: "Prepare release", instruction: "Build package" },
        { id: "step-2", sequence: 2, title: "Deploy to prod", instruction: "Deploy release to prod servers" },
      ],
      inputs: [],
      outputs: [],
      unresolvedRules: [],
      lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.createProcess(procDef);

    const taskId = "task-deploy-e2e";
    const deployContract: ExecutionContract = {
      ...sampleContract,
      id: "contract-deploy-e2e",
      taskId,
      authority: {
        ...sampleContract.authority,
        deployment: false, // Deployment forbidden without approval
      },
    };

    const task = store.createTask({
      id: taskId,
      title: "Execute Governed Deployment",
      description: "Follow deployment SOP",
      priority: "high",
      status: "ready",
      contract: deployContract,
      assignedAgentId: sampleAgent.id,
      processId: procDef.id,
    });

    const result = await runtime.executeTask(task.id);

    // Because step-2 asks to deploy without deployment authority, task must halt in waiting_approval
    expect(result.status).toBe("waiting_approval");

    const approvals = store.listApprovals().filter(a => a.taskId === task.id);
    expect(approvals.length).toBeGreaterThan(0);
    expect(approvals[0].description).toContain("Requires deployment authority");
  });
});
