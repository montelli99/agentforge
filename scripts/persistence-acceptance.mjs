import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-launcher-acceptance-"));
const portProbe = net.createServer();
let child;
let childOutput = "";

async function availablePort() {
  await new Promise((resolve, reject) => {
    portProbe.once("error", reject);
    portProbe.listen(0, "127.0.0.1", resolve);
  });
  const address = portProbe.address();
  if (!address || typeof address === "string") throw new Error("Could not select a local acceptance-test port.");
  await new Promise((resolve, reject) => portProbe.close(error => error ? reject(error) : resolve()));
  return address.port;
}

async function startServer(port) {
  child = spawn(process.execPath, ["dist/server/start.js"], {
    cwd: process.cwd(),
    env: { ...process.env, AGENTFORGE_DATA_DIR: dataDirectory, AGENTFORGE_HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.setEncoding("utf8").on("data", chunk => { childOutput += chunk; });
  child.stderr.setEncoding("utf8").on("data", chunk => { childOutput += chunk; });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited early (${child.exitCode}). ${childOutput}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/status`, { headers: { Connection: "close" } });
      if (response.ok) {
        const status = await response.json();
        assert.equal(status.storageMode, "local_json", "launcher must report local JSON persistence");
        return;
      }
    } catch {
      // Wait briefly while the server binds its local port.
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become ready. ${childOutput}`);
}

async function stopServer() {
  if (!child || child.exitCode !== null) return;
  const current = child;
  current.kill();
  await Promise.race([
    new Promise(resolve => current.once("exit", resolve)),
    new Promise(resolve => setTimeout(resolve, 5000)),
  ]);
  if (current.exitCode === null) current.kill("SIGKILL");
  child = undefined;
}

try {
  const port = await availablePort();
  await startServer(port);
  const initialStatus = await (await fetch(`http://127.0.0.1:${port}/api/status`)).json();
  assert.equal(initialStatus.dataMode, "EMPTY", "fresh durable user storage must be identified as an empty workspace");
  const [initialAgents, initialTasks, initialPackages, initialDriftBaselines] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/api/agents`).then(response => response.json()),
    fetch(`http://127.0.0.1:${port}/api/tasks`).then(response => response.json()),
    fetch(`http://127.0.0.1:${port}/api/packages`).then(response => response.json()),
    fetch(`http://127.0.0.1:${port}/api/drift/baselines`).then(response => response.json()),
  ]);
  assert.equal(initialAgents.length, 0, "durable user storage must not be seeded with example agents");
  assert.equal(initialTasks.length, 0, "durable user storage must not be seeded with example tasks");
  assert.equal(initialPackages.available.length, 0, "durable user storage must not be seeded with example marketplace packages");
  assert.equal(initialDriftBaselines.length, 0, "durable user storage must not invent model or harness performance baselines");
  const unconfiguredDrift = await fetch(`http://127.0.0.1:${port}/api/drift/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ targetId: "asserted-model", passRatePct: 100, avgLatencyMs: 1 }),
  });
  assert.equal(unconfiguredDrift.status, 409, "durable user storage must reject manually asserted drift results without an evaluation source");
  const setupResponse = await fetch(`http://127.0.0.1:${port}/api/setup-guide/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ rawGoalText: "Prepare a durable local workspace for launcher acceptance." }),
  });
  assert.equal(setupResponse.status, 201, "first launcher must let the Setup Guide prepare a local project conversation");
  const setup = await setupResponse.json();
  const created = await fetch(`http://127.0.0.1:${port}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ channelId: setup.channel.id, threadId: setup.thread.id, content: "Launcher persistence acceptance marker" }),
  });
  assert.equal(created.status, 201, "first launcher must accept the test message");
  const workspaceResponse = await fetch(`http://127.0.0.1:${port}/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ name: "Workspace restart acceptance", description: "Hierarchy must survive launcher restart." }),
  });
  assert.equal(workspaceResponse.status, 201, "first launcher must create a workspace through the UI API");
  const workspace = await workspaceResponse.json();
  const spaceResponse = await fetch(`http://127.0.0.1:${port}/api/spaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ workspaceId: workspace.id, name: "Operations" }),
  });
  assert.equal(spaceResponse.status, 201, "workspace must support its first space");
  const space = await spaceResponse.json();
  const channelResponse = await fetch(`http://127.0.0.1:${port}/api/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ workspaceId: workspace.id, spaceId: space.id, name: "General", visibility: "private" }),
  });
  assert.equal(channelResponse.status, 201, "workspace space must support its first channel");
  const channel = await channelResponse.json();
  const processCreated = await fetch(`http://127.0.0.1:${port}/api/processes/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ sourceType: "manual", rawContent: "# Review SOP\n1. Review the task details\n2. If authorization is unclear, ask the reviewer" }),
  });
  assert.equal(processCreated.status, 201, "launcher must import an SOP through HTTP");
  const processData = await processCreated.json();
  assert.ok(processData.process.unresolvedRules.some(rule => !rule.resolved), "imported SOP must preserve an unresolved review rule");
  const agentCreated = await fetch(`http://127.0.0.1:${port}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ name: "Acceptance reviewer", role: "Reviewer", assignedChannelIds: [channel.id] }),
  });
  assert.equal(agentCreated.status, 201, "launcher must create an agent through HTTP");
  const agent = await agentCreated.json();
  const processBinding = await fetch(`http://127.0.0.1:${port}/api/process-bindings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ processId: processData.process.id, agentId: agent.id, assignedRole: "Reviewer" }),
  });
  assert.equal(processBinding.status, 201, "launcher must assign the SOP to its agent through HTTP");
  const taskResponse = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ title: "Durable task audit acceptance", description: "Verify its audit entry survives restart.", status: "ready", assignedAgentId: agent.id }),
  });
  assert.equal(taskResponse.status, 201, "launcher must create a task through HTTP");
  const task = await taskResponse.json();
  const memoryCreated = await fetch(`http://127.0.0.1:${port}/api/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({
      namespace: "acceptance",
      category: "do_not_repeat",
      title: "Durable memory acceptance marker",
      content: "This operational memory must survive a launcher restart.",
      tags: ["acceptance"],
    }),
  });
  assert.equal(memoryCreated.status, 201, "first launcher must accept the operational memory record");
  const importedProcess = await fetch(`http://127.0.0.1:${port}/api/processes/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ sourceType: "manual", rawContent: "# Acceptance SOP\n1. Collect intake details" }),
  });
  assert.equal(importedProcess.status, 201, "first launcher must accept the process fixture");
  const revisionProcessData = await importedProcess.json();
  const processId = revisionProcessData.process.id;
  const proposed = await fetch(`http://127.0.0.1:${port}/api/processes/${encodeURIComponent(processId)}/revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ expectedVersion: 1, rawContent: "# Acceptance SOP\n1. Collect intake details\n2. Confirm owner approval" }),
  });
  assert.equal(proposed.status, 202, "SOP revision must be proposed, not immediately activated");
  const proposalData = await proposed.json();
  const currentBeforeApproval = await fetch(`http://127.0.0.1:${port}/api/processes/${encodeURIComponent(processId)}/revisions`, { headers: { Connection: "close" } });
  assert.equal((await currentBeforeApproval.json()).current.version, 1, "pending proposal must not change the active version");
  const resolved = await fetch(`http://127.0.0.1:${port}/api/processes/${encodeURIComponent(processId)}/revisions/${encodeURIComponent(proposalData.proposal.id)}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ status: "approved", approverUserId: "acceptance-reviewer" }),
  });
  assert.equal(resolved.status, 200, "reviewer must be able to activate the proposed revision");
  await stopServer();

  await startServer(port);
  const response = await fetch(`http://127.0.0.1:${port}/api/threads/${encodeURIComponent(setup.thread.id)}/messages`, { headers: { Connection: "close" } });
  assert.equal(response.status, 200, "restarted launcher must serve messages");
  const messages = await response.json();
  assert.ok(messages.some(message => message.content === "Launcher persistence acceptance marker"), "message must survive process restart");
  const audit = await (await fetch(`http://127.0.0.1:${port}/api/audit`, { headers: { Connection: "close" } })).json();
  assert.ok(audit.some(entry => entry.action === "workspace_created" && entry.targetId === workspace.id), "workspace activity must survive process restart");
  assert.ok(audit.some(entry => entry.action === "task_created" && entry.targetId === task.id), "task activity must survive process restart");
  assert.ok(audit.some(entry => entry.action === "process_agent_bound"), "SOP assignment activity must survive process restart");
  const workspaces = await (await fetch(`http://127.0.0.1:${port}/api/workspaces`, { headers: { Connection: "close" } })).json();
  assert.ok(workspaces.some(item => item.id === workspace.id), "workspace must survive process restart");
  const spaces = await (await fetch(`http://127.0.0.1:${port}/api/spaces?workspaceId=${encodeURIComponent(workspace.id)}`, { headers: { Connection: "close" } })).json();
  assert.ok(spaces.some(item => item.id === space.id), "space must survive process restart");
  const channels = await (await fetch(`http://127.0.0.1:${port}/api/channels?spaceId=${encodeURIComponent(space.id)}`, { headers: { Connection: "close" } })).json();
  assert.ok(channels.some(item => item.id === channel.id), "channel must survive process restart");
  const bindings = await (await fetch(`http://127.0.0.1:${port}/api/process-bindings?agentId=${encodeURIComponent(agent.id)}`, { headers: { Connection: "close" } })).json();
  assert.ok(bindings.some(item => item.processId === processData.process.id && item.assignedRole === "Reviewer"), "SOP assignment must survive process restart");
  const memoryResponse = await fetch(`http://127.0.0.1:${port}/api/memory?namespace=acceptance&q=durable`, { headers: { Connection: "close" } });
  assert.equal(memoryResponse.status, 200, "restarted launcher must serve persisted operational memory");
  const memories = await memoryResponse.json();
  assert.ok(memories.some(record => record.title === "Durable memory acceptance marker"), "operational memory must survive process restart");
  const revisionsResponse = await fetch(`http://127.0.0.1:${port}/api/processes/${encodeURIComponent(processId)}/revisions`, { headers: { Connection: "close" } });
  assert.equal(revisionsResponse.status, 200, "restarted launcher must serve process revision history");
  const revisions = await revisionsResponse.json();
  assert.equal(revisions.current.version, 2, "approved revision must be active after restart");
  assert.ok(revisions.proposals.some(proposal => proposal.id === proposalData.proposal.id && proposal.status === "approved"), "approval decision must survive restart");
  assert.ok(revisions.revisions.some(revision => revision.version === 1), "prior process version must survive restart");
  console.log("PASS: built vNext launcher restored workspace hierarchy, SOP-to-agent assignment, task audit events, messages, operational memory, and approved process revision history after restart.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await stopServer();
  fs.rmSync(dataDirectory, { recursive: true, force: true });
}
