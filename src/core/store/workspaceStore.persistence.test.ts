import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultWorkspaceFilePath, WorkspaceStore } from "./workspaceStore.js";
import { AgentForgeWebServer } from "../../server/webServer.js";

const temporaryDirectories: string[] = [];

function createSnapshotPath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-store-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "workspace.json");
}

async function findAvailablePort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Unable to determine an available test port.");
  await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return address.port;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("WorkspaceStore file persistence", () => {
  it("persists workspace records, messages, and inbound-event idempotency across a restart", async () => {
    const snapshotPath = createSnapshotPath();
    const firstRun = new WorkspaceStore(snapshotPath);
    const workspace = firstRun.createWorkspace({ name: "Persistence acceptance", description: "restart test" });
    firstRun.createMessage({
      channelId: "chan-general",
      authorId: "user-montelli",
      authorType: "user",
      content: "Persist this message",
    });
    const inbound = await firstRun.eventLedger.recordInboundEvent({
      eventId: "telegram:restart-test:1",
      origin: "telegram",
      eventType: "message.created",
      payload: { text: "Persist event" },
    });
    const binding = firstRun.eventLedger.registerBinding({
      provider: "telegram",
      externalChannelId: "restart-test-channel",
      agentforgeWorkspaceId: workspace.id,
      agentforgeChannelId: "chan-general",
      syncDirection: "inbound_only",
      syncState: "active",
    });

    const secondRun = new WorkspaceStore(snapshotPath);
    expect(secondRun.getWorkspace(workspace.id)?.name).toBe("Persistence acceptance");
    expect(secondRun.listAuditEntries().some(entry => entry.action === "workspace_created" && entry.targetId === workspace.id)).toBe(true);
    expect(secondRun.listMessages("chan-general").map(message => message.content)).toContain("Persist this message");
    expect(secondRun.eventLedger.replayEvents()).toContainEqual(expect.objectContaining({ eventId: inbound.entry.eventId }));
    expect(secondRun.eventLedger.findBinding("telegram", "restart-test-channel")?.id).toBe(binding.id);
    await expect(secondRun.eventLedger.recordInboundEvent({
      eventId: inbound.entry.eventId,
      origin: "telegram",
      eventType: "message.created",
      payload: { text: "Duplicate" },
    })).resolves.toMatchObject({ isDuplicate: true });
  });

  it("restores API-created messages after stopping and restarting the vNext server", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-server-store-"));
    temporaryDirectories.push(directory);
    const previousDataDirectory = process.env.AGENTFORGE_DATA_DIR;
    process.env.AGENTFORGE_DATA_DIR = directory;
    const port = await findAvailablePort();
    let server: AgentForgeWebServer | undefined;
    try {
      server = new AgentForgeWebServer(new WorkspaceStore(getDefaultWorkspaceFilePath()), port);
      await server.start();
      const status = await fetch(`http://127.0.0.1:${port}/api/status`, { headers: { Connection: "close" } });
      expect(await status.json()).toMatchObject({ storageMode: "local_json" });
      const post = await fetch(`http://127.0.0.1:${port}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Connection: "close" },
        body: JSON.stringify({ channelId: "chan-general", content: "Persist across HTTP server restart" }),
      });
      expect(post.status).toBe(201);
      await server.stop();

      server = new AgentForgeWebServer(new WorkspaceStore(getDefaultWorkspaceFilePath()), port);
      await server.start();
      const read = await fetch(`http://127.0.0.1:${port}/api/messages?channelId=chan-general`, { headers: { Connection: "close" } });
      expect(read.status).toBe(200);
      expect(await read.json()).toEqual(expect.arrayContaining([
        expect.objectContaining({ content: "Persist across HTTP server restart" }),
      ]));
    } finally {
      if (server) await server.stop();
      if (previousDataDirectory === undefined) delete process.env.AGENTFORGE_DATA_DIR;
      else process.env.AGENTFORGE_DATA_DIR = previousDataDirectory;
    }
  });

  it("round-trips operational collections through the persistent launcher store", () => {
    const snapshotPath = createSnapshotPath();
    const firstRun = new WorkspaceStore(snapshotPath);
    firstRun.createAgent({
      id: "agent-persisted",
      name: "Persisted agent",
      role: "tester",
      description: "Round-trip fixture",
      status: "idle",
      harnessPolicy: { preferredHarnessId: "native", autoResume: false },
      modelPolicy: { preferredTier: 1, preferredModel: "test-model", preferredProvider: "test", allowCloudFallback: false },
      decisionPolicy: { useSystem1Router: false },
      computePolicy: { environment: "none" },
      memoryNamespace: "test",
      tools: [],
      permissions: [],
      assignedChannelIds: [],
    });
    firstRun.createApproval({ taskId: "AF-TEST", requesterAgentId: "agent-persisted", action: "Review", risk: "low" });
    const initialProcess = firstRun.createProcess({
      id: "process-persisted", title: "Persisted process", description: "Round-trip fixture", sourceType: "manual",
      version: 1, steps: [], inputs: [], outputs: [], unresolvedRules: [], lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    firstRun.updateProcess({ ...initialProcess, title: "Persisted process revision", version: 2 }, 1);
    firstRun.rollbackProcess("process-persisted", 1, 2);
    firstRun.bindProcessToAgent({ processId: initialProcess.id, agentId: "agent-persisted", assignedRole: "Reviewer" });
    firstRun.createCall({
      id: "call-persisted", providerCallId: "provider-call-1", provider: "test", agentId: "agent-persisted",
      canonicalChannelId: "chan-calls", status: "CREATED", direction: "outbound", participants: [], startedAt: new Date().toISOString(),
    });
    firstRun.registerPackage({
      schemaVersion: "1.0.0", name: "test-package", version: "1.0.0", publisher: { id: "publisher", name: "Test" },
      description: "Round-trip fixture", license: "UNLICENSED", agentforgeVersion: "*", capabilities: [], permissions: {},
    });
    firstRun.recordInstallation({
      id: "install-persisted", packageId: "test-package", version: "1.0.0", source: "LOCAL", installedByUserId: "user-montelli",
      workspaceId: "ws-default", status: "active", approvedPermissions: {}, installedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    firstRun.recordBenchmarkResult({
      id: "benchmark-persisted", suiteId: "suite", targetType: "MODEL", targetId: "test-model", totalCases: 1,
      passedCases: 1, failedCases: 0, metrics: [], artifacts: [], passedOverall: true, executedAt: new Date().toISOString(), durationMs: 1,
    });
    firstRun.recordAudit({
      origin: "system", actorId: "system", actorType: "system", action: "persisted", targetType: "task", targetId: "AF-TEST", details: {},
    });
    firstRun.saveOperationalMemory({
      id: "memory-persisted", namespace: "test", category: "do_not_repeat", title: "Keep this rule",
      content: "Persist operational memory in the canonical workspace snapshot.", tags: ["durability"], createdAt: new Date().toISOString(),
    });

    const secondRun = new WorkspaceStore(snapshotPath);
    expect(secondRun.getAgent("agent-persisted")?.name).toBe("Persisted agent");
    expect(secondRun.listApprovals()).toHaveLength(1);
    expect(secondRun.getProcess("process-persisted")?.title).toBe("Persisted process");
    expect(secondRun.getProcess("process-persisted")?.version).toBe(3);
    expect(secondRun.listProcessRevisions("process-persisted").map(revision => revision.version)).toEqual([1, 2]);
    expect(secondRun.listProcessAgentBindings({ processId: "process-persisted" })).toMatchObject([
      { processId: "process-persisted", agentId: "agent-persisted", assignedRole: "Reviewer" },
    ]);
    expect(secondRun.getCall("call-persisted")?.providerCallId).toBe("provider-call-1");
    expect(secondRun.getPackage("test-package")?.version).toBe("1.0.0");
    expect(secondRun.listInstallations()).toHaveLength(1);
    expect(secondRun.listBenchmarkResults()).toHaveLength(1);
    expect(secondRun.listAuditEntries()).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "persisted", targetId: "AF-TEST" }),
      expect.objectContaining({ action: "agent_created", targetId: "agent-persisted" }),
      expect.objectContaining({ action: "process_agent_bound" }),
    ]));
    expect(secondRun.listOperationalMemories("test")).toEqual([
      expect.objectContaining({ id: "memory-persisted", title: "Keep this rule", category: "do_not_repeat" }),
    ]);
  });

  it("persists revision proposals and activates them only after approval", () => {
    const snapshotPath = createSnapshotPath();
    const store = new WorkspaceStore(snapshotPath);
    const process = store.createProcess({
      id: "process-proposal", title: "Draft", description: "Approval fixture", sourceType: "manual",
      version: 1, steps: [], inputs: [], outputs: [], unresolvedRules: [], lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    const revision = { ...process, title: "Proposed", version: 2 };
    const proposal = store.createProcessRevisionProposal({
      processId: process.id,
      expectedVersion: 1,
      revision,
      diff: {
        processId: process.id, previousVersion: 1, newVersion: 2, addedSteps: [], modifiedSteps: [],
        deletedStepIds: [], newUnresolvedRules: [], affectedAgentIds: [], detectedAt: new Date().toISOString(),
      },
    });
    expect(store.getProcess(process.id)?.version).toBe(1);
    const reloaded = new WorkspaceStore(snapshotPath);
    expect(reloaded.listProcessRevisionProposals(process.id)).toMatchObject([{ id: proposal.id, status: "pending" }]);
    const result = reloaded.resolveProcessRevisionProposal({ proposalId: proposal.id, status: "approved", approverUserId: "reviewer" });
    expect(result.process).toMatchObject({ title: "Proposed", version: 2 });
    const rejectedProposal = reloaded.createProcessRevisionProposal({
      processId: process.id,
      expectedVersion: 2,
      revision: { ...result.process!, title: "Rejected", version: 3 },
      diff: {
        processId: process.id, previousVersion: 2, newVersion: 3, addedSteps: [], modifiedSteps: [],
        deletedStepIds: [], newUnresolvedRules: [], affectedAgentIds: [], detectedAt: new Date().toISOString(),
      },
    });
    const rejected = reloaded.resolveProcessRevisionProposal({ proposalId: rejectedProposal.id, status: "rejected", approverUserId: "reviewer" });
    expect(rejected.process).toBeUndefined();
    expect(reloaded.getProcess(process.id)).toMatchObject({ title: "Proposed", version: 2 });
    expect(new WorkspaceStore(snapshotPath).listProcessRevisionProposals(process.id)).toMatchObject([
      { status: "approved" }, { status: "rejected" },
    ]);
  });

  it("migrates version-one snapshots without losing existing workspace data", () => {
    const snapshotPath = createSnapshotPath();
    const original = new WorkspaceStore(snapshotPath);
    const workspace = original.createWorkspace({ name: "Version one", description: "legacy snapshot" });
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as Record<string, unknown>;
    snapshot.schemaVersion = 1;
    delete snapshot.operationalMemories;
    delete snapshot.processRevisionHistory;
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), "utf-8");

    const migrated = new WorkspaceStore(snapshotPath);
    expect(migrated.getWorkspace(workspace.id)?.name).toBe("Version one");
    expect(migrated.listOperationalMemories("test")).toEqual([]);
    expect(JSON.parse(fs.readFileSync(snapshotPath, "utf-8")).schemaVersion).toBe(5);
  });

  it("migrates version-two snapshots and initializes empty process history", () => {
    const snapshotPath = createSnapshotPath();
    const original = new WorkspaceStore(snapshotPath);
    const workspace = original.createWorkspace({ name: "Version two", description: "legacy snapshot" });
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as Record<string, unknown>;
    snapshot.schemaVersion = 2;
    delete snapshot.processRevisionHistory;
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), "utf-8");

    const migrated = new WorkspaceStore(snapshotPath);
    expect(migrated.getWorkspace(workspace.id)?.name).toBe("Version two");
    expect(JSON.parse(fs.readFileSync(snapshotPath, "utf-8")).schemaVersion).toBe(5);
  });

  it("migrates version-three process history and initializes revision proposals", () => {
    const snapshotPath = createSnapshotPath();
    const original = new WorkspaceStore(snapshotPath);
    const process = original.createProcess({
      id: "process-v3", title: "Version three", description: "legacy process history", sourceType: "manual",
      version: 1, steps: [], inputs: [], outputs: [], unresolvedRules: [], lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    original.updateProcess({ ...process, version: 2, title: "Version three current" }, 1);
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as Record<string, unknown>;
    snapshot.schemaVersion = 3;
    delete snapshot.processRevisionProposals;
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), "utf-8");

    const migrated = new WorkspaceStore(snapshotPath);
    expect(migrated.getProcess(process.id)).toMatchObject({ version: 2, title: "Version three current" });
    expect(migrated.listProcessRevisions(process.id)).toMatchObject([{ version: 1 }]);
    expect(migrated.listProcessRevisionProposals(process.id)).toEqual([]);
    expect(JSON.parse(fs.readFileSync(snapshotPath, "utf-8")).schemaVersion).toBe(5);
  });

  it("migrates version-four snapshots and initializes empty process-agent bindings", () => {
    const snapshotPath = createSnapshotPath();
    const original = new WorkspaceStore(snapshotPath);
    const workspace = original.createWorkspace({ name: "Version four", description: "legacy snapshot" });
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as Record<string, unknown>;
    snapshot.schemaVersion = 4;
    delete snapshot.processAgentBindings;
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), "utf-8");

    const migrated = new WorkspaceStore(snapshotPath);
    expect(migrated.getWorkspace(workspace.id)?.name).toBe("Version four");
    expect(migrated.listProcessAgentBindings()).toEqual([]);
    expect(JSON.parse(fs.readFileSync(snapshotPath, "utf-8")).schemaVersion).toBe(5);
  });

  it("recovers from a corrupt primary, repairs it, and keeps the known-good backup", () => {
    const snapshotPath = createSnapshotPath();
    const original = new WorkspaceStore(snapshotPath);
    const saved = original.createWorkspace({ name: "Backup survives", description: "recovery test" });
    original.createTask({ id: "AF-PERSIST-1", title: "Persist task", priority: "medium", status: "in_progress" });
    const backupBeforeRecovery = fs.readFileSync(`${snapshotPath}.bak`, "utf-8");
    fs.writeFileSync(snapshotPath, "{ truncated", "utf-8");

    const restored = new WorkspaceStore(snapshotPath);
    expect(restored.getWorkspace(saved.id)?.name).toBe("Backup survives");
    expect(fs.readFileSync(`${snapshotPath}.bak`, "utf-8")).toBe(backupBeforeRecovery);
    expect(() => JSON.parse(fs.readFileSync(snapshotPath, "utf-8"))).not.toThrow();
    expect(new WorkspaceStore(snapshotPath).getWorkspace(saved.id)?.name).toBe("Backup survives");
  });

  it("rejects unsupported snapshot versions and falls back to a valid backup", () => {
    const snapshotPath = createSnapshotPath();
    const store = new WorkspaceStore(snapshotPath);
    const workspace = store.createWorkspace({ name: "Version fallback", description: "version test" });
    store.createTask({ id: "AF-PERSIST-2", title: "Create backup", priority: "low", status: "ready" });
    fs.writeFileSync(snapshotPath, JSON.stringify({ schemaVersion: 999 }), "utf-8");

    expect(new WorkspaceStore(snapshotPath).getWorkspace(workspace.id)?.name).toBe("Version fallback");
  });
});
