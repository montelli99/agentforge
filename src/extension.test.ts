import { describe, expect, it } from "vitest";
import {
  ScribeProcessProvider,
  ProcessCompiler,
  MockVoiceProvider,
  RetellVoiceProvider,
  LocalPackageProvider,
  BenchmarkRunner,
} from "./providers/index.js";
import type {
  ExecutionContract,
  PackageManifest,
  BenchmarkSuite,
} from "./core/index.js";

describe("AgentForge vNext Extension Architecture", () => {
  describe("Process-to-Agent & SOP Authority (Sections 9, 10, 11, 12, 15)", () => {
    const sampleScribeSop = `
# Seller Qualification Standard Operating Procedure

1. Search CRM for inbound phone number
2. Review property address and tax appraisal records
3. If photos are missing, request interior inspection photos?
4. Move lead to Ready To Underwrite in CRM
5. Delete old unverified seller notes
`;

    it("ingests Scribe SOP and parses structured steps and decision points", async () => {
      const scribe = new ScribeProcessProvider();
      const process = await scribe.ingest({
        sourceType: "scribe",
        rawContent: sampleScribeSop,
      });

      expect(process.title).toBe("Seller Qualification Standard Operating Procedure");
      expect(process.steps).toHaveLength(5);
      expect(process.steps[0].instruction).toContain("Search CRM");

      // Step 3 was a decision point with '?'
      const step3 = process.steps[2];
      expect(step3.decisionPoint).toBeDefined();
      expect(step3.decisionPoint?.question).toContain("photos are missing");

      // Markdown export works cleanly
      const exported = scribe.exportToMarkdown(process);
      expect(exported).toContain("Seller Qualification");
    });

    it("enforces: SOP IS NOT AUTHORITY (detects unresolved business rules)", async () => {
      const scribe = new ScribeProcessProvider();
      const process = await scribe.ingest({
        sourceType: "scribe",
        rawContent: sampleScribeSop,
      });

      const compiler = new ProcessCompiler();
      const agentSpec = compiler.compile(process);

      // Must detect unresolved rules for privileged actions like "Move lead" or "Delete"
      expect(agentSpec.unresolvedRules.length).toBeGreaterThan(0);
      const moveLeadRule = agentSpec.unresolvedRules.find((r) =>
        r.question.includes("Move lead to Ready To Underwrite"),
      );
      expect(moveLeadRule).toBeDefined();
      expect(moveLeadRule?.resolved).toBe(false);

      // System prompt instructs agent not to exceed boundaries
      expect(agentSpec.systemPrompt).toContain("SAFETY ENFORCEMENT");

      // Suggested ExecutionContract template requires human approval for unresolved rules
      expect(agentSpec.suggestedExecutionContract.completion).toBeDefined();

      // Owner explicitly resolves the rule
      const resolvedSpec = compiler.resolveRule(
        agentSpec,
        moveLeadRule!.id,
        "Lead must have verified equity > 25% and confirmed seller willingness to receive cash offer.",
        "user-montelli",
      );

      const updatedRule = resolvedSpec.unresolvedRules.find(
        (r) => r.id === moveLeadRule!.id,
      );
      expect(updatedRule?.resolved).toBe(true);
      expect(updatedRule?.resolvedByUserId).toBe("user-montelli");
      expect(resolvedSpec.systemPrompt).toContain("Lead must have verified equity > 25%");
    });
  });

  describe("Voice Provider Contract & Workspace Event Integration (Sections 16, 17, 18, 19, 20)", () => {
    it("advertises full voice capability matrix without hardcoding vendor defaults", () => {
      const mockVoice = new MockVoiceProvider();
      const retellVoice = new RetellVoiceProvider();

      const mockCaps = mockVoice.getCapabilities();
      expect(mockCaps.supportsOutboundCall).toBe(true);
      expect(mockCaps.supportsSimulation).toBe(true);

      const retellCaps = retellVoice.getCapabilities();
      expect(retellCaps.supportsOutboundCall).toBe(true);
      expect(retellCaps.supportsSimulation).toBe(false); // Retell does not support local offline simulation
    });

    it("executes an outbound voice call with recordings, transcripts, and channel context", async () => {
      const voice = new MockVoiceProvider();

      // Start outbound call linked directly to canonical workspace channel
      const call = await voice.startOutboundCall({
        agentId: "agent-caller",
        recipientPhoneNumber: "+15550192834",
        recipientName: "John Doe",
        canonicalChannelId: "chan-ppc-calls",
      });

      expect(call.id).toBeDefined();
      expect(call.status).toBe("IN_PROGRESS");
      expect(call.canonicalChannelId).toBe("chan-ppc-calls");

      // Inspect transcript
      const transcript = await voice.getTranscript(call.id);
      expect(transcript).toBeDefined();
      expect(transcript?.segments.length).toBeGreaterThan(0);
      expect(transcript?.fullText).toContain("Agent: Hello");

      // Inspect audio recording
      const recording = await voice.getRecording(call.id);
      expect(recording?.url).toContain(".wav");
      expect(recording?.durationSeconds).toBe(145);

      // Verify cost & usage tracking
      const cost = await voice.getCost(call.id);
      expect(cost).toBeGreaterThan(0);

      // Stream call events
      const events: any[] = [];
      for await (const evt of voice.streamEvents(call.id)) {
        events.push(evt);
      }
      expect(events.some((e) => e.type === "call_started")).toBe(true);

      // End call and verify outcome disposition
      await voice.endCall(call.id);
      const finalCall = await voice.getCall(call.id);
      expect(finalCall?.status).toBe("COMPLETED");
      expect(finalCall?.outcome?.disposition).toBe("interested");
    });
  });

  describe("AgentForge Package Standard & Permission Manifest (Sections 4, 7, 28)", () => {
    const safeContract: ExecutionContract = {
      id: "contract-base",
      taskId: "task-install",
      version: 1,
      repository: { baseBranch: "master", baseSha: "802e04a" },
      workspace: { requireIsolatedWorktree: true },
      scope: { allowedPaths: ["workspace/**"], protectedPaths: [".env"] },
      authority: {
        externalMessage: false,
        productionWrite: false,
        deployment: false,
        forcePush: false,
        deleteFiles: false,
        networkOutbound: true,
      },
      requiredChecks: [],
      completion: { requireEvidencePack: true, requireHumanApproval: true },
      createdAt: new Date().toISOString(),
    };

    const packageProvider = new LocalPackageProvider();

    it("validates a compliant package manifest structure", () => {
      const validManifest: PackageManifest = {
        schemaVersion: "1.0.0",
        name: "real-estate-acquisitions-pack",
        version: "1.2.0",
        publisher: { id: "pub-forge", name: "AgentForge Community", verified: true },
        description: "Automated seller intake and evaluation workflows",
        license: "Apache-2.0",
        agentforgeVersion: ">=0.1.0",
        capabilities: [{ id: "cap-intake", name: "Intake Agent", description: "Handles intake", type: "agent" }],
        permissions: {
          filesystem: { workspace: { read: true, write: true } },
          git: { read: true, branch: true, commit: true, forcePush: false },
          network: { outbound: true, allowedDomains: ["api.crm.local"] },
        },
      };

      const res = packageProvider.validateManifest(validManifest);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("rejects malformed runtime manifests without throwing", () => {
      const malformed: unknown[] = [
        null,
        [],
        { schemaVersion: "1.0.0", name: "broken", capabilities: "agent", permissions: [] },
      ];

      for (const candidate of malformed) {
        const result = packageProvider.validatePackage(candidate as PackageManifest);
        expect(result.valid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      }
    });

    it("validates package paths by path segment and rejects reserved device names", () => {
      const base: PackageManifest = {
        schemaVersion: "1.0.0",
        name: "safe-package",
        version: "1.0.0",
        publisher: { id: "pub-test", name: "Test Publisher" },
        description: "Path validation test",
        license: "UNLICENSED",
        agentforgeVersion: ">=0.1.0",
        capabilities: [{ id: "cap-safe", name: "Safe", description: "Safe capability", type: "tool" }],
        permissions: { filesystem: { workspace: { read: true, write: false }, home: { read: false } } },
        files: ["src/release..notes.md"],
      };
      expect(packageProvider.validatePackage(base).valid).toBe(true);
      expect(packageProvider.validatePackage({ ...base, files: ["src/../outside.txt"] }).valid).toBe(false);
      expect(packageProvider.validatePackage({ ...base, files: ["src/folder./file.txt"] }).valid).toBe(false);
      expect(packageProvider.validatePackage({ ...base, name: "CON" }).valid).toBe(false);
      expect(packageProvider.validatePackage({
        ...base,
        permissions: { filesystem: { additionalPaths: ["../../secrets"] } },
      }).valid).toBe(false);
    });

    it("strictly blocks package permissions that exceed ExecutionContract authority", () => {
      const maliciousManifest: PackageManifest = {
        schemaVersion: "1.0.0",
        name: "rogue-deployer-pack",
        version: "0.9.0",
        publisher: { id: "pub-untrusted", name: "Unknown" },
        description: "Attempts unpermitted actions",
        license: "MIT",
        agentforgeVersion: ">=0.1.0",
        capabilities: [{ id: "cap-rogue", name: "Rogue Agent", description: "Rogue", type: "agent" }],
        permissions: {
          git: { forcePush: true }, // Forbidden by contract!
          deployment: { production: true }, // Forbidden by contract!
        },
      };

      const check = packageProvider.checkPermissionsAgainstContract(maliciousManifest, safeContract);
      expect(check.valid).toBe(false);
      expect(check.errors.some((e) => e.includes("forcePush"))).toBe(true);
      expect(check.errors.some((e) => e.includes("deployment:production"))).toBe(true);
      expect(check.permissionDiscrepancies).toHaveLength(2);
    });

    it("installs a package locally after explicit permission approval", () => {
      const manifest: PackageManifest = {
        schemaVersion: "1.0.0",
        name: "dental-claims-agent",
        version: "1.0.0",
        publisher: { id: "pub-healthcare", name: "HealthTech AI" },
        description: "Dental claims processing agent",
        license: "Proprietary",
        agentforgeVersion: ">=0.1.0",
        capabilities: [{ id: "cap-claims", name: "Claims Agent", description: "Processes claims", type: "agent" }],
        permissions: {
          filesystem: { workspace: { read: true, write: false } },
        },
      };

      const inst = packageProvider.installPackage({
        manifest,
        installedByUserId: "user-montelli",
        workspaceId: "ws-healthcare",
        approvedPermissions: manifest.permissions,
      });

      expect(inst.status).toBe("active");
      expect(packageProvider.getInstalled("dental-claims-agent")).toBeDefined();
      expect(packageProvider.listInstalled()).toHaveLength(1);
    });

    it("rejects permission approval beyond the package manifest request", () => {
      const manifest: PackageManifest = {
        schemaVersion: "1.0.0", name: "limited-pack", version: "1.0.0",
        publisher: { id: "pub-test", name: "Test Publisher" }, description: "Permission boundary test",
        license: "MIT", agentforgeVersion: "*",
        capabilities: [{ id: "cap-test", name: "Test", description: "Test capability", type: "tool" }],
        permissions: { filesystem: { workspace: { read: true, write: false } } },
      };
      expect(() => packageProvider.installPackage({
        manifest,
        installedByUserId: "user-montelli",
        workspaceId: "ws-test",
        approvedPermissions: { filesystem: { workspace: { read: true, write: true } } },
      })).toThrow("subset of the permissions requested");
    });
  });

  describe("Benchmark Suite & Empirical Verification (Sections 22, 23, 24)", () => {
    it("runs an empirical benchmark suite and evaluates compatibility", async () => {
      const runner = new BenchmarkRunner();

      const suite: BenchmarkSuite = {
        id: "bench-model-reasoning",
        name: "System-1 Reasoning & Tool Call Suite",
        targetType: "MODEL",
        cases: [
          {
            id: "case-1",
            name: "JSON Extraction",
            description: "Extract structured json",
            input: { prompt: "Extract name: Alice, age: 30" },
            expectedOutput: { name: "Alice", age: 30 },
            timeoutMs: 1000,
            tags: ["extraction"],
          },
          {
            id: "case-2",
            name: "Category Classifier",
            description: "Classify bug vs feature",
            input: { prompt: "Fix authentication timeout bug" },
            expectedOutput: { category: "bug_fix" },
            timeoutMs: 500,
            tags: ["classification"],
          },
        ],
        thresholds: [
          { metricName: "pass_rate", comparison: "gte", targetValue: 90 },
        ],
      };

      // Simulated target executor
      const mockTargetExecutor = async (input: Record<string, unknown>) => {
        if (String(input.prompt).includes("Extract name")) {
          return { output: { name: "Alice", age: 30 }, latencyMs: 45 };
        }
        return { output: { category: "bug_fix" }, latencyMs: 25 };
      };

      const result = await runner.runSuite(suite, "qwen2.5:3b", mockTargetExecutor);

      expect(result.totalCases).toBe(2);
      expect(result.passedCases).toBe(2);
      expect(result.passedOverall).toBe(true);

      const compat = runner.evaluateCompatibility("MODEL", "qwen2.5:3b", result);
      expect(compat.compatible).toBe(true);
      expect(compat.supportedFeatures).toEqual([]);
      expect(compat.unsupportedFeatures).toEqual([]);
      expect(compat.recommendedTiers).toEqual([]);
    });
  });
});
