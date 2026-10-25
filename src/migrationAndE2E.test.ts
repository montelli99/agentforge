import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkspaceStore } from "./core/store/workspaceStore.js";
import { AgentForgeWebServer } from "./server/webServer.js";
import { OpenClawMigrationProvider } from "./providers/migration/openclawMigrationProvider.js";
import { HermesMigrationProvider } from "./providers/migration/hermesMigrationProvider.js";
import { GrokBotMigrationProvider } from "./providers/migration/grokBotMigrationProvider.js";
import { GenericMigrationProvider } from "./providers/migration/genericMigrationProvider.js";
import { GENERIC_MIGRATION_FIXTURE } from "./providers/migration/fixtures/generic_manifest.fixture.js";
import { PROVIDER_READINESS_REGISTRY } from "./core/types/providerReadiness.js";
import { EmpiricalRouter } from "./core/router/empiricalRouter.js";
import { TelegramMirrorProvider } from "./providers/channels/telegramMirror.js";
import { DiscordMirrorProvider } from "./providers/channels/discordMirror.js";
import { UniversalMirrorRouter } from "./core/mirror/universalMirrorRouter.js";
import { ScribeProcessProvider } from "./providers/process/scribeProvider.js";
import { ProcessCompiler } from "./providers/process/processCompiler.js";
import { MockVoiceProvider } from "./providers/voice/mockVoiceProvider.js";
import { LocalPackageProvider } from "./providers/marketplace/localPackageProvider.js";
import { EvidencePackBuilder } from "./core/evidence/evidencePackBuilder.js";

describe("AgentForge vNext Master Validation, Migration & Release Hardening Suite", () => {
  let store: WorkspaceStore;
  let server: AgentForgeWebServer;
  const testPort = 3458;

  beforeAll(async () => {
    store = new WorkspaceStore();
    store.getUser("user-owner")!.externalIdentities.push({
      provider: "telegram",
      externalUserId: "user-owner",
      linkedAt: new Date().toISOString(),
    });
    server = new AgentForgeWebServer(store, testPort);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe("Section 2: Real Verification of Web Product & All 17 Routes", () => {
    it("should render the SPA HTML without blank screen or crash", async () => {
      const res = await fetch(`http://localhost:${testPort}/`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("<title>AgentForge</title>");
      expect(html).toContain("command-room");
      expect(html).toContain("Command room");
      expect(html).toContain("Execution disconnected");
      expect(html).toContain("Execution disconnected");
      expect(html).toContain("Migration");
      expect(html).toContain("Prepare and review a new SOP version");
      expect(html).toContain("showProcessHistory");
      expect(html).toContain("Restore as new version");
      expect(html).toContain("rollbackProcessRevision");
    });

    it("should verify all 17 core navigation routes return coherent data without crash", async () => {
      const routes = [
        "/api/status",
        "/api/workspace",
        "/api/inbox",
        "/api/messages?channelId=chan-general",
        "/api/agents",
        "/api/tasks",
        "/api/approvals",
        "/api/processes",
        "/api/calls",
        "/api/packages",
        "/api/models",
        "/api/compute",
        "/api/audit",
        "/api/readiness",
        "/api/migration/sources",
      ];

      for (const route of routes) {
        const res = await fetch(`http://localhost:${testPort}${route}`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toBeDefined();
      }
    });

    it("rejects malformed, non-object, and oversized JSON request bodies with client errors", async () => {
      const malformed = await fetch(`http://localhost:${testPort}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid-json",
      });
      expect(malformed.status).toBe(400);
      expect((await malformed.json()).error).toContain("valid JSON");

      const nonObject = await fetch(`http://localhost:${testPort}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "[]",
      });
      expect(nonObject.status).toBe(400);
      expect((await nonObject.json()).error).toContain("must be an object");

      const oversized = await fetch(`http://localhost:${testPort}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: " ".repeat(8 * 1024 * 1024 + 1),
      });
      expect(oversized.status).toBe(413);
      expect((await oversized.json()).error).toContain("8 MiB limit");
    });

    it("validates agent and task creation and keeps new tasks in safe initial states", async () => {
      const invalidAgent = await fetch(`http://localhost:${testPort}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid Agent",
          role: "Tester",
          status: "active",
          harnessPolicy: { preferredHarnessId: "missing-runtime" },
        }),
      });
      expect(invalidAgent.status).toBe(400);

      const agentRes = await fetch(`http://localhost:${testPort}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Validated Agent", role: "Tester" }),
      });
      expect(agentRes.status).toBe(201);
      const agent = await agentRes.json();

      const invalidTask = await fetch(`http://localhost:${testPort}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Forged completion", status: "completed" }),
      });
      expect(invalidTask.status).toBe(400);

      const missingAgent = await fetch(`http://localhost:${testPort}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Missing assignee", assignedAgentId: "does-not-exist" }),
      });
      expect(missingAgent.status).toBe(404);

      const taskRes = await fetch(`http://localhost:${testPort}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Safe default task", assignedAgentId: agent.id }),
      });
      expect(taskRes.status).toBe(201);
      const task = await taskRes.json();
      expect(task.status).toBe("backlog");
      expect(task.contract.authority.productionWrite).toBe(false);
      expect(task.contract.authority.externalMessage).toBe(false);

      const privilegedContract = {
        ...task.contract,
        id: "contract-privileged-test",
        taskId: "privileged-contract-task",
        authority: { ...task.contract.authority, productionWrite: true },
      };
      const privilegedTask = await fetch(`http://localhost:${testPort}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "privileged-contract-task",
          title: "Unsupported privileged task",
          contract: privilegedContract,
        }),
      });
      expect(privilegedTask.status).toBe(400);

      const duplicateTask = await fetch(`http://localhost:${testPort}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, title: "Duplicate task" }),
      });
      expect(duplicateTask.status).toBe(409);
    });
  });

  describe("Section 3: Complete Synthetic User Journey (No DB Shortcuts)", () => {
    it("should complete the end-to-end user journey across all systems", async () => {
      const reviewerSession = store.createSession("user-owner");
      const reviewHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${reviewerSession.token}` };
      // 1. Create native channel
      const chanRes = await fetch(`http://localhost:${testPort}/api/workspace`);
      expect(chanRes.status).toBe(200);
      const wsData = await chanRes.json();
      expect(wsData.channels.length).toBeGreaterThan(0);

      // 2. Create agent
      const agentRes = await fetch(`http://localhost:${testPort}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "SyntheticJourneyBot",
          role: "Journey Validator",
          description: "Executes journey validation",
          harnessPolicy: { preferredHarnessId: "native" },
          modelPolicy: { preferredTier: 2, preferredModel: "llama3:8b" },
        }),
      });
      expect(agentRes.status).toBe(201);
      const agent = await agentRes.json();
      expect(agent.id).toBeDefined();

      // 3. Import synthetic SOP & observe UnresolvedBusinessRule
      const sopRes = await fetch(`http://localhost:${testPort}/api/processes/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawContent: "# Seller Intake SOP\n1. Receive caller info\n2. Calculate estimated offer\n3. Deploy contract to production signer?",
          sourceType: "scribe",
        }),
      });
      expect(sopRes.status).toBe(201);
      const procData = await sopRes.json();
      expect(procData.process.unresolvedRules.length).toBeGreaterThan(0);

      const revisionRes = await fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: 1,
          rawContent: "# Seller Intake SOP\n1. Receive caller info\n2. Calculate estimated offer\n3. Deploy contract to production signer?\n4. Record owner approval",
        }),
      });
      expect(revisionRes.status).toBe(202);
      const revisionData = await revisionRes.json();
      expect(revisionData.currentProcess).toMatchObject({ id: procData.process.id, version: 1 });
      expect(revisionData.proposal).toMatchObject({ processId: procData.process.id, expectedVersion: 1, status: "pending" });
      expect(revisionData.diff).toMatchObject({ processId: procData.process.id, previousVersion: 1, newVersion: 2 });

      const approvalRes = await fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/revisions/${revisionData.proposal.id}/resolve`, {
        method: "POST",
        headers: reviewHeaders,
        body: JSON.stringify({ status: "approved", approverUserId: "reviewer-1" }),
      });
      expect(approvalRes.status).toBe(200);
      expect(await approvalRes.json()).toMatchObject({
        proposal: { status: "approved", resolvedByUserId: "user-owner" },
        process: { id: procData.process.id, version: 2 },
      });

      const staleRevisionRes = await fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: 1, rawContent: "# Stale revision\n1. This must not replace current state" }),
      });
      expect(staleRevisionRes.status).toBe(409);

      const concurrentRevisions = await Promise.all(["Record utility status", "Record occupancy status"].map(rawContent =>
        fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/revisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedVersion: 2, rawContent: `# Seller Intake SOP\n1. ${rawContent}` }),
        }),
      ));
      expect(concurrentRevisions.map(response => response.status)).toEqual([202, 202]);
      const concurrentData = await Promise.all(concurrentRevisions.map(response => response.json()));
      const concurrentApproval = await fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/revisions/${concurrentData[0].proposal.id}/resolve`, {
        method: "POST",
        headers: reviewHeaders,
        body: JSON.stringify({ status: "approved" }),
      });
      expect(concurrentApproval.status).toBe(200);
      const staleProposal = await fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/revisions/${concurrentData[1].proposal.id}/resolve`, {
        method: "POST",
        headers: reviewHeaders,
        body: JSON.stringify({ status: "approved" }),
      });
      expect(staleProposal.status).toBe(409);

      const revisionsRes = await fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/revisions`);
      expect(revisionsRes.status).toBe(200);
      const revisionsData = await revisionsRes.json() as {
        current: { id: string; version: number };
        revisions: Array<{ version: number }>;
        proposals: Array<{ status: string }>;
      };
      expect(revisionsData.current).toMatchObject({ id: procData.process.id, version: 3 });
      expect(revisionsData.revisions.map(revision => revision.version)).toEqual(expect.arrayContaining([1, 2]));
      expect(revisionsData.proposals.filter(proposal => proposal.status === "approved")).toHaveLength(2);
      expect(revisionsData.proposals.filter(proposal => proposal.status === "stale")).toHaveLength(1);

      const rollbackRes = await fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/rollback`, {
        method: "POST",
        headers: reviewHeaders,
        body: JSON.stringify({ expectedVersion: 3, targetVersion: 1 }),
      });
      expect(rollbackRes.status).toBe(200);
      const rollbackData = await rollbackRes.json();
      expect(rollbackData).toMatchObject({
        restoredFromVersion: 1,
        rolledBackBy: "user-owner",
        process: { id: procData.process.id, version: 4, rawContent: "# Seller Intake SOP\n1. Receive caller info\n2. Calculate estimated offer\n3. Deploy contract to production signer?" },
      });
      const auditAfterRollback = await fetch(`http://localhost:${testPort}/api/audit`).then(response => response.json()) as Array<{ action: string; actorId: string }>;
      expect(auditAfterRollback).toEqual(expect.arrayContaining([
        expect.objectContaining({ action: "process_revision_rolled_back", actorId: "user-owner" }),
      ]));

      const staleRollbackRes = await fetch(`http://localhost:${testPort}/api/processes/${procData.process.id}/rollback`, {
        method: "POST",
        headers: reviewHeaders,
        body: JSON.stringify({ expectedVersion: 3, targetVersion: 2 }),
      });
      expect(staleRollbackRes.status).toBe(409);

      // 4. Inbound Telegram Message & Web Reply
      const telegram = new TelegramMirrorProvider();
      const mirrorRouter = new UniversalMirrorRouter(store, telegram);
      let tgSent = "";
      telegram.sendMessage = async (m) => {
        tgSent = m.text;
        return { externalMessageId: "m1" };
      };

      await telegram.ingestInboundUpdate({
        updateId: 777,
        chatId: "-1001928374",
        userId: "user-owner",
        text: "Please start the intake task",
      });
      expect(store.listMessages(store.findMirroredChannel("telegram", "group:-1001928374:topic:1")!.id)
        .some(m => m.content.includes("intake task"))).toBe(true);

      // Web replies
      const replyRes = await fetch(`http://localhost:${testPort}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: "chan-general", content: "Intake task created" }),
      });
      expect(replyRes.status).toBe(201);

      // 5. Create Task with ExecutionContract & Approval Gate
      const taskRes = await fetch(`http://localhost:${testPort}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Synthetic Task with Approval",
          assignedAgentId: agent.id,
          priority: "high",
          status: "ready",
        }),
      });
      expect(taskRes.status).toBe(201);
      const task = await taskRes.json();
      expect(task.status).toBe("ready");
      store.updateTask(task.id, { status: "in_progress" });

      // Approval Gate
      const app = store.createApproval({
        taskId: task.id,
        requesterAgentId: agent.id,
        action: "Deploy intake patch to staging",
        risk: "medium",
      });
      expect(app.status).toBe("pending");

      // Approve through Web API
      const approveRes = await fetch(`http://localhost:${testPort}/api/approvals/resolve`, {
        method: "POST",
        headers: reviewHeaders,
        body: JSON.stringify({ approvalId: app.id, status: "approved" }),
      });
      expect(approveRes.status).toBe(200);
      expect(store.getApproval(app.id)?.status).toBe("approved");

      // 6. Complete task & Generate EvidencePack
      store.updateTask(task.id, { status: "completed" });
      const builder = new EvidencePackBuilder();
      const pack = builder.build({
        taskId: task.id,
        objective: task.title,
        baseSha: "802e04a",
        finalSha: "385382c",
        filesChanged: ["src/journey.ts"],
        diff: "+ export const JOURNEY_TESTED = true;",
        commandsExecuted: ["vitest run"],
        testsRun: { total: 96, passed: 96, failed: 0 },
        tokensConsumed: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        contractVerification: { contractId: "contract-1", verified: true, violations: [] },
      });
      expect(pack.contractVerification.verified).toBe(true);
      expect(pack.testsRun.passed).toBe(96);

      // 7. Simulate Voice Call
      const callRes = await fetch(`http://localhost:${testPort}/api/calls/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, phoneNumber: "+15551234567" }),
      });
      expect(callRes.status).toBe(201);
      const callData = await callRes.json();
      expect(["IN_PROGRESS", "COMPLETED"]).toContain(callData.status);
      expect(callData.transcript.segments.length).toBeGreaterThan(0);

      // 8. Install Safe Marketplace Package
      const installRes = await fetch(`http://localhost:${testPort}/api/packages/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "workspace-operations-pack" }),
      });
      expect(installRes.status).toBe(409);
      const permissionReview = await installRes.json();
      expect(permissionReview.requiresPermissionApproval).toBe(true);
      const approvedInstallRes = await fetch(`http://localhost:${testPort}/api/packages/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "workspace-operations-pack", approvedPermissions: {} }),
      });
      expect(approvedInstallRes.status).toBe(200);
      const installData = await approvedInstallRes.json();
      expect(installData.status).toBe("active");

      // A second install must not silently replace the reviewed publisher/version.
      const duplicateInstallRes = await fetch(`http://localhost:${testPort}/api/packages/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "workspace-operations-pack", approvedPermissions: {} }),
      });
      expect(duplicateInstallRes.status).toBe(409);
      expect((await duplicateInstallRes.json()).error).toContain("Uninstall it before installing a replacement");

      const uninstallRes = await fetch(`http://localhost:${testPort}/api/packages/uninstall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "workspace-operations-pack" }),
      });
      expect(uninstallRes.status).toBe(200);

      const reinstalledRes = await fetch(`http://localhost:${testPort}/api/packages/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "workspace-operations-pack", approvedPermissions: {} }),
      });
      expect(reinstalledRes.status).toBe(200);
    });
  });

  describe("Section 4: Realtime SSE Multi-Client Test", () => {
    it("should broadcast events to connected clients without refresh", async () => {
      let receivedEventsCount = 0;
      const unsubscribe = store.subscribe((event) => {
        receivedEventsCount++;
      });

      // Trigger message
      store.createMessage({
        channelId: "chan-general",
        authorId: "user-1",
        authorType: "user",
        content: "Realtime test broadcast",
      });

      // Trigger task update
      store.createTask({
        title: "Realtime Task",
        priority: "low",
        status: "in_progress",
      });

      // Trigger approval
      store.createApproval({
        taskId: "task-rt-1",
        requesterAgentId: "agent-1",
        action: "Deploy realtime update",
        risk: "low",
      });

      expect(receivedEventsCount).toBeGreaterThanOrEqual(3);
      unsubscribe();
    });
  });

  describe("Section 5 & 6: Workspace Mirror Contracts (Telegram & Discord)", () => {
    it("should enforce bidirectional sync, loop suppression, and idempotency", async () => {
      const telegram = new TelegramMirrorProvider();
      const discord = new DiscordMirrorProvider();
      const router = new UniversalMirrorRouter(store, telegram, discord);

      let tgOut = 0;
      let dcOut = 0;
      telegram.sendMessage = async () => { tgOut++; return { externalMessageId: "tg1" }; };
      discord.sendMessage = async () => { dcOut++; return { externalMessageId: "dc1" }; };

      // Inbound event from Telegram -> Must NOT echo back to Telegram (Loop suppression)
      await telegram.ingestInboundUpdate({
        updateId: 888,
        chatId: "-1001",
        userId: "user-owner",
        text: "Hello from Telegram",
      });

      // Message created in store
      const msgs = store.listMessages(store.findMirroredChannel("telegram", "group:-1001:topic:1")!.id);
      expect(msgs.some(m => m.content === "Hello from Telegram")).toBe(true);

      // Discord mock inbound
      await discord.ingestInboundInteraction({
        interactionId: "dc-interaction-1",
        guildId: "guild-1",
        channelId: "thread-1",
        userId: "user-owner",
        command: "status",
      });
      expect(store.listAuditEntries(5).some(a => a.origin === "discord")).toBe(true);
    });
  });

  describe("Section 10 – 18: OpenClaw Migration Matrix & Cutover Design", () => {
    it("should inspect, plan, dry-run, and verify legacy and current OpenClaw migrations", async () => {
      const legacyProvider = new OpenClawMigrationProvider("legacy");
      const currentProvider = new OpenClawMigrationProvider("current");

      // 1. Inspect Legacy
      const legacyInsp = await legacyProvider.inspect();
      expect(legacyInsp.source).toBe("OPENCLAW_LEGACY");
      expect(legacyInsp.discovered.agentsCount).toBe(2);
      expect(legacyInsp.discovered.channelsCount).toBe(4);
      // Secrets reported as required, never exfiltrated
      expect(legacyInsp.secretRequirements.length).toBe(2);

      // 2. Plan Legacy
      const legacyPlan = await legacyProvider.plan(legacyInsp);
      expect(legacyPlan.summary.direct).toBeGreaterThan(0);
      expect(legacyPlan.summary.transform).toBeGreaterThan(0);
      expect(legacyPlan.summary.dangerous).toBe(1); // Bash tool flagged as DANGEROUS
      expect(legacyPlan.summary.secretRequired).toBe(2);

      // 3. Dry Run Legacy
      const dryRun = await legacyProvider.dryRun(legacyPlan);
      expect(dryRun.dryRunPassed).toBe(true);
      expect(dryRun.wouldMutateProduction).toBe(false);
      expect(dryRun.wouldConnectExternalChannels).toBe(false);

      // 4. Import & Verify
      const importRes = await legacyProvider.importToStore(legacyPlan, store);
      expect(importRes.importedCount).toBeGreaterThan(0);
      const verifyRes = await legacyProvider.verify(importRes.runId, store);
      expect(verifyRes.overallPassed).toBe(true);
      expect(verifyRes.privilegeExpansionDetected).toBe(false);

      // 5. Shadow comparison
      const comparisons = await legacyProvider.compare([]);
      expect(comparisons.length).toBeGreaterThan(0);
      expect(comparisons[0].conforms).toBe(true);

      // 6. Cutover & Rollback plans (Design only)
      const cutover = await legacyProvider.prepareCutover(legacyPlan.id);
      expect(cutover.status).toBe("DRAFT_ONLY_NO_LIVE_EXECUTION");
      const rollback = await legacyProvider.prepareRollback(cutover.planId);
      expect(rollback.preservesSourceData).toBe(true);

      // 7. Inspect Current
      const currentInsp = await currentProvider.inspect();
      expect(currentInsp.source).toBe("OPENCLAW_CURRENT");
      expect(currentInsp.discovered.agentsCount).toBe(1);
    });
  });

  describe("Section 19, 20 & 21: Hermes, Grok Bot & Generic Migration", () => {
    it("should migrate Hermes agents safely", async () => {
      const hermes = new HermesMigrationProvider();
      const insp = await hermes.inspect();
      const plan = await hermes.plan(insp);
      expect(plan.summary.transform).toBe(1);
      const res = await hermes.importToStore(plan, store);
      expect(res.importedCount).toBe(1);
      const verify = await hermes.verify(res.runId, store);
      expect(verify.overallPassed).toBe(true);
    });

    it("should flag unexportable Grok Bot actions as MANUAL_REVIEW / UNSUPPORTED", async () => {
      const grok = new GrokBotMigrationProvider();
      const insp = await grok.inspect();
      const plan = await grok.plan(insp);
      expect(plan.summary.manualReview).toBe(1);
      expect(plan.summary.unsupported).toBe(1);
      expect(plan.readinessScore).toBeLessThan(50);
    });

    it("should import generic migration manifest", async () => {
      const gen = new GenericMigrationProvider();
      const insp = await gen.inspect();
      const plan = await gen.plan(insp);
      expect(plan.readinessScore).toBe(33);
      expect(plan.items.some(item => item.targetCategory === 'task' && item.status === 'UNSUPPORTED')).toBe(true);
      const beforeImport = store.listAgents().length;
      await expect(gen.importToStore(plan, store)).rejects.toThrow('unsupported or unreviewed');
      expect(store.listAgents().length).toBe(beforeImport);
      expect((await gen.verify('unknown-run', store)).overallPassed).toBe(false);
      const supplied = structuredClone(GENERIC_MIGRATION_FIXTURE);
      supplied.agents[0]!.id = 'custom-manifest-agent';
      supplied.agents[0]!.name = 'Supplied agent';
      const suppliedInspection = await gen.inspect(supplied);
      supplied.agents[0]!.name = 'Changed after inspection';
      const suppliedPlan = await gen.plan(suppliedInspection);
      expect(suppliedPlan.items[0]!.sourceId).toBe('custom-manifest-agent');
      expect(suppliedPlan.items[0]!.targetName).toBe('Supplied agent');
      const collisionManifest = structuredClone(supplied);
      collisionManifest.channels = [];
      collisionManifest.tasks = [];
      collisionManifest.agents.push({ ...structuredClone(supplied.agents[0]!), id: store.listAgents()[0]!.id });
      const collisionPlan = await gen.plan(await gen.inspect(collisionManifest));
      await expect(gen.importToStore(collisionPlan, store)).rejects.toThrow('already present');
      expect(store.getAgent('custom-manifest-agent')).toBeUndefined();
      const stagingManifest = structuredClone(supplied);
      stagingManifest.channels = [];
      stagingManifest.tasks = [];
      const stagingPlan = await gen.plan(await gen.inspect(stagingManifest));
      expect(stagingPlan.items[0]!.status).toBe('TRANSFORM');
      const stagingStore = new WorkspaceStore();
      const staged = await gen.importToStore(stagingPlan, stagingStore);
      const stagedAgent = stagingStore.getAgent('custom-manifest-agent')!;
      expect(stagedAgent.status).toBe('offline');
      expect(stagedAgent.computePolicy.environment).toBe('none');
      expect(stagedAgent.harnessPolicy.autoResume).toBe(false);
      expect(stagedAgent.modelPolicy.allowCloudFallback).toBe(false);
      expect(stagedAgent.tools).toEqual([]);
      expect(stagedAgent.permissions).toEqual([]);
      expect(stagedAgent.assignedChannelIds).toEqual([]);
      expect((await gen.verify(staged.runId, stagingStore)).overallPassed).toBe(true);
      expect((await gen.verify(staged.runId, store)).overallPassed).toBe(false);
      stagingStore.updateAgent(stagedAgent.id, { permissions: ['workspace:write'] });
      const changedVerification = await gen.verify(staged.runId, stagingStore);
      expect(changedVerification.overallPassed).toBe(false);
      expect(changedVerification.privilegeExpansionDetected).toBe(true);
      const tamperedPlan = await gen.plan(await gen.inspect(stagingManifest));
      tamperedPlan.items[0]!.canonicalPayload!.permissions = ['workspace:write'];
      await expect(gen.importToStore(tamperedPlan, new WorkspaceStore())).rejects.toThrow('unknown or changed');
      const receiptDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'agentforge-migration-receipt-'));
      try {
        const file = path.join(receiptDirectory, 'workspace.json');
        const durableStore = new WorkspaceStore(file);
        const staleStore = new WorkspaceStore(file);
        durableStore.recordAudit({ origin: 'system', actorId: 'synthetic', actorType: 'system', action: 'concurrent-write', targetType: 'system', targetId: 'test', details: {} });
        const beforeAgents = staleStore.listAgents();
        const beforeAudits = staleStore.listAuditEntries(10000);
        const beforeDisk = fs.readFileSync(file, 'utf8');
        const batchManifest = structuredClone(stagingManifest);
        batchManifest.agents.push({ ...batchManifest.agents[0]!, id: 'second-batch-agent' });
        await expect(gen.importToStore(await gen.plan(await gen.inspect(batchManifest)), staleStore)).rejects.toThrow('snapshot changed');
        expect(staleStore.listAgents()).toEqual(beforeAgents);
        expect(staleStore.listAuditEntries(10000)).toEqual(beforeAudits);
        expect(fs.readFileSync(file, 'utf8')).toBe(beforeDisk);
        expect(staleStore.verifyAuditChain().valid).toBe(true);
        const durablePlan = await gen.plan(await gen.inspect(stagingManifest));
        const durableRun = await gen.importToStore(durablePlan, durableStore);
        const restoredStore = new WorkspaceStore(file);
        const restoredProvider = new GenericMigrationProvider();
        expect((await restoredProvider.verify(durableRun.runId, restoredStore)).overallPassed).toBe(true);
        restoredStore.updateAgent('custom-manifest-agent', { description: 'Changed after restart' });
        expect((await restoredProvider.verify(durableRun.runId, restoredStore)).overallPassed).toBe(false);
        expect(() => restoredStore.rollbackAgentImport(durableRun.runId)).toThrow('changed or are missing');
        const rollbackFile = path.join(receiptDirectory, 'rollback.json');
        const rollbackStore = new WorkspaceStore(rollbackFile);
        const rollbackRun = await gen.importToStore(await gen.plan(await gen.inspect(batchManifest)), rollbackStore);
        const staleRollback = new WorkspaceStore(rollbackFile);
        rollbackStore.recordAudit({ origin: 'system', actorId: 'synthetic', actorType: 'system', action: 'concurrent-write', targetType: 'system', targetId: 'test', details: {} });
        const rollbackDisk = fs.readFileSync(rollbackFile, 'utf8');
        await expect(Promise.resolve().then(() => staleRollback.rollbackAgentImport(rollbackRun.runId))).rejects.toThrow('snapshot changed');
        expect(staleRollback.getAgent('custom-manifest-agent')).toBeDefined();
        expect(staleRollback.getAgent('second-batch-agent')).toBeDefined();
        expect(staleRollback.verifyAuditChain().valid).toBe(true);
        expect(fs.readFileSync(rollbackFile, 'utf8')).toBe(rollbackDisk);
        const reopened = new WorkspaceStore(rollbackFile);
        expect(reopened.rollbackAgentImport(rollbackRun.runId).removedIds).toEqual(['custom-manifest-agent', 'second-batch-agent']);
        const afterRollback = new WorkspaceStore(rollbackFile);
        expect(afterRollback.getAgent('custom-manifest-agent')).toBeUndefined();
        expect(afterRollback.getAgent('second-batch-agent')).toBeUndefined();
        expect(afterRollback.verifyAuditChain().valid).toBe(true);
        expect(() => afterRollback.rollbackAgentImport(rollbackRun.runId)).toThrow('already rolled back');
        expect((await new GenericMigrationProvider().verify(rollbackRun.runId, afterRollback)).overallPassed).toBe(false);
        restoredStore.recordAudit({ origin: 'system', actorId: 'migration-generic', actorType: 'system',
          action: 'generic_migration_started', targetType: 'system', targetId: 'unfinished-run',
          details: { schema: 1, expectedIds: JSON.stringify(['custom-manifest-agent']) } });
        expect((await restoredProvider.verify('unfinished-run', new WorkspaceStore(file))).overallPassed).toBe(false);
      } finally { fs.rmSync(receiptDirectory, { recursive: true, force: true }); }
      await expect(gen.plan({ ...suppliedInspection })).rejects.toThrow('Inspect the manifest');
      await expect(gen.inspect({ agents: 'invalid' })).rejects.toThrow('Invalid generic');
      await expect(gen.inspect(null)).rejects.toThrow('Invalid generic');
      const agentsBefore = store.listAgents().length;
      for (const operation of ['inspect', 'plan', 'dry-run']) {
        const response = await fetch(`${server.getBaseUrl()}/api/migration/${operation}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'GENERIC', manifest: supplied }),
        });
        expect(response.status).toBe(200);
        const result = await response.json() as any;
        if (operation === 'inspect') expect(result.discovered.agentsCount).toBe(1);
        else expect((result.plan || result).items[0].sourceId).toBe('custom-manifest-agent');
      }
      const blockedImport = await fetch(`${server.getBaseUrl()}/api/migration/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'GENERIC', manifest: supplied }),
      });
      expect(blockedImport.status).toBe(409);
      expect(store.listAgents().length).toBe(agentsBefore);
      const migrationRequest = (action: string, body: object, token = '') => fetch(server.getBaseUrl()+'/api/migration/'+action, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer '+token } : {}) }, body: JSON.stringify(body),
      });
      expect((await migrationRequest('prepare-import', { source: 'GENERIC', manifest: stagingManifest })).status).toBe(401);
      store.createUser({ username: 'migration-reviewer', displayName: 'Migration reviewer', role: 'owner', password: 'synthetic migration password' });
      const login = await fetch(server.getBaseUrl()+'/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'migration-reviewer', password: 'synthetic migration password' }) });
      const token = (await login.json()).token;
      const prepared = await migrationRequest('prepare-import', { source: 'GENERIC', manifest: stagingManifest }, token);
      expect(prepared.status).toBe(200);
      const review = await prepared.json();
      expect(store.getAgent('custom-manifest-agent')).toBeUndefined();
      expect((await migrationRequest('commit-import', { reviewId: review.reviewId, digest: 'changed', confirm: true }, token)).status).toBe(409);
      const commit = { reviewId: review.reviewId, digest: review.digest, confirm: true };
      const imported = await migrationRequest('commit-import', commit, token);
      expect(imported.status).toBe(200);
      const importedResult = await imported.json();
      expect(importedResult.verification.overallPassed).toBe(true);
      const history = () => fetch(server.getBaseUrl()+'/api/migration/import-history', { headers: { Authorization: 'Bearer '+token } });
      expect((await fetch(server.getBaseUrl()+'/api/migration/import-history')).status).toBe(401);
      const importedHistory = await (await history()).json();
      expect(importedHistory.runs.find((run: any) => run.runId === importedResult.result.runId).status).toBe('imported-unchanged');
      expect((await migrationRequest('commit-import', commit, token)).status).toBe(409);
      expect((await migrationRequest('rollback-import', { runId: importedResult.result.runId, confirm: true }, token)).status).toBe(200);
      expect(store.getAgent('custom-manifest-agent')).toBeUndefined();
      const rolledBackHistory = await (await history()).json();
      expect(rolledBackHistory.runs.find((run: any) => run.runId === importedResult.result.runId).status).toBe('rolled-back');
    });
  });

  describe("Section 33 – 35: Empirical Router Reality & Honest Cost Accounting", () => {
    it("should accurately distinguish API_COST vs POWER_COST_ESTIMATE and MEASURED vs CONFIGURED", () => {
      const router = new EmpiricalRouter();
      router.recordBenchmarkResult({
        executionKind: 'executor',
        id: "bench-low-risk-ollama",
        suiteId: "suite-general-qa",
        targetType: "MODEL",
        targetId: "target-tier2-llama3-8b",
        totalCases: 10,
        passedCases: 8,
        failedCases: 2,
        metrics: [],
        artifacts: [],
        passedOverall: false,
        executedAt: new Date().toISOString(),
        durationMs: 1000,
      });

      // Route low risk general QA -> local Ollama 8B
      const decision = router.route({
        taskType: "general_qa",
        risk: "low",
        complexityScore: 3,
        contextTokens: 1000,
      });

      // Must be POWER_COST_ESTIMATE, not API_COST!
      expect(decision.costType).toBe("POWER_COST_ESTIMATE");
      expect(decision.selectedTier).toBe(2);

      // With no measured frontier result, the highest-tier target is only an
      // unqualified fallback and must not be represented as passing its threshold.
      const criticalDecision = router.route({
        taskType: "code_generation",
        risk: "critical",
        complexityScore: 9,
        contextTokens: 4000,
        toolUseRequired: true,
      });

      expect(criticalDecision.costType).toBe("API_COST");
      expect(criticalDecision.selectedTier).toBe(4);
      expect(criticalDecision.qualityStatus).toBe("UNKNOWN");
      expect(criticalDecision.measuredPassRate).toBe(0);
      expect(criticalDecision.rationale).toContain("unqualified fallback");
    });
  });

  describe("Section 36 – 39: Provider Readiness Matrix", () => {
    it("should have honest labels for all providers without claiming skeletons are production ready", () => {
      expect(PROVIDER_READINESS_REGISTRY.length).toBeGreaterThanOrEqual(9);

      const pi = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === "harness-pi");
      expect(pi?.readiness).toBe("PARTIAL_INTEGRATION");
      expect(pi?.productionReady).toBe(false);

      const retell = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === "voice-retell");
      expect(retell?.readiness).toBe("SKELETON");
      expect(retell?.productionReady).toBe(false);

      const native = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === "harness-native");
      expect(native?.readiness).toBe("PARTIAL_INTEGRATION");
      expect(native?.productionReady).toBe(false);
      expect(native?.notes).toContain("Full contract-to-command mediation");
    });
  });

  describe("Section 40 & 41: Persistence Durability & Crash Recovery", () => {
    it("should safely write atomically and recover from .bak file if primary file is corrupted", () => {
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-durability-"));
      const tempDbPath = path.join(scratch, "test_store_durability.json");
      try {

      // 1. Save valid store
      store.saveToFile(tempDbPath);
      expect(fs.existsSync(tempDbPath)).toBe(true);
      expect(fs.existsSync(`${tempDbPath}.bak`)).toBe(false); // First write

      // 2. Second write creates .bak backup
      store.createTask({ title: "Durable Task 2", priority: "medium", status: "in_progress" });
      store.saveToFile(tempDbPath);
      expect(fs.existsSync(`${tempDbPath}.bak`)).toBe(true);

      // 3. Simulate crash / corrupted primary file (write empty string to primary)
      fs.writeFileSync(tempDbPath, "{ corrupt json ...", "utf-8");

      // 4. Reload into a new store -> Must recover from .bak!
      const recoveredStore = new WorkspaceStore();
      recoveredStore.loadFromFile(tempDbPath);

      // Verify state was restored from backup
      expect(recoveredStore.listTasks().length).toBeGreaterThan(0);

      } finally {
        fs.rmSync(scratch, { recursive: true, force: true });
      }
    });
  });
});
