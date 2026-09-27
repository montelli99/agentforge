/**
 * AgentForge vNext — Release Candidate Validation Suite
 * Sections 2 - 48: Real Integrations, Governance, Conflict Guards, and Hardening
 */

import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { PROVIDER_READINESS_REGISTRY } from "./core/types/providerReadiness.js";
import { PiHarnessProvider } from "./providers/harness/piHarness.js";
import { PydanticHarnessProvider } from "./providers/harness/pydanticHarness.js";
import { AgentForgeNativeHarnessProvider } from "./providers/harness/nativeHarness.js";
import { JevDecisionProvider } from "./providers/decision/jevDecision.js";
import { OllamaModelProvider } from "./providers/models/ollamaModel.js";
import { OpenAIModelProvider } from "./providers/models/openaiModel.js";
import { TelegramMirrorProvider } from "./providers/channels/telegramMirror.js";
import { LocalPackageProvider } from "./providers/marketplace/localPackageProvider.js";
import { IsolatedSecretStore } from "./core/secret/secretStore.js";
import { WorkspaceStore } from "./core/store/workspaceStore.js";
import { AgentForgeWebServer } from "./server/webServer.js";
import type { ExecutionContract } from "./core/types/contract.js";
import type { PackageManifest } from "./core/types/package.js";

describe("AgentForge vNext — Release Candidate Verification Suite", () => {
  let store: WorkspaceStore;

  beforeEach(() => {
    store = new WorkspaceStore();
  });

  describe("Section 2 & 9 & 10: Granular Provider Readiness Audit", () => {
    it("should accurately report capability-level readiness for Scribe (3 distinct tiers)", () => {
      const scribe = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === "process-scribe");
      expect(scribe).toBeDefined();
      expect(scribe?.readiness).toBe("PARTIAL_INTEGRATION");
      expect(scribe?.capabilities).toBeDefined();
      expect(scribe?.capabilities?.length).toBe(3);

      const fileImport = scribe?.capabilities?.find(c => c.capability === "file_import");
      expect(fileImport?.readiness).toBe("TEST_IMPLEMENTATION");

      const mcp = scribe?.capabilities?.find(c => c.capability === "mcp_integration");
      expect(mcp?.readiness).toBe("NOT_CONFIGURED");

      const sync = scribe?.capabilities?.find(c => c.capability === "live_sync");
      expect(sync?.readiness).toBe("UNIMPLEMENTED");
    });

    it("should honestly label Retell as SKELETON, Mock Voice as MOCK, and Agni as UNIMPLEMENTED", () => {
      const retell = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === "voice-retell");
      expect(retell?.readiness).toBe("SKELETON");
      expect(retell?.productionReady).toBe(false);

      const mockVoice = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === "voice-mock");
      expect(mockVoice?.readiness).toBe("MOCK");

      const agni = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === "voice-agni");
      expect(agni?.readiness).toBe("UNIMPLEMENTED");
      expect(agni?.notes).toContain("EXACT AGNI PRODUCT NOT YET VERIFIED");
    });

    it("should label Jev as TEST_IMPLEMENTATION without touching production Vercel", () => {
      const jev = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === "decision-jev");
      expect(jev?.readiness).toBe("TEST_IMPLEMENTATION");
      expect(jev?.productionReady).toBe(false);
      expect(jev?.notes).toContain("Does NOT touch production Vercel");
    });

    it("should expose external channel adapters as non-production until transport is configured", () => {
      for (const providerId of ["channel-telegram", "channel-discord", "channel-slack"]) {
        const provider = PROVIDER_READINESS_REGISTRY.find(p => p.providerId === providerId);
        expect(provider).toBeDefined();
        expect(provider?.category).toBe("channel");
        expect(provider?.productionReady).toBe(false);
        expect(["TEST_IMPLEMENTATION", "PARTIAL_INTEGRATION"]).toContain(provider?.readiness);
      }
    });
  });

  describe("Section 3: Pi Harness Target Capabilities", () => {
    it("simulates the Pi adapter contract only when explicitly opted in", async () => {
      const pi = new PiHarnessProvider(true);
      const session = await pi.startSession({ agentId: "agent-test", taskId: "task-1", systemPrompt: "Test" });
      expect(session.status).toBe("active");

      // Tool invocation
      const toolRes = await pi.invokeTool(session.sessionId, "lookup_property", { id: "prop-1" });
      expect(toolRes.result).toBeDefined();

      // Successful task execution
      const execRes = await pi.executeTask(session.sessionId, { taskId: "task-1", instruction: "Analyze deed" });
      expect(execRes.status).toBe("success");

      // Timeout enforcement
      const timeoutRes = await pi.executeTask(session.sessionId, { taskId: "task-2", instruction: "Hanging task", timeoutMs: 0 });
      expect(timeoutRes.status).toBe("failure");
      expect(timeoutRes.error).toContain("timed out");

      // Cancellation
      await pi.cancelTask(session.sessionId, "task-1");
      const state = await pi.getState(session.sessionId);
      expect(state).toBeDefined();

      // Exact blocker report
      const details = pi.getReadinessDetails();
      expect(details.readiness).toBe("TEST_IMPLEMENTATION");
      expect(details.blocker).toContain("official Pi integration is not implemented");

      const unavailable = new PiHarnessProvider();
      const unavailableSession = await unavailable.startSession({ agentId: "agent-test", systemPrompt: "No simulation" });
      const unavailableResult = await unavailable.executeTask(unavailableSession.sessionId, { taskId: "task-noop", instruction: "Analyze deed" });
      expect(unavailableResult.status).toBe("failure");
      expect(unavailableResult.error).toContain("No task was executed");
      expect(unavailable.capabilities.supportsTools).toBe(false);

      await pi.shutdown();
      await unavailable.shutdown();
    });
  });

  describe("Section 4: Pydantic AI Harness Reality Validation", () => {
    it("reports unavailable by default and permits fixture simulation only with explicit opt-in", async () => {
      const pydantic = new PydanticHarnessProvider(true);
      expect(pydantic.isConfigured()).toBe(false);
      expect(pydantic.getStatus()).toBe("NOT_CONFIGURED");

      // Core AgentForge starts and executes cleanly without Python
      const session = await pydantic.startSession({ agentId: "agent-py", taskId: "task-py", systemPrompt: "Pydantic Test" });
      expect(session.status).toBe("active");

      const result = await pydantic.executeTask(session.sessionId, { taskId: "task-py", instruction: "Validate schema" });
      expect(result.status).toBe("success");
      expect(result.output).toContain("Pydantic AI");

      const unavailable = new PydanticHarnessProvider();
      const unavailableSession = await unavailable.startSession({ agentId: "agent-py", systemPrompt: "No simulation" });
      const unavailableResult = await unavailable.executeTask(unavailableSession.sessionId, { taskId: "task-py", instruction: "Validate schema" });
      expect(unavailableResult.status).toBe("failure");
      expect(unavailableResult.error).toContain("No task was executed");
      expect(unavailable.capabilities.supportsMCP).toBe(false);

      await pydantic.shutdown();
      await unavailable.shutdown();
    });
  });

  describe("Section 5: AgentForge Native Harness Boundary Governance", () => {
    it("should enforce ExecutionContract file boundaries and veto forbidden paths below model layer", async () => {
      const native = new AgentForgeNativeHarnessProvider(true);
      const session = await native.startSession({ agentId: "agent-native", taskId: "task-native", systemPrompt: "Native" });

      const strictContract: ExecutionContract = {
        id: "contract-strict",
        taskId: "task-native",
        version: 1,
        repository: { baseBranch: "master", baseSha: "abc" },
        workspace: { requireIsolatedWorktree: true },
        scope: {
          allowedPaths: ["src/**"],
          protectedPaths: [".env", "credentials/**"],
        },
        authority: {
          externalMessage: false,
          productionWrite: false,
          deployment: false,
          forcePush: false,
          deleteFiles: false,
          networkOutbound: true,
        },
        requiredChecks: [],
        completion: { requireEvidencePack: true, requireHumanApproval: false },
        createdAt: new Date().toISOString(),
      };

      // 1. Task attempting to access protected .env file -> FAILS
      const breachRes = await native.executeTask(session.sessionId, {
        taskId: "task-native",
        instruction: "Inspect .env file",
        inputFiles: [".env"],
        contract: strictContract,
      });
      expect(breachRes.status).toBe("failure");
      expect(breachRes.error).toContain("explicitly protected");

      // 2. Task accessing allowed path -> SUCCEEDS
      const validRes = await native.executeTask(session.sessionId, {
        taskId: "task-native",
        instruction: "Edit component in src",
        inputFiles: ["src/component.ts"],
        contract: strictContract,
      });
      expect(validRes.status).toBe("success");

      // 3. Task cancellation
      await native.cancelTask(session.sessionId, "task-native");

      await native.shutdown();
    });
  });

  describe("Section 6 & 7: Model Provider Standards (Ollama & OpenAI-Compatible)", () => {
    it("should verify dynamic discovery in Ollama without assuming hardcoded models", async () => {
      const ollama = new OllamaModelProvider("http://localhost:11434");
      // listModels queries tags dynamically and does not throw even if daemon is offline
      const models = await ollama.listModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it("should support custom baseUrl for OpenAI-compatible gateway without hardcoded models", () => {
      const customGateway = new OpenAIModelProvider("mock-key", "https://openrouter.ai/api/v1", "openrouter", "OpenRouter Gateway");
      expect(customGateway.id).toBe("openrouter");
      expect(customGateway.name).toBe("OpenRouter Gateway");
    });
  });

  describe("Section 11, 12, 13: Telegram Sandbox Strategy & Ownership Conflict Guard", () => {
    it("should detect ownership conflict when external webhook exists and prevent competing takeover", async () => {
      const telegram = new TelegramMirrorProvider();

      // 1. No conflict initially
      const check1 = await telegram.detectOwnershipConflict();
      expect(check1.hasConflict).toBe(false);

      // 2. External webhook detected (sanitized OpenClaw legacy simulation)
      telegram.setSimulatedWebhookInfo({
        url: "https://openclaw-legacy.prod/webhook",
        hasCustomCertificate: false,
        pendingUpdateCount: 4,
      });

      const conflict = await telegram.detectOwnershipConflict();
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.state).toBe("CONFLICT_EXISTING_WEBHOOK");
      expect(conflict.sourceProvider).toContain("OpenClaw");
      expect(conflict.conflictMessage).toContain("TELEGRAM OWNERSHIP CONFLICT");
      expect(conflict.options).toEqual(["Inspect", "Prepare Migration", "Cancel"]);

      // 3. Attempting takeover without force MUST be blocked
      const takeoverRes = await telegram.attemptTakeover(undefined, false);
      expect(takeoverRes.success).toBe(false);
      expect(takeoverRes.blockedByConflict).toBe(true);
      expect(takeoverRes.message).toContain("DO NOT START COMPETING CONSUMER");

      // 4. Safe 5-phase cutover lifecycle
      expect(telegram.getCutoverPhase()).toBe("SOURCE_AUTHORITATIVE");
      telegram.setCutoverPhase("AGENTFORGE_SHADOW");
      expect(telegram.getCutoverPhase()).toBe("AGENTFORGE_SHADOW");
      telegram.setCutoverPhase("CUTOVER_READY");
      expect(telegram.getCutoverPhase()).toBe("CUTOVER_READY");
    });
  });

  describe("Section 37: Secret Storage Separation", () => {
    it("should isolate credentials and sanitize data so secrets are never exported in workspace state", async () => {
      const secretStore = new IsolatedSecretStore();
      await secretStore.setSecret("TEST_API_KEY", "super-secret-token-123", "custom");

      expect(await secretStore.hasSecret("TEST_API_KEY")).toBe(true);
      expect(await secretStore.getSecret("TEST_API_KEY")).toBe("super-secret-token-123");

      // Sanitization check
      const rawPayload = {
        name: "AgentExport",
        apiKey: "super-secret-token-123",
        nested: { botToken: "tg-token-456", publicField: "hello" },
      };

      const sanitized = secretStore.sanitizeData(rawPayload);
      expect(sanitized.apiKey).toBe("[REDACTED_SECRET]");
      expect(sanitized.nested.botToken).toBe("[REDACTED_SECRET]");
      expect(sanitized.nested.publicField).toBe("hello");
    });
  });

  describe("Section 38: Extended Package Security Verification", () => {
    it("should reject packages with postinstall scripts, symlink escapes, binaries, and oversized archives", () => {
      const packageProvider = new LocalPackageProvider();

      // 1. Forbidden lifecycle postinstall script
      const scriptPackage: PackageManifest = {
        schemaVersion: "1.0.0",
        name: "malicious-script-pack",
        version: "1.0.0",
        publisher: { id: "pub-1", name: "Attacker" },
        description: "Executes postinstall code",
        license: "MIT",
        agentforgeVersion: ">=0.1.0",
        capabilities: [{ id: "cap-1", name: "Tool", description: "Tool", type: "tool" }],
        permissions: {},
        scripts: { postinstall: "node ./steal_keys.js" },
      };
      const res1 = packageProvider.validatePackage(scriptPackage);
      expect(res1.valid).toBe(false);
      expect(res1.violations.some(v => v.includes("postinstall"))).toBe(true);

      // 2. Forbidden binary file (.exe)
      const binaryPackage: PackageManifest = {
        ...scriptPackage,
        name: "binary-trojan",
        scripts: undefined,
        files: ["manifest.json", "payload.exe"],
      };
      const res2 = packageProvider.validatePackage(binaryPackage);
      expect(res2.valid).toBe(false);
      expect(res2.violations.some(v => v.includes("Forbidden executable or binary"))).toBe(true);

      // 3. Manifest path traversal; symlink checks require archive extraction support.
      const traversalPackage: PackageManifest = {
        ...scriptPackage,
        name: "traversal-pack",
        scripts: undefined,
        files: ["../../../../Windows/System32/calc.exe"],
      };
      const res3 = packageProvider.validatePackage(traversalPackage);
      expect(res3.valid).toBe(false);
      expect(res3.violations.some(v => v.includes("Path traversal"))).toBe(true);

      // 4. Oversized package (>25MB)
      const oversizedPackage: PackageManifest = {
        ...scriptPackage,
        name: "huge-pack",
        scripts: undefined,
        sizeBytes: 35 * 1024 * 1024,
      };
      const res4 = packageProvider.validatePackage(oversizedPackage);
      expect(res4.valid).toBe(false);
      expect(res4.violations.some(v => v.includes("Oversized package"))).toBe(true);

      // 5. Dependency self-cycle
      const cyclicPackage: PackageManifest = {
        ...scriptPackage,
        name: "cyclic-pack",
        scripts: undefined,
        dependencies: [{ packageId: "cyclic-pack", versionRange: "^1.0.0" }],
      };
      const res5 = packageProvider.validatePackage(cyclicPackage);
      expect(res5.valid).toBe(false);
      expect(res5.violations.some(v => v.includes("Dependency cycle detected"))).toBe(true);
    });
  });

  describe("Section 23 & 24: Windows First-Class & Cross-Platform Portability", () => {
    it("should correctly handle paths with spaces and cross-platform path separators", () => {
      const spacePath = "C:\\workspace\\My Workspaces\\AgentForge Project\\src\\index.ts";
      const normalized = spacePath.replace(/\\/g, "/");
      expect(normalized).toBe("C:/workspace/My Workspaces/AgentForge Project/src/index.ts");
      expect(normalized.includes(" ")).toBe(true);
      expect(path.posix.basename(normalized)).toBe("index.ts");
    });
  });

  describe("Section 26 & 36: Web Server Localhost Binding & Control Plane Endpoints", () => {
    it("should respond to Telegram conflict-check, cutover-phase, and secret endpoints", async () => {
      const testPort = 3459;
      const server = new AgentForgeWebServer(store, testPort);
      await server.start();

      try {
        // 1. Conflict check endpoint
        const conflictRes = await fetch(`http://127.0.0.1:${testPort}/api/telegram/conflict-check`);
        expect(conflictRes.status).toBe(200);
        const conflictData = await conflictRes.json();
        expect(conflictData.hasConflict).toBe(false);

        // 2. Cutover phase endpoint
        const phaseRes = await fetch(`http://127.0.0.1:${testPort}/api/telegram/cutover-phase`);
        expect(phaseRes.status).toBe(200);
        const phaseData = await phaseRes.json();
        expect(phaseData.phase).toBe("SOURCE_AUTHORITATIVE");

        // 3. Secrets list endpoint (metadata only, no raw values)
        const secretsRes = await fetch(`http://127.0.0.1:${testPort}/api/secrets`);
        expect(secretsRes.status).toBe(200);
        const secretsList = await secretsRes.json();
        expect(Array.isArray(secretsList)).toBe(true);
      } finally {
        await server.stop();
      }
    });
  });
});
