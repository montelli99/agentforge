import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { WorkspaceStore } from "./core/store/workspaceStore.js";
import { UniversalMirrorRouter } from "./core/mirror/universalMirrorRouter.js";
import { TelegramMirrorProvider } from "./providers/channels/telegramMirror.js";
import { EmpiricalRouter } from "./core/router/empiricalRouter.js";
import { AgentForgeWebServer } from "./server/webServer.js";

describe("AgentForge vNext Master Build End-to-End Suite", () => {
  let store: WorkspaceStore;
  let telegram: TelegramMirrorProvider;
  let router: UniversalMirrorRouter;

  beforeEach(() => {
    store = new WorkspaceStore();
    telegram = new TelegramMirrorProvider();
    router = new UniversalMirrorRouter(store, telegram);
    store.getUser("user-owner")!.externalIdentities.push(
      { provider: "telegram", externalUserId: "owner-1", linkedAt: new Date().toISOString() },
      { provider: "telegram", externalUserId: "user-owner", linkedAt: new Date().toISOString() },
    );

    // Register a viewer user to test RBAC rejection
    (store as any).users.set("user-viewer", {
      id: "user-viewer",
      username: "viewer_bob",
      displayName: "Bob Viewer",
      role: "viewer",
      permissions: ["read:workspace"],
      externalIdentities: [{ provider: "telegram", externalUserId: "99999", linkedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe("Section 10 & 11: Remote Control Surface & RBAC Authorization", () => {
    it("does not treat an unlinked Telegram sender as the workspace owner", async () => {
      const task = store.createTask({ id: "task-unlinked-owner", title: "Protected task", priority: "high", status: "in_progress" });
      let responseText = "";
      telegram.sendMessage = async message => {
        responseText = message.text;
        return { externalMessageId: "denied-unlinked" };
      };

      await telegram.ingestInboundUpdate({
        updateId: 1901,
        chatId: "-100123456",
        userId: "not-linked-to-any-account",
        text: `/cancel ${task.id}`,
      });

      expect(store.getTask(task.id)?.status).toBe("in_progress");
      expect(responseText).toContain("not linked to an AgentForge user");
      expect(store.listAuditEntries(1)[0]).toMatchObject({
        action: "remote_action.rejected",
        actorId: "not-linked-to-any-account",
      });
    });

    it("should allow read-only slash commands for all users (/status, /agents, /models, /compute)", async () => {
      let sentText = "";
      telegram.sendMessage = async (msg) => {
        sentText = msg.text;
        return { externalMessageId: "msg-1" };
      };

      // Test /status
      await telegram.ingestInboundUpdate({
        updateId: 101,
        chatId: "-100123456",
        topicId: 1,
        userId: "99999", // viewer
        text: "/status",
      });
      expect(sentText).toContain("AgentForge Status");

      // Test /agents
      await telegram.ingestInboundUpdate({
        updateId: 102,
        chatId: "-100123456",
        topicId: 1,
        userId: "99999",
        text: "/agents",
      });
      expect(sentText).toContain("AgentForge Teammates");

      // Test /models
      await telegram.ingestInboundUpdate({
        updateId: 103,
        chatId: "-100123456",
        topicId: 1,
        userId: "99999",
        text: "/models",
      });
      expect(sentText).toContain("does not yet run or validate a model request");

      // Test /compute
      await telegram.ingestInboundUpdate({
        updateId: 104,
        chatId: "-100123456",
        topicId: 1,
        userId: "99999",
        text: "/compute",
      });
      expect(sentText).toContain("Sandbox providers: not configured");
    });

    it("does not invent diffs, test evidence, or agent execution results", async () => {
      const task = store.createTask({ id: "task-no-evidence", title: "Unverified task", priority: "medium", status: "ready" });
      let sentText = "";
      telegram.sendMessage = async message => {
        sentText = message.text;
        return { externalMessageId: "no-fabricated-result" };
      };

      await telegram.ingestInboundUpdate({ updateId: 1903, chatId: "-100123456", userId: "owner-1", text: `/diff ${task.id}` });
      expect(sentText).toContain("No verified diff is attached");

      await telegram.ingestInboundUpdate({ updateId: 1904, chatId: "-100123456", userId: "owner-1", text: `/evidence ${task.id}` });
      expect(sentText).toContain("cannot report its diff or test status as verified");

      store.createAgent({
        id: "agent-ask-test", name: "Test agent", role: "tester", description: "Test-only agent", status: "idle",
        harnessPolicy: { preferredHarnessId: "native", autoResume: false },
        modelPolicy: { preferredTier: 0, preferredModel: "none", preferredProvider: "none", allowCloudFallback: false },
        decisionPolicy: { useSystem1Router: false }, computePolicy: { environment: "none" }, memoryNamespace: "test",
        tools: [], permissions: [], assignedChannelIds: [],
      });
      await telegram.ingestInboundUpdate({ updateId: 1905, chatId: "-100123456", userId: "owner-1", text: "/ask agent-ask-test inspect this" });
      expect(sentText).toContain("Your inquiry was not submitted or executed");
    });

    it("should reject mutating commands when executed by a viewer (Section 10 RBAC gate)", async () => {
      let sentText = "";
      telegram.sendMessage = async (msg) => {
        sentText = msg.text;
        return { externalMessageId: "msg-2" };
      };

      // Viewer attempts to pause task
      await telegram.ingestInboundUpdate({
        updateId: 201,
        chatId: "-100123456",
        topicId: 1,
        userId: "99999", // role: viewer
        text: "/pause AF-142",
      });

      expect(sentText).toContain("Access Denied");
      expect(sentText).toContain("not authorized for tasks:control");

      // Verify audit logged the rejected security attempt
      const audit = store.listAuditEntries(1)[0];
      expect(audit.action).toBe("command.rejected");
      expect(audit.actorId).toBe("user-viewer");
    });

    it("does not allow a viewer to approve through an interactive callback", async () => {
      const approval = store.createApproval({ taskId: "task-viewer-approval", requesterAgentId: "agent-alex", action: "Publish", risk: "high" });
      await telegram.ingestInboundUpdate({
        updateId: 1902,
        chatId: "-100123456",
        userId: "99999",
        callbackData: `approve:${approval.id}`,
      });
      expect(store.getApproval(approval.id)?.status).toBe("pending");
      expect(store.listAuditEntries(1)[0].action).toBe("remote_action.rejected");
    });

    it("should not claim resume or retry succeeded when no agent worker is connected", async () => {
      const task = store.createTask({
        id: "task-test-cycle",
        projectId: "proj-1",
        title: "Test Task Lifecycle",
        description: "Verify remote commands",
        priority: "medium",
        status: "in_progress",
      });

      let sentText = "";
      telegram.sendMessage = async (msg) => {
        sentText = msg.text;
        return { externalMessageId: "msg-3" };
      };

      // Pause task
      await telegram.ingestInboundUpdate({
        updateId: 301,
        chatId: "-100123456",
        topicId: 1,
        userId: "owner-1", // owner fallback
        text: `/pause ${task.id}`,
      });
      expect(store.getTask(task.id)?.status).toBe("paused");
      expect(sentText).toContain("has been paused");

      // Resume task
      await telegram.ingestInboundUpdate({
        updateId: 302,
        chatId: "-100123456",
        topicId: 1,
        userId: "owner-1",
        text: `/resume ${task.id}`,
      });
      expect(store.getTask(task.id)?.status).toBe("paused");
      expect(sentText).toContain("no agent worker is connected");
      expect(sentText).toContain("no work was queued or run");

      // Cancel task
      await telegram.ingestInboundUpdate({
        updateId: 303,
        chatId: "-100123456",
        topicId: 1,
        userId: "owner-1",
        text: `/cancel ${task.id}`,
      });
      expect(store.getTask(task.id)?.status).toBe("cancelled");
      expect(sentText).toContain("has been cancelled");

      // Retry task
      await telegram.ingestInboundUpdate({
        updateId: 304,
        chatId: "-100123456",
        topicId: 1,
        userId: "owner-1",
        text: `/retry ${task.id}`,
      });
      expect(store.getTask(task.id)?.status).toBe("cancelled");
      expect(sentText).toContain("no agent worker is connected");
      expect(sentText).toContain("no retry was queued");
    });
  });

  describe("Section 16: Unified Inbox Aggregation", () => {
    it("should aggregate pending approvals, failed tasks, and system warnings into actionable items", () => {
      // 1. Pending Approval
      const app = store.createApproval({
        taskId: "task-inbox-1",
        requesterAgentId: "agent-alex",
        action: "Push hotfix to staging",
        risk: "high",
      });

      // 2. Failed Task
      const failedTask = store.createTask({
        id: "task-failed-1",
        projectId: "proj-1",
        title: "Database migration script",
        description: "Run knex migrate",
        priority: "critical",
        status: "failed",
      });

      // 3. Security Warning Audit
      store.recordAudit({
        origin: "telegram",
        actorId: "unknown-hacker",
        actorType: "user",
        action: "command.rejected",
        targetType: "channel",
        targetId: "chan-general",
        details: { reason: "unauthorized injection attempt" },
      });

      const inbox = store.getUnifiedInbox();
      expect(inbox.length).toBeGreaterThanOrEqual(3);

      const approvalItem = inbox.find(i => i.sourceId === app.id);
      expect(approvalItem).toBeDefined();
      expect(approvalItem?.type).toBe("approval_needed");
      expect(approvalItem?.severity).toBe("critical");
      expect(approvalItem?.actionable).toBe(true);

      const failedTaskItem = inbox.find(i => i.sourceId === failedTask.id);
      expect(failedTaskItem).toBeDefined();
      expect(failedTaskItem?.type).toBe("task_failed");
      expect(failedTaskItem?.severity).toBe("critical");

      const alertItem = inbox.find(i => i.type === "system_warning");
      expect(alertItem).toBeDefined();
      expect(alertItem?.title).toContain("Security Alert");
    });
  });

  describe("Section 48 & 49: Empirical Routing Architecture", () => {
    it("should route tasks based on risk threshold, capabilities, and measured benchmark pass rate", () => {
      const router = new EmpiricalRouter();

      // Record benchmark results for local llama3
      router.recordBenchmarkResult({
        id: "bench-1",
        suiteId: "suite-coding",
        targetType: "MODEL",
        targetId: "target-tier2-llama3-8b",
        totalCases: 20,
        passedCases: 16, // 80% pass rate
        failedCases: 4,
        metrics: [],
        artifacts: [],
        passedOverall: false,
        executedAt: new Date().toISOString(),
        durationMs: 9000,
      });

      // Test 1: Low-risk task requiring standard output -> Should pick cheap Tier 2 (Llama 3.1: 8B at $0.0005)
      const lowRiskDecision = router.route({
        taskType: "general_qa",
        risk: "low", // threshold 50%
        complexityScore: 3,
        contextTokens: 1000,
      });

      expect(lowRiskDecision.selectedTier).toBe(2);
      expect(lowRiskDecision.selectedTargetId).toBe("target-tier2-llama3-8b");
      expect(lowRiskDecision.estimatedCostUsd).toBeLessThan(0.001);

      // Test 2: Critical-risk task requires 95%; local evidence is 80%, while GPT
      // has no benchmark. GPT is selected only as an explicitly unqualified fallback.
      const criticalRiskDecision = router.route({
        taskType: "code_generation",
        risk: "critical", // threshold 95%
        complexityScore: 9,
        contextTokens: 4000,
        toolUseRequired: true,
      });

      expect(criticalRiskDecision.selectedTier).toBe(4);
      expect(criticalRiskDecision.selectedTargetId).toBe("target-tier4-gpt4o");
      expect(criticalRiskDecision.measuredPassRate).toBe(0);
      expect(criticalRiskDecision.qualityStatus).toBe("UNKNOWN");
      expect(criticalRiskDecision.rationale).toContain("unqualified fallback");
      expect(criticalRiskDecision.fallbackTargetIds.length).toBeGreaterThan(0);
    });
  });

  describe("Web Server Endpoints (Sections 13, 14, 16, 31, 36)", () => {
    let server: AgentForgeWebServer;
    const testPort = 3457;

    beforeAll(async () => {
      server = new AgentForgeWebServer(store, testPort);
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it("should serve /api/inbox, /api/models, /api/compute, and /api/route", async () => {
      const statusRes = await fetch(`http://localhost:${testPort}/api/status`);
      expect(statusRes.status).toBe(200);
      const status = await statusRes.json();
      expect(status.status).toBe("active");
      expect(status.dataMode).toBe("SAMPLE_DATA_PRESENT");

      // 1. GET /api/inbox
      const inboxRes = await fetch(`http://localhost:${testPort}/api/inbox`);
      expect(inboxRes.status).toBe(200);
      const inbox = await inboxRes.json();
      expect(Array.isArray(inbox)).toBe(true);

      // 2. GET /api/models
      const modelsRes = await fetch(`http://localhost:${testPort}/api/models`);
      expect(modelsRes.status).toBe(200);
      const models = await modelsRes.json();
      expect(models.tiers.length).toBe(5);

      // 3. GET /api/compute
      const computeRes = await fetch(`http://localhost:${testPort}/api/compute`);
      expect(computeRes.status).toBe(200);
      const compute = await computeRes.json();
      expect(compute.status).toBe("PARTIAL_NOT_CONFIGURED");
      expect(compute.memoryBudget.status).toBe("NOT_MEASURED");
      expect(["NOT_CONFIGURED", "UNAVAILABLE", "AVAILABLE_NOT_CONNECTED"]).toContain(compute.sandboxes.docker);
      expect(compute.executionReadiness).toBeDefined();
      expect(compute.executionReadiness.capabilities).toBeDefined();

      // 4. POST /api/route
      const routeRes = await fetch(`http://localhost:${testPort}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "code_generation",
          risk: "medium",
          complexityScore: 5,
          contextTokens: 2000,
        }),
      });
      expect(routeRes.status).toBe(200);
      const decision = await routeRes.json();
      expect(decision.selectedTier).toBeDefined();
      expect(decision.decisionRule).toBeDefined();
      expect(decision.controller).toMatchObject({ decision: { providerId: "jev" }, contextPacket: { sources: expect.any(Array) } });

      const invalidRouteRes = await fetch(`http://localhost:${testPort}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType: "code_generation", risk: "critical" }),
      });
      expect(invalidRouteRes.status).toBe(400);
    });

    it("restricts browser cross-origin access to the local AgentForge origin", async () => {
      const allowed = await fetch(`http://localhost:${testPort}/api/status`, {
        headers: { Origin: `http://localhost:${testPort}` },
      });
      expect(allowed.headers.get("access-control-allow-origin")).toBe(`http://localhost:${testPort}`);

      const blocked = await fetch(`http://localhost:${testPort}/api/status`, {
        headers: { Origin: "https://untrusted.example" },
      });
      expect(blocked.status).toBe(403);
      expect(blocked.headers.get("access-control-allow-origin")).toBeNull();

      const messagesBefore = server.store.listMessages("chan-general").length;
      const blockedMutation = await fetch(`http://localhost:${testPort}/api/messages`, {
        method: "POST",
        headers: {
          Origin: "https://untrusted.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "must not be written" }),
      });
      expect(blockedMutation.status).toBe(403);
      expect(server.store.listMessages("chan-general")).toHaveLength(messagesBefore);

      const blockedPreflight = await fetch(`http://localhost:${testPort}/api/agents`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://untrusted.example",
          "Access-Control-Request-Method": "POST",
        },
      });
      expect(blockedPreflight.status).toBe(403);

      const blockedHostStatus = await new Promise<number>((resolve, reject) => {
        const request = http.request({
          hostname: "127.0.0.1",
          port: testPort,
          path: "/api/status",
          headers: { Host: `attacker.example:${testPort}` },
        }, response => {
          response.resume();
          resolve(response.statusCode ?? 0);
        });
        request.on("error", reject);
        request.end();
      });
      expect(blockedHostStatus).toBe(403);
    });

    it("should handle task control actions via REST (/pause, /resume, /diff, /evidence)", async () => {
      const task = server.store.createTask({
        id: "task-api-test",
        projectId: "proj-1",
        title: "API Task Test",
        description: "Test task actions",
        priority: "high",
        status: "in_progress",
      });

      // POST /pause
      const pauseRes = await fetch(`http://localhost:${testPort}/api/tasks/${task.id}/pause`, { method: "POST" });
      expect(pauseRes.status).toBe(200);
      expect(server.store.getTask(task.id)?.status).toBe("paused");

      // POST /resume must not fake task execution while no worker is wired.
      const resumeRes = await fetch(`http://localhost:${testPort}/api/tasks/${task.id}/resume`, { method: "POST" });
      expect(resumeRes.status).toBe(409);
      expect(server.store.getTask(task.id)?.status).toBe("paused");

      const retryRes = await fetch(`http://localhost:${testPort}/api/tasks/${task.id}/retry`, { method: "POST" });
      expect(retryRes.status).toBe(409);
      expect(server.store.getTask(task.id)?.status).toBe("paused");

      // GET /diff
      const diffRes = await fetch(`http://localhost:${testPort}/api/tasks/${task.id}/diff`);
      expect(diffRes.status).toBe(409);
      const diffData = await diffRes.json();
      expect(diffData.available).toBe(false);
      expect(diffData.reason).toContain("No verified evidence pack");

      // GET /evidence
      const evRes = await fetch(`http://localhost:${testPort}/api/tasks/${task.id}/evidence`);
      expect(evRes.status).toBe(409);
      const evData = await evRes.json();
      expect(evData.available).toBe(false);
      expect(evData.status).toBe("NOT_AVAILABLE");
    });
  });
});
