import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
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
    it("should allow read-only slash commands for all users (/status, /agents, /models, /compute)", async () => {
      let sentText = "";
      telegram.sendMessage = async (msg) => {
        sentText = msg.text;
        return { messageId: "msg-1", canonicalChannelId: msg.canonicalChannelId, timestamp: new Date().toISOString() };
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
      expect(sentText).toContain("Tier 0");
      expect(sentText).toContain("Tier 4");

      // Test /compute
      await telegram.ingestInboundUpdate({
        updateId: 104,
        chatId: "-100123456",
        topicId: 1,
        userId: "99999",
        text: "/compute",
      });
      expect(sentText).toContain("Worktree Manager");
    });

    it("should reject mutating commands when executed by a viewer (Section 10 RBAC gate)", async () => {
      let sentText = "";
      telegram.sendMessage = async (msg) => {
        sentText = msg.text;
        return { messageId: "msg-2", canonicalChannelId: msg.canonicalChannelId, timestamp: new Date().toISOString() };
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
      expect(sentText).toContain("not authorized to execute mutating command /pause");

      // Verify audit logged the rejected security attempt
      const audit = store.listAuditEntries(1)[0];
      expect(audit.action).toBe("command.rejected");
      expect(audit.actorId).toBe("user-viewer");
    });

    it("should execute task lifecycle operations for authorized users (/pause, /resume, /cancel, /retry)", async () => {
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
        return { messageId: "msg-3", canonicalChannelId: msg.canonicalChannelId, timestamp: new Date().toISOString() };
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
      expect(store.getTask(task.id)?.status).toBe("in_progress");
      expect(sentText).toContain("has been resumed");

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
      expect(store.getTask(task.id)?.status).toBe("in_progress");
      expect(sentText).toContain("queued for retry");
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
        target: { id: "t1", type: "MODEL", name: "llama3.1:8b" },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        totalCases: 20,
        passedCases: 16, // 80% pass rate
        failedCases: 4,
        passRate: 0.80,
        averageLatencyMs: 450,
        totalCostUsd: 0.002,
        metrics: [],
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

      // Test 2: Critical-risk task requiring 95% threshold -> Llama (80%) fails threshold, must escalate to Tier 4 (GPT-4o)
      const criticalRiskDecision = router.route({
        taskType: "code_generation",
        risk: "critical", // threshold 95%
        complexityScore: 9,
        contextTokens: 4000,
        toolUseRequired: true,
      });

      expect(criticalRiskDecision.selectedTier).toBe(4);
      expect(criticalRiskDecision.selectedTargetId).toBe("target-tier4-gpt4o");
      expect(criticalRiskDecision.measuredPassRate).toBeGreaterThanOrEqual(0.95);
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
      expect(compute.status).toBe("healthy");
      expect(compute.memoryBudget.systemTotalRamGb).toBe(32);

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

      // POST /resume
      const resumeRes = await fetch(`http://localhost:${testPort}/api/tasks/${task.id}/resume`, { method: "POST" });
      expect(resumeRes.status).toBe(200);
      expect(server.store.getTask(task.id)?.status).toBe("in_progress");

      // GET /diff
      const diffRes = await fetch(`http://localhost:${testPort}/api/tasks/${task.id}/diff`);
      expect(diffRes.status).toBe(200);
      const diffData = await diffRes.json();
      expect(diffData.diffSnippet).toContain("diff --git");

      // GET /evidence
      const evRes = await fetch(`http://localhost:${testPort}/api/tasks/${task.id}/evidence`);
      expect(evRes.status).toBe(200);
      const evData = await evRes.json();
      expect(evData.contractPassed).toBe(true);
      expect(evData.testsPassed).toBe(89);
    });
  });
});
