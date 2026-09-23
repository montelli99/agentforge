import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceStore } from "../core/store/workspaceStore.js";
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

    const processResponse = await fetch(`${base}/api/processes/import`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType: "manual", rawContent: "# Qualification SOP\n1. Review the seller's details\n2. If authority is unclear, ask the reviewer" }),
    });
    expect(processResponse.status).toBe(201);
    const imported = await processResponse.json() as { process: { id: string; unresolvedRules: Array<{ resolved: boolean }> } };
    expect(imported.process.unresolvedRules.some(rule => !rule.resolved)).toBe(true);

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
      expect.objectContaining({ action: "process_agent_bound" }),
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
