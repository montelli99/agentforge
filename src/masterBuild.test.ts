import { describe, expect, it, afterAll, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { WorkspaceStore } from "./core/store/workspaceStore.js";
import { UniversalMirrorRouter } from "./core/mirror/universalMirrorRouter.js";
import { TelegramMirrorProvider } from "./providers/channels/telegramMirror.js";
import { AgentForgeCli } from "./cli/agentforge-cli.js";
import { AgentForgeWebServer } from "./server/webServer.js";

describe("AgentForge vNext Autonomous Master Build Suite", () => {
  describe("WorkspaceStore Canonical State Engine (Section 6 & 11)", () => {
    it("manages workspaces, channels, agents, and tasks with real-time events", () => {
      const store = new WorkspaceStore();
      const events: any[] = [];
      store.subscribe(e => events.push(e));

      const space = store.createSpace({
        workspaceId: "ws-default",
        name: "Acquisitions",
        provider: "agentforge",
      });
      expect(space.id).toBeDefined();

      const channel = store.createChannel({
        workspaceId: "ws-default",
        spaceId: space.id,
        name: "PPC Deals",
        visibility: "public",
        archived: false,
        provider: "agentforge",
      });
      expect(channel.name).toBe("PPC Deals");

      const task = store.createTask({
        projectId: "proj-acq",
        title: "Underwrite 123 Main St",
        description: "Review tax assessment and comps",
        priority: "high",
        status: "ready",
        contract: {
          id: "contract-test",
          taskId: "AF-999",
          version: 1,
          repository: { baseBranch: "master", baseSha: "802e04a" },
          workspace: { requireIsolatedWorktree: true },
          scope: { allowedPaths: ["*"], protectedPaths: [] },
          authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: true },
          requiredChecks: [],
          completion: { requireEvidencePack: true, requireHumanApproval: true },
          createdAt: new Date().toISOString(),
        },
      });
      expect(task.id).toMatch(/^AF-\d+/);

      expect(events.some(e => e.type === "task_created")).toBe(true);
      expect(events.some(e => e.type === "channel_created")).toBe(true);
    });
  });

  describe("Universal Mirror Router & Mobile Remote Control (Sections 7, 10, 18)", () => {
    it("mirrors Telegram topics, processes remote /status commands, and resolves mobile approvals", async () => {
      const store = new WorkspaceStore();
      const tg = new TelegramMirrorProvider();
      const router = new UniversalMirrorRouter(store, tg);

      // Inbound regular message from Telegram topic 501
      await tg.ingestInboundUpdate({
        updateId: 8001,
        chatId: "-100999",
        topicId: 501,
        userId: "12345678", // Linked to user-montelli
        username: "montelli",
        text: "Please inspect seller repair estimates",
      });

      const mirroredChannel = store.findMirroredChannel("telegram", "501");
      expect(mirroredChannel).toBeDefined();
      const messages = store.listMessages(mirroredChannel!.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Please inspect seller repair estimates");

      // Remote slash command /status
      await tg.ingestInboundUpdate({
        updateId: 8002,
        chatId: "-100999",
        topicId: 501,
        userId: "12345678",
        text: "/status",
      });
      expect(tg.getSentMessages().some(m => m.text.includes("AgentForge Status"))).toBe(true);

      // Create a pending approval
      const approval = store.createApproval({
        taskId: "AF-501",
        requesterAgentId: "agent-alex",
        action: "Deploy hotfix to Staging",
        description: "Tested and verified",
        risk: "medium",
      });
      expect(approval.status).toBe("pending");

      // Owner approves remotely from phone via Telegram button
      await tg.ingestInboundUpdate({
        updateId: 8003,
        chatId: "-100999",
        topicId: 501,
        userId: "12345678",
        callbackData: `approve:${approval.id}`,
      });

      const updatedApproval = store.getApproval(approval.id);
      expect(updatedApproval?.status).toBe("approved");
      expect(updatedApproval?.decisionOrigin).toBe("telegram");

      // Verify audit trail entry was recorded
      const audit = store.listAuditEntries();
      expect(audit.some(a => a.action === "approval.approve")).toBe(true);
    });
  });

  describe("AgentForge CLI Tooling (Sections 28, 43)", () => {
    const cli = new AgentForgeCli();
    const tempDir = path.join(process.cwd(), "tmp-test-cli");

    beforeAll(() => {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    });

    afterAll(() => {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("executes pack init, validate, test, benchmark, and status commands", async () => {
      // 1. Status
      const status = cli.status();
      expect(status.status).toBe("ready");
      expect(status.components.length).toBeGreaterThan(3);

      // 2. Pack Init
      const initRes = cli.packInit(tempDir, "test-property-pack");
      expect(initRes.success).toBe(true);
      expect(fs.existsSync(path.join(initRes.createdPath, "manifest.json"))).toBe(true);

      // 3. Pack Validate
      const valRes = cli.packValidate(initRes.createdPath);
      expect(valRes.valid).toBe(true);
      expect(valRes.errors).toHaveLength(0);

      // 4. Pack Test
      const testRes = cli.packTest(initRes.createdPath);
      expect(testRes.passed).toBe(true);
      expect(testRes.testCount).toBe(4);

      // 5. Pack Benchmark
      const benchRes = await cli.packBenchmark(initRes.createdPath);
      expect(benchRes.passed).toBe(true);
      expect(benchRes.score).toBe(100);
    });
  });

  describe("AgentForge Web Server & Control Plane REST API (Sections 14, 16, 18, 32)", () => {
    let server: AgentForgeWebServer;
    const testPort = 3456;
    const baseUrl = `http://localhost:${testPort}`;

    beforeAll(async () => {
      server = new AgentForgeWebServer(undefined, testPort);
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it("serves the modern Web UI HTML", async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("AgentForge vNext");
      expect(html).toContain("Universal Mirror Active");
      expect(html).toContain("Create AI Teammate");
    });

    it("serves REST API for agents, tasks, processes, calls, and packages", async () => {
      // Status endpoint
      const statusRes = await fetch(`${baseUrl}/api/status`);
      expect(statusRes.status).toBe(200);
      const statusJson = await statusRes.json();
      expect(statusJson.status).toBe("active");

      // Agents endpoint
      const agentsRes = await fetch(`${baseUrl}/api/agents`);
      expect(agentsRes.status).toBe(200);
      const agents = await agentsRes.json();
      expect(agents.length).toBeGreaterThan(0);

      // Create new agent via API
      const newAgentRes = await fetch(`${baseUrl}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "agent-test-bot",
          name: "TestBot",
          role: "QA Engineer",
          description: "Automated test executor",
          status: "idle",
          harnessPolicy: { preferredHarnessId: "pi", autoResume: true },
          modelPolicy: { preferredTier: 2, preferredModel: "qwen2.5:3b", preferredProvider: "ollama", allowCloudFallback: false },
          decisionPolicy: { useSystem1Router: true },
          computePolicy: { environment: "local_workspace" },
          memoryNamespace: "qa",
          tools: ["vitest"],
          permissions: ["test:run"],
          assignedChannelIds: ["chan-development"],
        }),
      });
      expect(newAgentRes.status).toBe(201);

      // Import Scribe SOP process via API
      const processRes = await fetch(`${baseUrl}/api/processes/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "scribe",
          rawContent: "# Lead Intake SOP\n1. Receive caller info\n2. Schedule valuation inspection?\n3. Move lead to Assessed in CRM",
        }),
      });
      expect(processRes.status).toBe(201);
      const procData = await processRes.json();
      expect(procData.process.title).toBe("Lead Intake SOP");
      expect(procData.agentSpecification.unresolvedRules.length).toBeGreaterThan(0);

      // Simulate voice call via API
      const callRes = await fetch(`${baseUrl}/api/calls/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-sarah", phoneNumber: "+15550192834" }),
      });
      expect(callRes.status).toBe(201);
      const callData = await callRes.json();
      expect(callData.status).toBe("IN_PROGRESS");
      expect(callData.canonicalChannelId).toBe("chan-calls");

      // Install package via API
      const pkgRes = await fetch(`${baseUrl}/api/packages/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "real-estate-acquisitions-pack" }),
      });
      expect(pkgRes.status).toBe(200);
      const pkgData = await pkgRes.json();
      expect(pkgData.status).toBe("active");
    });
  });
});
