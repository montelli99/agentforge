import { describe, expect, it } from "vitest";
import {
  PiHarnessProvider,
  PydanticHarnessProvider,
  AgentForgeNativeHarnessProvider,
  JevDecisionProvider,
  ModelRouter,
  TelegramMirrorProvider,
  DiscordMirrorProvider,
  NativeWebChannelProvider,
  OperationalMemoryProvider,
} from "./providers/index.js";
import {
  ContractEnforcer,
  EventLedger,
  EvidencePackBuilder,
  ApprovalEngine,
  type ExecutionContract,
} from "./core/index.js";

describe("AgentForge vNext Foundation Architecture", () => {
  describe("Harness Provider Strategy (Section 5 & 6)", () => {
    it("exercises the Pi contract fixture only when simulation is explicitly enabled", async () => {
      const pi = new PiHarnessProvider(true);
      expect(pi.id).toBe("pi");
      expect(pi.capabilities.supportsStreaming).toBe(false);
      expect(pi.capabilities.supportsTools).toBe(false);

      const session = await pi.startSession({
        agentId: "agent-alex",
        systemPrompt: "You are a software engineer.",
      });
      expect(session.status).toBe("active");

      const result = await pi.executeTask(session.sessionId, {
        taskId: "AF-101",
        instruction: "Inspect codebase architecture",
      });
      expect(result.status).toBe("success");
      expect(result.tokensUsed?.total).toBeGreaterThan(0);

      const state = await pi.getState(session.sessionId);
      expect(state.messageCount).toBe(1);

      await pi.shutdown();
    });

    it("exercises the Pydantic contract fixture only when simulation is explicitly enabled", async () => {
      const pydantic = new PydanticHarnessProvider(true);
      expect(pydantic.id).toBe("pydantic");

      const session = await pydantic.startSession({
        agentId: "agent-validator",
        systemPrompt: "Validate schema.",
      });
      const result = await pydantic.executeTask(session.sessionId, {
        taskId: "AF-102",
        instruction: "Validate output contract",
      });
      expect(result.status).toBe("success");
      expect(result.output).toContain("Pydantic AI Harness");

      await pydantic.shutdown();
    });

    it("exercises the native contract fixture only when simulation is explicitly enabled", async () => {
      const native = new AgentForgeNativeHarnessProvider(true);
      expect(native.id).toBe("agentforge_native");

      const session = await native.startSession({
        agentId: "agent-native",
        systemPrompt: "Execute within boundary.",
      });
      const result = await native.executeTask(session.sessionId, {
        taskId: "AF-103",
        instruction: "Run unit test suite",
      });
      expect(result.status).toBe("success");

      await native.shutdown();
    });

    it("does not claim harness execution when only the contract-test fixture is installed", async () => {
      const native = new AgentForgeNativeHarnessProvider();
      const session = await native.startSession({ agentId: "agent-native", systemPrompt: "No execution" });
      const result = await native.executeTask(session.sessionId, { taskId: "AF-104", instruction: "Run tests" });
      expect(result.status).toBe("failure");
      expect(result.error).toContain("No task was executed");
      expect(native.capabilities.supportsTools).toBe(false);
      expect(native.capabilities.supportsMCP).toBe(false);
      await native.shutdown();
    });
  });

  describe("Model Architecture & Decision Separation (Section 8 & 9)", () => {
    it("uses Jev as a System-1 decision provider (NOT conversational)", async () => {
      const jev = new JevDecisionProvider();
      expect(jev.id).toBe("jev");

      const outcome = await jev.classify({
        id: "dec-1",
        taskType: "intent_classification",
        input: "Please fix the login bug in auth controller",
        candidates: ["bug_fix", "feature", "documentation"],
      });

      expect(outcome.selectedCandidate).toBe("bug_fix");
      expect(outcome.confidence).toBeGreaterThan(0.9);
      expect(outcome.costUsd).toBeLessThan(0.001);
    });

    it("routes tasks across tiers (Tier 0 to Tier 4) according to complexity", async () => {
      const router = new ModelRouter();

      const simpleRoute = await router.selectTarget({
        taskComplexity: "simple",
        requiresToolCalling: false,
        requiresStructuredOutput: false,
      });
      expect(simpleRoute.tier).toBeDefined();

      const expertRoute = await router.selectTarget({
        taskComplexity: "expert",
        requiresToolCalling: true,
        requiresStructuredOutput: true,
      });
      expect(expertRoute.tier).toBe(4);
      expect(expertRoute.model).toBe("gpt-4o");
    });

    it("routes local work only to discovered models and skips an unverified local vision target", async () => {
      const router = new ModelRouter();
      router.registerProvider({
        id: "ollama",
        name: "Test Ollama",
        defaultTier: 2,
        isAvailable: async () => true,
        listModels: async () => ["gemma4:e4b"],
        generate: async () => { throw new Error("not used in route selection"); },
        async *stream() {},
      });
      router.registerProvider({
        id: "openai",
        name: "Test OpenAI",
        defaultTier: 4,
        isAvailable: async () => true,
        listModels: async () => ["gpt-4o-mini"],
        generate: async () => { throw new Error("not used in route selection"); },
        async *stream() {},
      });

      const local = await router.selectTarget({
        taskComplexity: "simple",
        requiresToolCalling: false,
        requiresStructuredOutput: false,
      });
      expect(local.providerId).toBe("ollama");
      expect(local.model).toBe("gemma4:e4b");

      const vision = await router.selectTarget({
        taskComplexity: "simple",
        requiresToolCalling: false,
        requiresStructuredOutput: false,
        requiresVision: true,
      });
      expect(vision.providerId).toBe("openai");
      expect(vision.model).toBe("gpt-4o-mini");

      const toolTask = await router.selectTarget({
        taskComplexity: "simple",
        requiresToolCalling: true,
        requiresStructuredOutput: false,
      });
      expect(toolTask.providerId).toBe("openai");

      await expect(router.selectTarget({
        taskComplexity: "simple",
        requiresToolCalling: true,
        requiresStructuredOutput: false,
        forceLocalOnly: true,
      })).rejects.toThrow("no suitable discovered local model");
    });
  });

  describe("Workspace Mirroring & Remote Control (Sections 12, 13, 18, 19)", () => {
    it("handles bidirectional Telegram mirroring and remote control callbacks", async () => {
      const tg = new TelegramMirrorProvider();
      const receivedEvents: any[] = [];
      tg.onEvent(async (evt) => {
        receivedEvents.push(evt);
      });

      // Bind a topic: Chat -100123, topic 42 -> Channel "dev-channel"
      tg.bindTopic("-100123", 42, "dev-channel", "Development");

      // Inbound message from Telegram topic
      await tg.ingestInboundUpdate({
        updateId: 1001,
        chatId: "-100123",
        topicId: 42,
        userId: "user-montelli",
        username: "montelli",
        text: "Fix login regression in auth module",
      });

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].eventType).toBe("message");
      expect(receivedEvents[0].externalUserId).toBe("user-montelli");

      // Remote control button callback (Approve task AF-142)
      await tg.ingestInboundUpdate({
        updateId: 1002,
        chatId: "-100123",
        topicId: 42,
        userId: "user-montelli",
        callbackData: "approve:AF-142",
      });

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[1].eventType).toBe("action_button_clicked");
      expect(receivedEvents[1].payload.actionId).toBe("approve");

      // Outbound message from Web to Telegram
      const sendRes = await tg.sendMessage({
        canonicalChannelId: "dev-channel",
        text: "Task AF-142 status: in_progress",
      });
      expect(sendRes.externalMessageId).toBeDefined();
      expect(tg.getSentMessages()).toHaveLength(1);
    });

    it("handles Discord interactions and native web channels", async () => {
      const discord = new DiscordMirrorProvider();
      const events: any[] = [];
      discord.onEvent(async (e) => { events.push(e); });

      await discord.ingestInteraction({
        interactionId: "disc-99",
        guildId: "guild-1",
        channelId: "chan-1",
        userId: "user-discord",
        username: "montelli-disc",
        customId: "reject:AF-142",
      });

      expect(events).toHaveLength(1);
      expect(events[0].provider).toBe("discord");
      expect(events[0].payload.actionId).toBe("reject");

      const web = new NativeWebChannelProvider();
      const webEvents: any[] = [];
      web.onEvent(async (e) => { webEvents.push(e); });
      await web.sendUserMessage("general", "user-web", "Hello native workspace");
      expect(webEvents).toHaveLength(1);
    });
  });

  describe("Execution Contract & Policy Enforcement (Section 25)", () => {
    const testContract: ExecutionContract = {
      id: "contract-AF-142",
      taskId: "AF-142",
      version: 1,
      repository: {
        baseBranch: "origin/master",
        baseSha: "802e04a",
      },
      workspace: {
        requireIsolatedWorktree: true,
      },
      scope: {
        allowedPaths: ["modules/system1/**", "src/core/**"],
        protectedPaths: ["modules/ppc-safety-validator.cjs", "package.json", ".env"],
        maxFilesChanged: 5,
      },
      authority: {
        externalMessage: false,
        productionWrite: false,
        deployment: false,
        forcePush: false,
        deleteFiles: false,
        networkOutbound: true,
      },
      requiredChecks: [
        { type: "unit_tests", required: true },
        { type: "diff_scope", required: true },
      ],
      completion: {
        requireEvidencePack: true,
        requireHumanApproval: true,
      },
      createdAt: new Date().toISOString(),
    };

    const enforcer = new ContractEnforcer();

    it("allows modifications within allowed scope", () => {
      const res = enforcer.validateFileModifications(testContract, [
        "modules/system1/router.ts",
        "src/core/types/agent.ts",
      ]);
      expect(res.allowed).toBe(true);
      expect(res.violations).toHaveLength(0);
    });

    it("strictly blocks modifications to protected files", () => {
      const res = enforcer.validateFileModifications(testContract, [
        "modules/system1/router.ts",
        "modules/ppc-safety-validator.cjs", // Protected!
      ]);
      expect(res.allowed).toBe(false);
      expect(res.violations.some((v) => v.rule === "scope_protected")).toBe(true);
    });

    it("blocks modifications outside allowed scope", () => {
      const res = enforcer.validateFileModifications(testContract, [
        "unauthorized/path/hack.ts",
      ]);
      expect(res.allowed).toBe(false);
      expect(res.violations.some((v) => v.rule === "scope_allowed")).toBe(true);
    });

    it("enforces authority gates (e.g. blocks unauthorized force-push or production writes)", () => {
      const forcePushCheck = enforcer.checkAuthority(testContract, "forcePush");
      expect(forcePushCheck.allowed).toBe(false);

      const prodWriteCheck = enforcer.checkAuthority(testContract, "productionWrite");
      expect(prodWriteCheck.allowed).toBe(false);

      const networkCheck = enforcer.checkAuthority(testContract, "networkOutbound");
      expect(networkCheck.allowed).toBe(true);

      expect(enforcer.validateBashCommand("curl https://example.com", testContract).allowed).toBe(true);
      const deployCheck = enforcer.validateBashCommand("fly deploy", testContract);
      expect(deployCheck.allowed).toBe(false);
      expect(deployCheck.violation).toContain("Deployment and package publishing are denied");
    });
  });

  describe("Event Ledger & External Bindings (Sections 15 & 16)", () => {
    it("deduplicates inbound events and tracks status transitions", async () => {
      const ledger = new EventLedger();

      const first = await ledger.recordInboundEvent({
        eventId: "tg-msg-999",
        origin: "telegram",
        eventType: "message.created",
        payload: { text: "Deploy task" },
      });
      expect(first.isDuplicate).toBe(false);
      expect(first.entry.status).toBe("accepted");

      // Attempt duplicate replay
      const second = await ledger.recordInboundEvent({
        eventId: "tg-msg-999",
        origin: "telegram",
        eventType: "message.created",
        payload: { text: "Deploy task" },
      });
      expect(second.isDuplicate).toBe(true);

      // Transition to applied
      ledger.updateEventStatus(first.entry.id, "applied");
      const all = ledger.getAllEntries();
      expect(all[0].status).toBe("applied");
      expect(all[0].appliedAt).toBeDefined();
    });

    it("registers and looks up external channel bindings", () => {
      const ledger = new EventLedger();
      const binding = ledger.registerBinding({
        provider: "telegram",
        externalWorkspaceId: "-100123",
        externalChannelId: "42",
        agentforgeWorkspaceId: "ws-main",
        agentforgeChannelId: "chan-dev",
        syncDirection: "bidirectional",
        syncState: "active",
      });

      const found = ledger.findBinding("telegram", "42");
      expect(found).toBeDefined();
      expect(found?.agentforgeChannelId).toBe("chan-dev");
    });
  });

  describe("Canonical Approvals & Remote Reflection (Section 28)", () => {
    it("creates an approval and resolves it from phone/Telegram with instant state sync", () => {
      const approvals = new ApprovalEngine();
      let updatedStatus = "";

      approvals.onApprovalChange((appr) => {
        updatedStatus = `${appr.status} by ${appr.approverUserId} via ${appr.decisionOrigin}`;
      });

      const req = approvals.createApprovalRequest({
        taskId: "AF-142",
        requesterAgentId: "agent-alex",
        action: "Merge and deploy PR #42",
        description: "Fixes login regression with 47 unit tests passing",
        risk: "medium",
        evidenceSummary: { filesCount: 2, testsPassed: true },
      });

      expect(req.status).toBe("pending");
      expect(approvals.listPending()).toHaveLength(1);

      // Approver approves via Telegram remote surface
      const resolved = approvals.resolveApproval({
        approvalId: req.id,
        status: "approved",
        approverUserId: "user-montelli",
        decisionOrigin: "telegram",
        decisionNotes: "Diff verified on mobile",
      });

      expect(resolved.status).toBe("approved");
      expect(resolved.decisionOrigin).toBe("telegram");
      expect(updatedStatus).toBe("approved by user-montelli via telegram");
      expect(approvals.listPending()).toHaveLength(0);
    });
  });

  describe("Operational Memory & Evidence Pack (Sections 10 & 27)", () => {
    it("stores and queries operational engineering memory and do-not-repeat rules", async () => {
      const mem = new OperationalMemoryProvider();
      await mem.record({
        namespace: "proj-agentforge",
        category: "do_not_repeat",
        title: "Never modify OpenClaw production directly",
        content: "OpenClaw and PPC production repositories are strictly read-only for this workstream.",
        tags: ["boundary", "safety"],
      });

      const rules = await mem.getDoNotRepeatRules("proj-agentforge");
      expect(rules).toHaveLength(1);
      expect(rules[0].title).toContain("Never modify OpenClaw production directly");
    });

    it("compiles an audit-grade EvidencePack answering what changed, what tested it, and who approved it", () => {
      const builder = new EvidencePackBuilder(
        "AF-142",
        "agent-alex",
        "Fix login regression and enforce execution contract",
        "contract-AF-142",
        "802e04a",
      );

      builder
        .recordFileChange({
          filePath: "src/auth/login.ts",
          status: "modified",
          linesAdded: 15,
          linesDeleted: 3,
        })
        .recordCommand({
          command: "pnpm test src/auth/login.test.ts",
          cwd: process.cwd(),
          timestamp: new Date().toISOString(),
          exitCode: 0,
          durationMs: 450,
        })
        .recordTestResult({
          checkName: "unit_tests",
          command: "pnpm test",
          passed: true,
          exitCode: 0,
          stdout: "47 tests passed",
          stderr: "",
          durationMs: 450,
        });

      const pack = builder.build("9f8e7d6", {
        approvalId: "appr-101",
        approvedBy: "montelli",
        source: "telegram",
      });

      expect(pack.verifiedPassed).toBe(true);
      expect(pack.diffStat.filesCount).toBe(1);
      expect(pack.diffStat.insertions).toBe(15);
      expect(pack.approvalSource).toBe("telegram");
      expect(pack.approvedBy).toBe("montelli");
    });
  });
});
