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
        name: "Operations Intake",
        visibility: "public",
        archived: false,
        provider: "agentforge",
      });
      expect(channel.name).toBe("Operations Intake");

      const task = store.createTask({
        id: "AF-999",
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
      store.getUser("user-owner")!.externalIdentities.push({
        provider: "telegram",
        externalUserId: "test-owner-telegram",
        linkedAt: new Date().toISOString(),
      });

      // Inbound regular message from Telegram topic 501
      await tg.ingestInboundUpdate({
        updateId: 8001,
        chatId: "-100999",
        topicId: 501,
        userId: "test-owner-telegram",
        username: "test-owner",
        text: "Please inspect seller repair estimates",
      });

      const mirroredChannel = store.findMirroredChannel("telegram", "group:-100999:topic:501");
      expect(mirroredChannel).toBeDefined();
      const messages = store.listMessages(mirroredChannel!.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Please inspect seller repair estimates");

      // Remote slash command /status
      await tg.ingestInboundUpdate({
        updateId: 8002,
        chatId: "-100999",
        topicId: 501,
        userId: "test-owner-telegram",
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
        userId: "test-owner-telegram",
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
      expect(status.status).toBe("staging_not_release_ready");
      expect(status.components.length).toBeGreaterThan(3);

      // 2. Pack Init
      const initRes = cli.packInit(tempDir, "test-property-pack");
      expect(initRes.success).toBe(true);
      expect(fs.existsSync(path.join(initRes.createdPath, "manifest.json"))).toBe(true);
      const initializedManifest = JSON.parse(fs.readFileSync(path.join(initRes.createdPath, "manifest.json"), "utf-8"));
      expect(initializedManifest.license).toBe("UNLICENSED");
      expect(initializedManifest.permissions.filesystem.workspace).toEqual({ read: false, write: false });
      expect(initializedManifest.permissions.git.commit).toBe(false);
      expect(initializedManifest.permissions.network.outbound).toBe(false);

      const escapeName = `..\\agentforge-pack-escape-${process.pid}`;
      expect(() => cli.packInit(tempDir, escapeName)).toThrow("safe 1-64 character slug");
      expect(fs.existsSync(path.resolve(tempDir, escapeName))).toBe(false);

      // 3. Pack Validate
      const valRes = cli.packValidate(initRes.createdPath);
      expect(valRes.valid).toBe(true);
      expect(valRes.errors).toHaveLength(0);

      // 4. Pack Test
      const testRes = cli.packTest(initRes.createdPath);
      expect(testRes.passed).toBe(true);
      expect(testRes.testCount).toBe(0);
      expect(testRes.output).toContain("0 declared test files");

      // 5. Pack Benchmark
      const benchRes = await cli.packBenchmark(initRes.createdPath);
      expect(benchRes.passed).toBe(true);
      expect(benchRes.score).toBe(100);

      initializedManifest.scripts = { postinstall: "node malicious.js" };
      fs.writeFileSync(path.join(initRes.createdPath, "manifest.json"), JSON.stringify(initializedManifest));
      const scriptValidation = cli.packValidate(initRes.createdPath);
      expect(scriptValidation.valid).toBe(false);
      expect(scriptValidation.errors.join(" ")).toContain("lifecycle script");

      delete initializedManifest.scripts;
      initializedManifest.files = ["../outside.txt"];
      fs.writeFileSync(path.join(initRes.createdPath, "manifest.json"), JSON.stringify(initializedManifest));
      const pathValidation = cli.packValidate(initRes.createdPath);
      expect(pathValidation.valid).toBe(false);
      expect(pathValidation.errors.join(" ")).toContain("Path traversal");
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

    it("serves the local UI with honest sample and integration status", async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      const html = await res.text();
      const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
      expect(inlineScript).toBeDefined();
      expect(() => new Function(inlineScript || "")).not.toThrow();
      expect(html).toContain("<title>AgentForge</title>");
      expect(html).toContain("Execution disconnected");
      expect(html).toContain("workspace updates");
      expect(html).toContain("Create a teammate");
      expect(html).toContain("AgentForge Runtime");
      expect(html).toContain('class="nav-section"');
      expect(html).not.toContain("Example Agent");
      expect(html).not.toContain("ctx-agent-name");
      expect(html).toContain("Execution is offline. You can organize work and inspect saved evidence.");
      expect(html).toContain("Keep what matters");
      expect(html).toContain("function escapeHtml(value)");
      expect(html).not.toContain("47/47 Tests Passed");
      expect(html).not.toContain("All 84 tests passing");
      expect(html).not.toContain("Bidirectional Real-time Active");
      expect(html).not.toContain("Example Organization (#General)");
      expect(html).not.toContain("12-Step Wizard");
      expect(html).not.toContain("API_COST ($0.015/1k)");
      // This check concerns initial visible status, not comments in bundled code.
      const visibleMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
      expect(visibleMarkup).not.toContain("active.");
      expect(html).not.toContain("Nova Setup Concierge applied");
      expect(html).not.toContain("MiMo V2.5 Pro");
      expect(html).not.toContain("fonts.googleapis.com");
      expect(html).not.toContain("fonts.gstatic.com");
      expect(html).toContain("preferredModel: 'unconfigured'");
      expect(html).not.toContain("Live Drift Evaluation Workbench");
      expect(html).not.toContain("Simulate Tool Misuse");
      expect(html).toContain("visible.length+' of '+docs.length+' documents'");
    });

    it("reports the real AgentForge worker and harness-provider readiness", async () => {
      const response = await fetch(`${baseUrl}/api/harnesses`);
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.runtime).toMatchObject({
        id: "agentforge-native",
        status: "NOT_CONNECTED",
        canExecuteTasks: false,
        workerCount: 0,
      });
      expect(result.providers.map((provider: { providerId: string; readiness: string }) => [provider.providerId, provider.readiness])).toEqual([
        ["harness-pi", "PARTIAL_INTEGRATION"],
        ["harness-pydantic", "PARTIAL_INTEGRATION"],
        ["harness-native", "PARTIAL_INTEGRATION"],
      ]);
    });

    it("inspects local setup readiness without writing provider settings", async () => {
      const [detect, preset, template] = await Promise.all([
        fetch(`${baseUrl}/api/setup/auto-detect`, { method: "POST" }),
        fetch(`${baseUrl}/api/setup/apply-preset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preset: "balanced_developer" }),
        }),
        fetch(`${baseUrl}/api/workforce/apply-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: "engineering_swarm" }),
        }),
      ]);
      expect(detect.status).toBe(200);
      expect(preset.status).toBe(409);
      expect(template.status).toBe(409);
      await expect(detect.json()).resolves.toMatchObject({
        available: true,
        externalChanges: false,
        scope: "local_runtime_readiness",
        capabilities: expect.arrayContaining([
          expect.objectContaining({ id: "model", configured: expect.any(Boolean) }),
          expect.objectContaining({ id: "telegram", configured: expect.any(Boolean) }),
          expect.objectContaining({ id: "execution", state: expect.any(String) }),
        ]),
      });
      await expect(preset.json()).resolves.toMatchObject({ available: false });
      await expect(template.json()).resolves.toMatchObject({ available: false });
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
        body: JSON.stringify({ agentId: "agent-reviewer", phoneNumber: "+15550192834" }),
      });
      expect(callRes.status).toBe(201);
      const callData = await callRes.json();
      expect(callData.status).toBe("IN_PROGRESS");
      expect(callData.canonicalChannelId).toBe("chan-calls");

      const missingAgentRes = await fetch(`${baseUrl}/api/calls/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+15550192834" }),
      });
      expect(missingAgentRes.status).toBe(400);

      const invalidPhoneRes = await fetch(`${baseUrl}/api/calls/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-reviewer", phoneNumber: "555-012-3456" }),
      });
      expect(invalidPhoneRes.status).toBe(400);

      const missingAgentIdRes = await fetch(`${baseUrl}/api/calls/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-does-not-exist", phoneNumber: "+15550192834" }),
      });
      expect(missingAgentIdRes.status).toBe(404);

      // Install package via API
      const pkgRes = await fetch(`${baseUrl}/api/packages/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "workspace-operations-pack" }),
      });
      expect(pkgRes.status).toBe(409);
      const permissionReview = await pkgRes.json();
      expect(permissionReview.requiresPermissionApproval).toBe(true);
      expect(permissionReview.requestedPermissions).toBeDefined();

      const catalogAfterReview = await fetch(`${baseUrl}/api/packages`);
      const packagesAfterReview = await catalogAfterReview.json();
      expect(packagesAfterReview.installed).toHaveLength(0);

      const excessiveGrantRes = await fetch(`${baseUrl}/api/packages/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageName: "workspace-operations-pack",
          approvedPermissions: { deployment: { production: true } },
        }),
      });
      expect(excessiveGrantRes.status).toBe(400);

      const approvedPkgRes = await fetch(`${baseUrl}/api/packages/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: "workspace-operations-pack", approvedPermissions: {} }),
      });
      expect(approvedPkgRes.status).toBe(200);
      const pkgData = await approvedPkgRes.json();
      expect(pkgData.status).toBe("active");
      expect(pkgData.executionNotice).toContain("package code is not executed");
    });

    it("links the Telegram owner through a short-lived one-time private-chat code", async () => {
      const linkCodeResponse = await fetch(`${baseUrl}/api/telegram/link-code`, { method: "POST" });
      expect(linkCodeResponse.status).toBe(201);
      const { code, expiresAt } = await linkCodeResponse.json();
      expect(code).toMatch(/^[A-Z0-9_-]{12}$/);
      expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());

      const owner = server.store.getUser("user-owner");
      expect(owner?.externalIdentities.some(identity => identity.provider === "telegram" && identity.externalUserId === "paired-telegram-user")).toBe(false);

      // Group use cannot consume or use a private linking code.
      await server.telegram.ingestInboundUpdate({
        updateId: 993001,
        chatId: "-1009001",
        userId: "paired-telegram-user",
        username: "paired_owner",
        text: `/link ${code}`,
      });
      expect(server.store.findUserByExternalId("telegram", "paired-telegram-user")).toBeUndefined();

      // A private-chat redemption links the canonical owner identity.
      await server.telegram.ingestInboundUpdate({
        updateId: 993002,
        chatId: "9001",
        userId: "paired-telegram-user",
        username: "paired_owner",
        text: `/link ${code}`,
      });
      expect(server.store.findUserByExternalId("telegram", "paired-telegram-user")?.id).toBe(owner?.id);

      // Codes are single-use; replaying it as a different external user cannot create another owner.
      await server.telegram.ingestInboundUpdate({
        updateId: 993003,
        chatId: "9002",
        userId: "replay-telegram-user",
        text: `/link ${code}`,
      });
      expect(server.store.findUserByExternalId("telegram", "replay-telegram-user")).toBeUndefined();
      expect(server.telegram.getSentMessages().some(message => message.text.includes("For safety, Telegram accounts can only be linked in a private chat"))).toBe(true);
      expect(server.telegram.getSentMessages().some(message => message.text.includes("Telegram is linked to your AgentForge owner account"))).toBe(true);
    });

    it("creates and retrieves operational memory through the canonical workspace API", async () => {
      const invalid = await fetch(`${baseUrl}/api/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace: "qa", category: "unknown", title: "Bad", content: "Reject this" }),
      });
      expect(invalid.status).toBe(400);

      const created = await fetch(`${baseUrl}/api/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namespace: "qa",
          category: "do_not_repeat",
          title: "Preserve verified seller corrections",
          content: "Never overwrite facts explicitly corrected by the user.",
          tags: ["safety", "memory"],
        }),
      });
      expect(created.status).toBe(201);
      const saved = await created.json();
      expect(saved.id).toMatch(/^mem-/);

      const listed = await fetch(`${baseUrl}/api/memory?namespace=qa&q=verified`);
      expect(listed.status).toBe(200);
      expect(await listed.json()).toEqual([
        expect.objectContaining({ id: saved.id, title: "Preserve verified seller corrections", category: "do_not_repeat" }),
      ]);
    });
  });
});
