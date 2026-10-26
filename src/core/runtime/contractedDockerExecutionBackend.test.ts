import { describe, expect, it } from "vitest";
import { DockerComputeProvider } from "../compute/dockerComputeProvider.js";
import { ContractedDockerExecutionBackend, type ExecutionPlanProvider } from "./contractedDockerExecutionBackend.js";
import { ApprovedPlanProvider } from "./approvedPlanProvider.js";
import type { Task } from "../types/task.js";
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {NativeToolAuthorization} from './nativeToolAuthorization.js';
import {createNativeDockerSession} from './nativeDockerBroker.js';

const task: Task = {
  id: "task-docker-backend", projectId: "default", title: "Run checks", description: "", priority: "medium", status: "ready",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  contract: {
    id: "contract-docker-backend", taskId: "task-docker-backend", version: 1,
    repository: { baseBranch: "main", baseSha: "abc123" }, workspace: { requireIsolatedWorktree: true },
    scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
    authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
    requiredChecks: [{ type: "unit_tests", command: "pnpm test", required: true }],
    completion: { requireEvidencePack: true, requireHumanApproval: true }, createdAt: new Date().toISOString(),
  },
};

describe("ContractedDockerExecutionBackend", () => {
  it('native broker permission cannot bypass the stored plan approval',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-native-docker-'));try{
      const work=path.join(root,'work');await fs.mkdir(work);let creations=0;
      const docker={isAvailable:async()=>({available:true}),createEnvironment:async()=>{creations++;throw Error('Must not start');}} as unknown as DockerComputeProvider;
      const backend=new ContractedDockerExecutionBackend(docker,new ApprovedPlanProvider(async()=>undefined));await backend.initialize();
      const authorization=new NativeToolAuthorization(path.join(root,'host'),work);
      const identity={taskId:task.id,operationId:'operation',sessionId:'session'};
      const bound=createNativeDockerSession({identity,task,worktreePath:work,authorization,backend});
      const approvalId=randomUUID();const args={callId:'call',tool:bound.tool,input:bound.input};
      await authorization.approve(approvalId,{...identity,...args},'owner',Date.now()+60000);
      await expect(bound.session.dispatch({approvalId,...args})).rejects.toThrow(/approve an execution plan/);
      expect(creations).toBe(0);expect((await authorization.inspect(approvalId,{...identity,...args})).state).toBe('unconfirmed');
      await bound.session.close();
    }finally{await fs.rm(root,{recursive:true,force:true});}
  });
  it("starts unavailable until Docker and an approved plan are both ready", () => {
    const unavailablePlan: ExecutionPlanProvider = {
      getReadiness: () => ({ ready: false, blocker: "Plan review is pending." }),
      getPlan: async () => ({ taskId: task.id, source: "human_approved", commands: [] }),
    };
    const backend = new ContractedDockerExecutionBackend(new DockerComputeProvider(), unavailablePlan);
    expect(backend.getReadiness()).toMatchObject({
      ready: false,
      capabilities: { modelPlanning: false, isolatedCompute: false, realVerification: false, evidenceCollection: false },
    });
    expect(backend.getReadiness().blockers).toContain("Plan review is pending.");
  });

  it("rejects an approved plan that omits a required check before any container starts", async () => {
    const planProvider: ExecutionPlanProvider = {
      getReadiness: () => ({ ready: true }),
      getPlan: async () => ({ taskId: task.id, source: "human_approved", commands: [] }),
    };
    const backend = new ContractedDockerExecutionBackend(new DockerComputeProvider(), planProvider);
    await expect(backend.execute({ task, worktreePath: process.cwd(), signal: new AbortController().signal }))
      .rejects.toThrow(/Docker capability has not been checked/i);
  });

  it("fails closed before Docker creation when no human-approved plan is stored", async () => {
    let environmentCreateCalls = 0;
    // Keep the test at the execution boundary: Docker reports ready, but any
    // attempt to create an environment is observable and must not happen.
    const docker = {
      isAvailable: async () => ({ available: true }),
      createEnvironment: async () => {
        environmentCreateCalls += 1;
        throw new Error("Docker must not start without plan approval.");
      },
    } as unknown as DockerComputeProvider;
    const backend = new ContractedDockerExecutionBackend(
      docker,
      new ApprovedPlanProvider(async () => undefined),
    );

    await backend.initialize();
    await expect(backend.execute({ task, worktreePath: process.cwd(), signal: new AbortController().signal }))
      .rejects.toThrow(/review and approve an execution plan/i);
    expect(environmentCreateCalls).toBe(0);
  });

  it("rejects a plan with incomplete required evidence before Docker creation", async () => {
    let environmentCreateCalls = 0;
    const docker = {
      isAvailable: async () => ({ available: true }),
      createEnvironment: async () => {
        environmentCreateCalls += 1;
        throw new Error("Docker must not start with incomplete evidence requirements.");
      },
    } as unknown as DockerComputeProvider;
    const planProvider: ExecutionPlanProvider = {
      getReadiness: () => ({ ready: true }),
      getPlan: async () => ({
        taskId: task.id,
        source: "human_approved",
        // The task requires pnpm test; this plan intentionally omits it.
        commands: [{ checkName: "diff_scope", command: "git diff --check" }],
      }),
    };
    const backend = new ContractedDockerExecutionBackend(docker, planProvider);

    await backend.initialize();
    await expect(backend.execute({ task, worktreePath: process.cwd(), signal: new AbortController().signal }))
      .rejects.toThrow(/missing the contracted check command: unit_tests/i);
    expect(environmentCreateCalls).toBe(0);
  });
});
