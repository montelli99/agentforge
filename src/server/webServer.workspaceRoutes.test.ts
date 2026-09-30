import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceStore } from "../core/store/workspaceStore.js";
import { executionContractDigest } from "../core/runtime/approvedPlanProvider.js";
import { AgentForgeWebServer } from "./webServer.js";

describe("workspace hierarchy API", () => {
  let server: AgentForgeWebServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it("creates and reads a workspace, space, and channel through the app API", async () => {
    const port = await new Promise<number>((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => {
        const address = probe.address();
        if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
        const selectedPort = address.port;
        probe.close(error => error ? reject(error) : resolve(selectedPort));
      });
    });
    const store = new WorkspaceStore();
    server = new AgentForgeWebServer(store, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;

    const workspaceResponse = await fetch(`${base}/api/workspaces`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "RC2 acceptance", description: "isolated browser-journey test" }),
    });
    expect(workspaceResponse.status).toBe(201);
    const workspace = await workspaceResponse.json() as { id: string; name: string };

    const spaceResponse = await fetch(`${base}/api/spaces`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id, name: "Operations" }),
    });
    expect(spaceResponse.status).toBe(201);
    const space = await spaceResponse.json() as { id: string };

    const mismatchResponse = await fetch(`${base}/api/channels`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-default", spaceId: space.id, name: "Must reject" }),
    });
    expect(mismatchResponse.status).toBe(400);

    const channelResponse = await fetch(`${base}/api/channels`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id, spaceId: space.id, name: "Pipeline", visibility: "private" }),
    });
    expect(channelResponse.status).toBe(201);
    const channel = await channelResponse.json() as { id: string; name: string };

    const listedSpaces = await fetch(`${base}/api/spaces?workspaceId=${encodeURIComponent(workspace.id)}`);
    expect((await listedSpaces.json() as Array<{ id: string }>).map(item => item.id)).toContain(space.id);
    const listedChannels = await fetch(`${base}/api/channels?spaceId=${encodeURIComponent(space.id)}`);
    expect((await listedChannels.json() as Array<{ id: string }>).map(item => item.id)).toContain(channel.id);

    const gatewayStatus = await fetch(`${base}/api/gateway/status`);
    expect(gatewayStatus.status).toBe(200);
    expect((await gatewayStatus.json() as { nativeOwnership: boolean }).nativeOwnership).toBe(true);
    const gatewayStart = await fetch(`${base}/api/gateway/start`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providers: ["telegram"] }),
    });
    expect(gatewayStart.status).toBe(200);
    const startedGateway = await gatewayStart.json() as { state: string; channels: Array<{ provider: string }> };
    expect(startedGateway.state).toMatch(/ready|degraded/);
    expect(startedGateway.channels.map(channel => channel.provider)).toContain("telegram");
    const gatewayStop = await fetch(`${base}/api/gateway/stop`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providers: ["telegram"] }),
    });
    expect(gatewayStop.status).toBe(200);
    expect((await gatewayStop.json() as { state: string }).state).toBe("stopped");

    const processResponse = await fetch(`${base}/api/processes/import`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType: "manual", rawContent: "# Qualification SOP\n1. Review the seller's details\n2. If authority is unclear, ask the reviewer" }),
    });
    expect(processResponse.status).toBe(201);
    const imported = await processResponse.json() as { process: { id: string; unresolvedRules: Array<{ resolved: boolean }> } };
    expect(imported.process.unresolvedRules.some(rule => !rule.resolved)).toBe(true);

    const firstRunAgentResponse = await fetch(`${base}/api/agents`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "First-run reviewer",
        role: "Reviewer",
        description: "Created before any channel is assigned.",
        harnessPolicy: { preferredHarnessId: "native", autoResume: false },
        modelPolicy: { preferredTier: 2, preferredModel: "unconfigured", preferredProvider: "unconfigured", allowCloudFallback: false },
        decisionPolicy: { useSystem1Router: true },
        computePolicy: { environment: "local_workspace" },
        memoryNamespace: "general",
        tools: [],
        permissions: ["workspace:read"],
      }),
    });
    expect(firstRunAgentResponse.status).toBe(201);
    expect((await firstRunAgentResponse.json() as { assignedChannelIds: string[] }).assignedChannelIds).toEqual([]);
    const agentResponse = await fetch(`${base}/api/agents`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Qualification reviewer", role: "Reviewer", assignedChannelIds: [channel.id] }),
    });
    expect(agentResponse.status).toBe(201);
    const agent = await agentResponse.json() as { id: string };
    const bindingResponse = await fetch(`${base}/api/process-bindings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processId: imported.process.id, agentId: agent.id, assignedRole: "Reviewer" }),
    });
    expect(bindingResponse.status).toBe(201);
    const binding = await bindingResponse.json() as { processId: string; agentId: string; assignedRole: string };
    expect(binding).toMatchObject({ processId: imported.process.id, agentId: agent.id, assignedRole: "Reviewer" });
    const repeatBinding = await fetch(`${base}/api/process-bindings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processId: imported.process.id, agentId: agent.id, assignedRole: "Reviewer" }),
    });
    expect(repeatBinding.status).toBe(200);
    const preparedRun = await fetch(`${base}/api/process-runs/prepare`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processId: imported.process.id, agentId: agent.id, input: "Review this intake" }),
    });
    expect(preparedRun.status).toBe(201);
    const prepared = await preparedRun.json() as { executed: boolean; task: { id: string; processId: string; assignedAgentId: string; status: string }; contract: { authority: Record<string, boolean> } };
    expect(prepared.executed).toBe(false);
    expect(prepared.task.processId).toBe(imported.process.id);
    expect(prepared.task.assignedAgentId).toBe(agent.id);
    expect(prepared.task.status).toBe("waiting_approval");
    expect(Object.values(prepared.contract.authority).every(enabled => enabled === false)).toBe(true);
    const deniedExecute = await fetch(`${base}/api/process-runs/execute`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: prepared.task.id }),
    });
    expect(deniedExecute.status).toBe(400);
    const listedBindings = await fetch(`${base}/api/process-bindings?agentId=${encodeURIComponent(agent.id)}`);
    expect((await listedBindings.json() as Array<{ processId: string }>).map(item => item.processId)).toEqual([imported.process.id]);
    const taskResponse = await fetch(`${base}/api/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Review a lead safely", description: "Keep this as a record until a worker is connected.", status: "ready", assignedAgentId: agent.id }),
    });
    expect(taskResponse.status).toBe(201);
    const task = await taskResponse.json() as { id: string; status: string; assignedAgentId: string; contract: { authority: Record<string, boolean>; completion: { requireHumanApproval: boolean } } };
    expect(task.status).toBe("ready");
    expect(task.assignedAgentId).toBe(agent.id);
    expect(Object.values(task.contract.authority).every(enabled => enabled === false)).toBe(true);
    expect(task.contract.completion.requireHumanApproval).toBe(true);
    const auditResponse = await fetch(`${base}/api/audit`);
    const audit = await auditResponse.json() as Array<{ action: string; targetId: string }>;
    expect(audit).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "workspace_created", targetId: workspace.id }),
      expect.objectContaining({ action: "native_gateway_start", targetId: "native-gateway" }),
      expect.objectContaining({ action: "native_gateway_stop", targetId: "native-gateway" }),
      expect.objectContaining({ action: "process_agent_bound" }),
      expect.objectContaining({ action: "process_agent_run_prepared", targetId: prepared.task.id }),
      expect.objectContaining({ action: "task_created", targetId: task.id }),
    ]));
    expect(workspace.name).toBe("RC2 acceptance");
  });

  it("rejects invalid hierarchy references", async () => {
    const port = await new Promise<number>((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => {
        const address = probe.address();
        if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
        const selectedPort = address.port;
        probe.close(error => error ? reject(error) : resolve(selectedPort));
      });
    });
    server = new AgentForgeWebServer(new WorkspaceStore(), port);
    await server.start();
    const response = await fetch(`http://127.0.0.1:${port}/api/spaces`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: "missing", name: "Orphan" }),
    });
    expect(response.status).toBe(400);
  });

  it("supports nested department spaces for subgroup work", async () => {
    const port = await new Promise<number>((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => {
        const address = probe.address();
        if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
        const selectedPort = address.port;
        probe.close(error => error ? reject(error) : resolve(selectedPort));
      });
    });
    server = new AgentForgeWebServer(new WorkspaceStore(), port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    const parentResponse = await fetch(`${base}/api/spaces`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: "ws-default", name: "Operations" }) });
    const parent = await parentResponse.json() as { id: string };
    const childResponse = await fetch(`${base}/api/spaces`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: "ws-default", parentSpaceId: parent.id, name: "Acquisitions" }) });
    expect(childResponse.status).toBe(201);
    const child = await childResponse.json() as { id: string; parentSpaceId: string };
    expect(child.parentSpaceId).toBe(parent.id);
    const children = await fetch(`${base}/api/spaces?workspaceId=ws-default&parentSpaceId=${encodeURIComponent(parent.id)}`);
    expect((await children.json() as Array<{ id: string }>).map(item => item.id)).toContain(child.id);
  });

  it("updates reviewed task boundaries without preserving prior approval", async () => {
    const port = await new Promise<number>((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => {
        const address = probe.address();
        if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
        probe.close(error => error ? reject(error) : resolve(address.port));
      });
    });
    const store = new WorkspaceStore();
    server = new AgentForgeWebServer(store, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    const created = await fetch(`${base}/api/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Boundary review", description: "Verify revision safety.", status: "ready" }),
    });
    expect(created.status).toBe(201);
    const task = await created.json() as { id: string; updatedAt: string; contract: { version: number; authority: Record<string, boolean> } };
    const saved = store.getTask(task.id);
    expect(saved).toBeDefined();
    store.updateTask(task.id, {
      approvedExecutionPlan: {
        plan: { taskId: task.id, source: "human_approved", commands: [{ checkName: "unit_tests", command: "pnpm test" }] },
        contractDigest: executionContractDigest(saved!), approvedBy: "user-owner",
        approvedAt: new Date(Date.now() - 1_000).toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const current = store.getTask(task.id)!;
    const body = {
      expectedUpdatedAt: current.updatedAt,
      baseBranch: "main",
      baseSha: "a".repeat(40),
      allowedPaths: ["src/**"],
      protectedPaths: [".env"],
      checks: [{ type: "unit_tests", required: true, command: "pnpm test", timeoutMs: 30_000 }],
    };
    const updatedResponse = await fetch(`${base}/api/tasks/${encodeURIComponent(task.id)}/contract`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    expect(updatedResponse.status).toBe(200);
    const updated = await updatedResponse.json() as { approvalInvalidated: boolean; task: { contract: { version: number; authority: Record<string, boolean> }; approvedExecutionPlan?: unknown } };
    expect(updated.approvalInvalidated).toBe(true);
    expect(updated.task.contract.version).toBe(task.contract.version + 1);
    expect(Object.values(updated.task.contract.authority).every(enabled => enabled === false)).toBe(true);
    expect(updated.task.approvedExecutionPlan).toBeUndefined();

    const invalid = await fetch(`${base}/api/tasks/${encodeURIComponent(task.id)}/contract`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, expectedUpdatedAt: store.getTask(task.id)!.updatedAt, baseSha: "short" }),
    });
    expect(invalid.status).toBe(400);
    const stale = await fetch(`${base}/api/tasks/${encodeURIComponent(task.id)}/contract`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, expectedUpdatedAt: "1970-01-01T00:00:00.000Z" }),
    });
    expect(stale.status).toBe(409);

    const viewer = store.createUser({ username: "boundary_viewer", displayName: "Boundary viewer", role: "viewer" });
    const viewerSession = store.createSession(viewer.id);
    const denied = await fetch(`${base}/api/tasks/${encodeURIComponent(task.id)}/contract`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${viewerSession.token}` }, body: JSON.stringify({ ...body, expectedUpdatedAt: store.getTask(task.id)!.updatedAt }),
    });
    expect(denied.status).toBe(403);
  });

  it("verifies and prunes cryptographic audit trail via REST endpoints", async () => {
    const port = await new Promise<number>((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => {
        const address = probe.address();
        if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
        const selectedPort = address.port;
        probe.close(error => error ? reject(error) : resolve(selectedPort));
      });
    });
    const customStore = new WorkspaceStore();
    server = new AgentForgeWebServer(customStore, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;

    // Verify audit chain
    const verifyRes = await fetch(`${base}/api/audit/verify`);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json() as { valid: boolean; totalEntries: number };
    expect(verifyData.valid).toBe(true);

    // Create a task to generate audit events
    await fetch(`${base}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Audit Verification Task", description: "testing audit" }),
    });

    const verifyAfterTask = await (await fetch(`${base}/api/audit/verify`)).json() as { valid: boolean };
    expect(verifyAfterTask.valid).toBe(true);

    // Prune audit trail as admin/owner
    const pruneRes = await fetch(`${base}/api/audit/prune`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer af_sess_admin" },
      body: JSON.stringify({ maxEntries: 1 }),
    });
    expect(pruneRes.status).toBe(200);
    const pruneData = await pruneRes.json() as { prunedCount: number; remainingCount: number };
    expect(pruneData.remainingCount).toBe(1);

    // Verify chain is still valid after pruning
    const verifyPostPrune = await (await fetch(`${base}/api/audit/verify`)).json() as { valid: boolean };
    expect(verifyPostPrune.valid).toBe(true);
  });
});
