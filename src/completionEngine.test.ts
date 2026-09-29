/**
 * AgentForge Completion Engine Test Suite
 * Anti-Spoon-Feeding / Verified Completion Contract
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Requirement } from "./core/types/completion.js";
import {
  CompletionEngine,
  PRDEngine,
  PRDCritic,
  ExecutionDag,
  TraceabilityMatrix,
  CompletionContractEnforcer,
  CompletionAuditor,
  AutomaticRepairLoop,
  TodoAuditor,
  JsonCompletionSessionStore,
  OriginalGoal,
  EVIDENCE_LEVEL_RANK,
} from "./core/completion/index.js";

describe("AgentForge Completion Engine — Anti-Spoon-Feeding & Verified Completion", () => {
  const sampleGoalText = `
BUILD COMPREHENSIVE MULTI-CHANNEL AGENTFORGE PLATFORM
- Implement bidirectional Web, Telegram, and Discord mirroring
- Ensure absolute staging and production isolation with zero writes to production
- Provide deterministic System-1 intent routing and empirical model selection
- Enforce strict Git worktree execution contracts below model layer
- Implement tamper-evident EvidencePack generation and verification
- Support Scribe SOP ingestion and business rule extraction
- Deliver unified actionable inbox and multi-view web control plane
`;

  it("Section 1: OriginalGoal immutability — frozen payload & stable hash", () => {
    const engine = new CompletionEngine();
    const session = engine.initializeSession("task-AF-100", sampleGoalText, "user-owner");

    expect(session.originalGoal.rawText).toBe(sampleGoalText);
    expect(session.originalGoal.immutableHash).toHaveLength(64);
    expect(Object.isFrozen(session.originalGoal)).toBe(true);
    expect(Reflect.set(session.originalGoal, "rawText", "tampered goal")).toBe(false);
    expect(session.originalGoal.rawText).toBe(sampleGoalText);
    expect(session.originalGoal.submittedBy).toBe("user-owner");
    expect(session.state).toBe("PLANNING");
    expect(session.verifiedByEngine).toBe(false);
    expect(Reflect.set(session, "state", "COMPLETE_VERIFIED")).toBe(false);
    expect(engine.getSession("task-AF-100")?.state).toBe("PLANNING");
  });

  it("persists a frozen substantial-task session and restores execution state after restart", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-completion-session-"));
    const sessionPath = path.join(directory, "sessions.json");
    try {
      const firstRun = new CompletionEngine(undefined, new JsonCompletionSessionStore(sessionPath));
      const created = firstRun.initializeSession("task-AF-RESTORE", sampleGoalText, "user-owner");
      const started = firstRun.startExecution(created.taskId);

      const restarted = new CompletionEngine(undefined, new JsonCompletionSessionStore(sessionPath));
      const restored = restarted.getSession(created.taskId);
      expect(restored?.originalGoal.rawText).toBe(sampleGoalText);
      expect(restored?.originalGoal.immutableHash).toBe(created.originalGoal.immutableHash);
      expect(restored?.state).toBe(started.state);
      expect(restored?.prd.requirements).toEqual(started.prd.requirements);
      expect(restored?.dag).toEqual(started.dag);
      expect(Object.isFrozen(restored?.originalGoal)).toBe(true);
      expect(Object.isFrozen(restored?.traceability)).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("recovers a dead completion-session writer lock", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-completion-lock-"));
    const sessionPath = path.join(directory, "sessions.json");
    const lockPath = `${sessionPath}.lock`;
    try {
      fs.writeFileSync(lockPath, JSON.stringify({ pid: 4_294_967_291, createdAt: "old" }));
      const stale = new Date(Date.now() - 60_000);
      fs.utimesSync(lockPath, stale, stale);
      const engine = new CompletionEngine(undefined, new JsonCompletionSessionStore(sessionPath));
      engine.initializeSession("task-AF-LOCK-RECOVERY", sampleGoalText, "user-owner");
      expect(fs.existsSync(lockPath)).toBe(false);
      expect(new JsonCompletionSessionStore(sessionPath).loadAll()).toHaveLength(1);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a persisted session if its immutable OriginalGoal hash was altered", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-completion-tamper-"));
    const sessionPath = path.join(directory, "sessions.json");
    try {
      const store = new JsonCompletionSessionStore(sessionPath);
      const session = new CompletionEngine(undefined, store).initializeSession("task-AF-TAMPER", sampleGoalText);
      const altered = structuredClone(session);
      (altered as { originalGoal: { rawText: string } }).originalGoal.rawText = "changed after submission";
      fs.writeFileSync(sessionPath, JSON.stringify({ version: 1, sessions: [altered] }));
      expect(() => new CompletionEngine(undefined, store)).toThrow("Persisted completion session is invalid");
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("does not trust a persisted COMPLETE_VERIFIED label without revalidating evidence after restart", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-completion-verified-"));
    const sessionPath = path.join(directory, "sessions.json");
    try {
      const store = new JsonCompletionSessionStore(sessionPath);
      const session = new CompletionEngine(undefined, store).initializeSession("task-AF-RECHECK", sampleGoalText);
      const claimed = {
        ...structuredClone(session),
        state: "COMPLETE_VERIFIED",
        verifiedByEngine: true,
        completedAt: new Date().toISOString(),
        contractDeficits: [],
      };
      fs.writeFileSync(sessionPath, JSON.stringify({ version: 1, sessions: [claimed] }));

      const restored = new CompletionEngine(undefined, store).getSession(session.taskId);
      expect(restored?.state).toBe("FAILED");
      expect(restored?.verifiedByEngine).toBe(false);
      expect(restored?.completedAt).toBeUndefined();
      expect(restored?.contractDeficits).toContain("Persisted completion requires fresh verification after process restart.");
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("Section 2: PRD Engine — autonomous requirement extraction & criteria formulation", () => {
    const prdEngine = new PRDEngine();
    const goal: OriginalGoal = {
      id: "goal-123",
      rawText: sampleGoalText,
      submittedBy: "user-owner",
      submittedAt: new Date().toISOString(),
      immutableHash: "dummy-hash",
    };

    const prd = prdEngine.generatePRD(goal);
    expect(prd.requirements.length).toBeGreaterThanOrEqual(5);
    expect(prd.requirements[0].id).toBe("AF-REQ-001");
    expect(prd.requirements[0].category).toBe("safety");
    expect(prd.requirements[0].riskLevel).toBe("critical");
    expect(prd.requirements[0].acceptanceCriteria.length).toBeGreaterThan(0);
    expect(prd.testStrategy.unit.length).toBeGreaterThan(0);
    expect(prd.rollbackRequirements.length).toBeGreaterThan(0);
  });

  it("Section 3: PRD Critic — independent adversarial review & baseline locking", () => {
    const prdEngine = new PRDEngine();
    const critic = new PRDCritic();
    const goal: OriginalGoal = {
      id: "goal-123",
      rawText: sampleGoalText,
      submittedBy: "user-owner",
      submittedAt: new Date().toISOString(),
      immutableHash: "dummy-hash",
    };

    const rawPrd = prdEngine.generatePRD(goal);
    const review = critic.reviewAndLock(rawPrd, goal);

    expect(review.critiquePassed).toBe(true);
    expect(review.revisedPRD.isLocked).toBe(true);
    expect(review.revisedPRD.criticReviewedAt).toBeDefined();

    // Verify all requirements have rollback and test strategies locked
    for (const req of review.revisedPRD.requirements) {
      expect(req.testStrategy).toBeDefined();
      expect(req.rollbackRequirement).toBeDefined();
    }
  });

  it("fails PRD review when required safety coverage is absent or goal terms are uncovered", () => {
    const critic = new PRDCritic();
    const goal: OriginalGoal = {
      id: "goal-critic-gap",
      rawText: "Deliver an authenticated resilient platform with a verified deployment audit",
      submittedBy: "owner",
      submittedAt: new Date().toISOString(),
      immutableHash: "unused-by-critic",
    };
    const prd = new PRDEngine().generatePRD(goal);
    const unsafePrd = { ...prd, requirements: prd.requirements.filter(requirement => requirement.category !== "safety") };
    const review = critic.reviewAndLock(unsafePrd, goal);

    expect(review.missingSafetyRequirements).toContain("Missing explicit safety and production isolation requirement");
    expect(review.critiquePassed).toBe(false);

    const keywordGap = critic.reviewAndLock({
      ...prd,
      requirements: [{ ...prd.requirements[0], title: "Basic", description: "A simple item", category: "safety" as const }],
    }, goal);
    expect(keywordGap.omissionsFromGoal.length).toBeGreaterThan(0);
    expect(keywordGap.critiquePassed).toBe(false);
  });

  it("preserves every source requirement in a substantial task without truncating the tail", () => {
    const engine = new CompletionEngine();
    const session = engine.initializeSession(
      "task-AF-CRITIC-BLOCK",
      `Build a federated platform\n${Array.from({ length: 22 }, (_, index) =>
        `- Add capabilityfeature${index} subsystemunit${index} integrationflow${index}`
      ).join("\n")}`,
    );
    expect(session.prd.requirements).toHaveLength(24);
    expect(session.prd.requirements.some(item => item.description === "Build a federated platform")).toBe(true);
    for (let index = 0; index < 22; index++) {
      expect(session.prd.requirements.some(item => item.description === `Add capabilityfeature${index} subsystemunit${index} integrationflow${index}`)).toBe(true);
    }
    expect(session.criticReview.omissionsFromGoal).toEqual([]);
  });

  it("derives observable acceptance checks from UI, integration, and regression intent", () => {
    const goal: OriginalGoal = {
      id: "goal-semantic-plan",
      rawText: "- Fix the broken mobile dashboard\n- Connect the Telegram webhook\n- Document the operator runbook",
      submittedBy: "owner", submittedAt: new Date().toISOString(), immutableHash: "semantic-plan-hash",
    };
    const requirements = new PRDEngine().generatePRD(goal).requirements;
    const dashboard = requirements.find(item => item.description === "Fix the broken mobile dashboard")!;
    const integration = requirements.find(item => item.description === "Connect the Telegram webhook")!;
    const documentation = requirements.find(item => item.description === "Document the operator runbook")!;
    expect(dashboard.acceptanceCriteria.join(" ")).toContain("narrow-screen");
    expect(dashboard.testStrategy).toContain("regression");
    expect(integration.acceptanceCriteria.join(" ")).toContain("mock receipt");
    expect(integration.riskLevel).toBe("high");
    expect(documentation.category).toBe("documentation");
    expect(documentation.rollbackRequirement).toBeDefined();
  });

  it("keeps a compound outcome intact while exposing its deliverables for review", () => {
    const goal: OriginalGoal = {
      id: "goal-compound-plan",
      rawText: "Create a project workspace. Add a responsive work board. Verify the browser flow.",
      submittedBy: "owner", submittedAt: new Date().toISOString(), immutableHash: "compound-plan-hash",
    };
    const requirements = new PRDEngine().generatePRD(goal).requirements;
    expect(requirements.some(item => item.description === goal.rawText)).toBe(true);
    expect(requirements.some(item => item.description === "Create a project workspace")).toBe(true);
    expect(requirements.some(item => item.description === "Add a responsive work board")).toBe(true);
    expect(requirements.some(item => item.description === "Verify the browser flow")).toBe(true);
    const browserRequirement = requirements.find(item => item.description === "Verify the browser flow");
    expect(browserRequirement?.acceptanceCriteria.join(" ")).toContain("focused automated check");
  });

  it("Section 4: Requirement Traceability Matrix — links goal to audit result with orphan detection", () => {
    const matrix = new TraceabilityMatrix();
    matrix.registerRequirement("AF-REQ-001", "goal-123");
    matrix.registerRequirement("AF-REQ-002", "goal-123");

    matrix.linkTask("AF-REQ-001", "task-101");
    matrix.linkCodeArtifact("AF-REQ-001", "src/auth/isolation.ts");
    matrix.linkTest("AF-REQ-001", "test-isolation-suite");
    matrix.linkEvidence("AF-REQ-001", "evidence-pack-1");

    // AF-REQ-001 is complete, AF-REQ-002 is orphan
    const orphans = matrix.findOrphanRequirements();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].requirementId).toBe("AF-REQ-002");
    expect(orphans[0].missing).toEqual(["task", "code", "test"]);

    expect(matrix.isArtifactClassified("src/auth/isolation.ts")).toBe(true);
    expect(matrix.isArtifactClassified("src/untracked/orphan.ts")).toBe(false);
  });

  it("records bounded traceability without granting a worker completion authority", () => {
    const engine = new CompletionEngine();
    const session = engine.initializeSession("task-AF-TRACE", "Build a reviewable task workflow");
    const requirementId = session.prd.requirements[1]!.id;

    const recorded = engine.recordRequirementTraceability(session.taskId, requirementId, {
      codeArtifacts: ["src/workflow.ts", "src/workflow.ts"],
      testNames: ["src/workflow.test.ts"],
      evidencePackIds: ["evidence/workflow-check.json"],
    });
    const trace = recorded.traceability.find(record => record.requirementId === requirementId)!;

    expect(trace.taskIds).toEqual([session.taskId]);
    expect(trace.codeArtifacts).toEqual(["src/workflow.ts"]);
    expect(trace.testNames).toEqual(["src/workflow.test.ts"]);
    expect(trace.evidencePackIds).toEqual(["evidence/workflow-check.json"]);
    expect(recorded.state).toBe("PLANNING");
    expect(recorded.verifiedByEngine).toBe(false);
    expect(() => engine.recordRequirementTraceability(session.taskId, "AF-REQ-999", {}))
      .toThrow("does not belong");
  });

  it("Section 5: Execution DAG — isolated subtree blocking while independent work continues", () => {
    const dag = new ExecutionDag();
    dag.buildFromRequirements([
      {
        id: "AF-REQ-CORE",
        goalId: "g1",
        category: "functional",
        title: "Core Platform",
        description: "Core runtime",
        acceptanceCriteria: [],
        impliedDependencies: [],
        riskLevel: "medium",
        testStrategy: "",
      },
      {
        id: "AF-REQ-VOICE-RETELL",
        goalId: "g1",
        category: "functional",
        title: "Retell Live Integration",
        description: "Requires external Retell API key",
        acceptanceCriteria: [],
        impliedDependencies: ["AF-REQ-CORE"],
        riskLevel: "medium",
        testStrategy: "",
      },
      {
        id: "AF-REQ-VOICE-ANALYTICS",
        goalId: "g1",
        category: "functional",
        title: "Voice Live Analytics",
        description: "Depends on Retell integration",
        acceptanceCriteria: [],
        impliedDependencies: ["AF-REQ-VOICE-RETELL"],
        riskLevel: "low",
        testStrategy: "",
      },
      {
        id: "AF-REQ-WEB-UI",
        goalId: "g1",
        category: "functional",
        title: "Web UI 17 Views",
        description: "Independent control plane views",
        acceptanceCriteria: [],
        impliedDependencies: ["AF-REQ-CORE"],
        riskLevel: "medium",
        testStrategy: "",
      },
      {
        id: "AF-REQ-OLLAMA",
        goalId: "g1",
        category: "functional",
        title: "Ollama Local AI",
        description: "Local inference",
        acceptanceCriteria: [],
        impliedDependencies: ["AF-REQ-CORE"],
        riskLevel: "low",
        testStrategy: "",
      },
    ]);

    // Complete core
    dag.completeNode("AF-REQ-CORE");
    const ready = dag.getReadyNodes();
    expect(ready.map(r => r.requirementId)).toEqual(["AF-REQ-VOICE-RETELL", "AF-REQ-WEB-UI", "AF-REQ-OLLAMA"]);

    // Retell credential missing: blocks Retell AND cascades to Voice Analytics,
    // but UI and Ollama remain ready/independent!
    const blockRes = dag.blockNode("AF-REQ-VOICE-RETELL", "Retell API key not configured");
    expect(blockRes.blockedId).toBe("AF-REQ-VOICE-RETELL");
    expect(blockRes.cascadedCount).toBe(1); // Voice Analytics was blocked

    const voiceAnalyticsNode = dag.getNode("AF-REQ-VOICE-ANALYTICS");
    expect(voiceAnalyticsNode?.status).toBe("BLOCKED");

    const uiNode = dag.getNode("AF-REQ-WEB-UI");
    expect(uiNode?.status).toBe("READY");

    const ollamaNode = dag.getNode("AF-REQ-OLLAMA");
    expect(ollamaNode?.status).toBe("READY");

    // Continue independent work
    dag.completeNode("AF-REQ-WEB-UI");
    dag.completeNode("AF-REQ-OLLAMA");
    expect(uiNode?.status).toBe("COMPLETED");
    expect(ollamaNode?.status).toBe("COMPLETED");
  });

  it("rejects missing, duplicate, and cyclic dependencies before replacing a valid DAG", () => {
    const dag = new ExecutionDag();
    const requirement = (id: string, impliedDependencies: string[] = []): Requirement => ({
      id,
      goalId: "goal-validation",
      category: "functional",
      title: id,
      description: "DAG validation fixture",
      acceptanceCriteria: [],
      impliedDependencies,
      riskLevel: "low",
      testStrategy: "unit test",
    });

    dag.buildFromRequirements([requirement("A"), requirement("B", ["A"])]);
    expect(() => dag.buildFromRequirements([requirement("A", ["MISSING"])]))
      .toThrow("A depends on missing requirement MISSING");
    expect(() => dag.buildFromRequirements([requirement("A"), requirement("A")]))
      .toThrow("Duplicate requirement ID A");
    expect(() => dag.buildFromRequirements([requirement("A", ["B"]), requirement("B", ["A"])]))
      .toThrow("Dependency cycle");

    // An invalid replacement must leave the last known-good graph available.
    expect(dag.listNodes().map(node => node.requirementId)).toEqual(["A", "B"]);
    expect(dag.getReadyNodes().map(node => node.requirementId)).toEqual(["A"]);
  });

  it("Section 6: Completion Contract Enforcer — validates completion criteria strictly", () => {
    const enforcer = new CompletionContractEnforcer();
    const contract = CompletionContractEnforcer.createDefaultContract("task-1", ["AF-REQ-001", "AF-REQ-002"]);

    // Failing context (missing requirement, secret scan failure)
    const failingResult = enforcer.evaluate(contract, {
      requirementsImplemented: ["AF-REQ-001"],
      testsPassed: true,
      testPassRate: 100,
      buildPassed: true,
      typecheckPassed: true,
      integrationTestsPassed: true,
      secretScanPassed: false, // Secret scan failed!
      piiScanPassed: true,
      documentationPresent: true,
      rollbackPlanPresent: true,
      adversarialAuditPassed: true,
      unresolvedTodoClassifications: [],
      evidenceLevel: "L3_INTEGRATION_TESTED",
      simulationDisclosures: ["MOCK"],
    });

    expect(failingResult.passed).toBe(false);
    expect(failingResult.deficits).toContain("Requirement AF-REQ-002 is not verified as implemented.");
    expect(failingResult.deficits.some(d => d.includes("Secret scan failed"))).toBe(true);

    // Passing context
    const passingResult = enforcer.evaluate(contract, {
      requirementsImplemented: ["AF-REQ-001", "AF-REQ-002"],
      testsPassed: true,
      testPassRate: 100,
      buildPassed: true,
      typecheckPassed: true,
      integrationTestsPassed: true,
      secretScanPassed: true,
      piiScanPassed: true,
      documentationPresent: true,
      rollbackPlanPresent: true,
      adversarialAuditPassed: true,
      unresolvedTodoClassifications: ["NON_BLOCKING"],
      evidenceLevel: "L3_INTEGRATION_TESTED",
      simulationDisclosures: ["MOCK"],
    });

    expect(passingResult.passed).toBe(true);
    expect(passingResult.deficits).toHaveLength(0);

    const browserAndProviderContract = {
      ...contract,
      requireBrowserSmoke: true,
      requireProviderTest: true,
    };
    const missingExtendedChecks = enforcer.evaluate(browserAndProviderContract, {
      requirementsImplemented: ["AF-REQ-001", "AF-REQ-002"],
      testsPassed: true,
      testPassRate: 100,
      buildPassed: true,
      typecheckPassed: true,
      integrationTestsPassed: true,
      secretScanPassed: true,
      piiScanPassed: true,
      documentationPresent: true,
      rollbackPlanPresent: true,
      adversarialAuditPassed: true,
      unresolvedTodoClassifications: [],
      evidenceLevel: "L3_INTEGRATION_TESTED",
      simulationDisclosures: ["MOCK"],
    });
    expect(missingExtendedChecks.passed).toBe(false);
    expect(missingExtendedChecks.deficits).toContain("Required real-browser smoke check failed or was not executed.");
    expect(missingExtendedChecks.deficits).toContain("Required provider integration test failed or was not executed.");

    const withExtendedChecks = enforcer.evaluate(browserAndProviderContract, {
      requirementsImplemented: ["AF-REQ-001", "AF-REQ-002"],
      testsPassed: true,
      testPassRate: 100,
      buildPassed: true,
      typecheckPassed: true,
      browserSmokePassed: true,
      integrationTestsPassed: true,
      providerTestsPassed: true,
      secretScanPassed: true,
      piiScanPassed: true,
      documentationPresent: true,
      rollbackPlanPresent: true,
      adversarialAuditPassed: true,
      unresolvedTodoClassifications: [],
      evidenceLevel: "L3_INTEGRATION_TESTED",
      simulationDisclosures: ["MOCK"],
    });
    expect(withExtendedChecks.passed).toBe(true);
  });

  it("Section 7: TODO / Placeholder Auditor — classifies findings into expected categories", () => {
    const auditor = new TodoAuditor();
    const sampleCode = `
      // TODO: Future v2 distributed consensus roadmap
      export const FOO = 42;
      // FIXME: critical production bug here
      // Note: non-blocking mock provider marker
      throw new Error("Not implemented");
    `;

    const findings = auditor.scanContent(sampleCode, "src/engine/sample.ts");
    expect(findings.length).toBeGreaterThanOrEqual(3);

    const blocker = findings.find(f => f.snippet.includes("throw new Error"));
    expect(blocker?.classification).toBe("RELEASE_BLOCKER");

    const fixme = findings.find(f => f.snippet.includes("FIXME"));
    expect(fixme?.classification).toBe("RELEASE_BLOCKER");

    const future = findings.find(f => f.snippet.includes("Future v2"));
    expect(future?.classification).toBe("EXPECTED_FUTURE");

    const productionMarkers = auditor.scanContent(
      "// TODO: finish the production path\n// MOCK: adapter in a test fixture\nconst fake = true;",
      "src/engine/runtime.ts",
    );
    expect(productionMarkers.find(f => f.keyword === "TODO")?.classification).toBe("RELEASE_BLOCKER");
    expect(productionMarkers.find(f => f.keyword === "MOCK")?.classification).toBe("EXPECTED_FUTURE");
    expect(productionMarkers.find(f => f.keyword === "fake")?.classification).toBe("RELEASE_BLOCKER");

    const specMarker = auditor.scanContent("TODO: future integration", "docs/specification.md");
    expect(specMarker[0]?.classification).toBe("NON_BLOCKING");
  });

  it("Section 8: Completion Auditor — adversarial disproof attempts & simulation honesty", async () => {
    const auditor = new CompletionAuditor();
    const goal: OriginalGoal = {
      id: "goal-1",
      rawText: "Deliver reliable agent system",
      submittedBy: "user-owner",
      submittedAt: new Date().toISOString(),
      immutableHash: "hash-1",
    };

    const result = await auditor.audit({
      originalGoal: goal,
      prd: {
        id: "prd-1",
        goalId: "goal-1",
        title: "Test PRD",
        overview: "Overview",
        requirements: [
          {
            id: "AF-REQ-001",
            goalId: "goal-1",
            category: "functional",
            title: "Core Service",
            description: "Core service",
            acceptanceCriteria: [],
            impliedDependencies: [],
            riskLevel: "medium",
            testStrategy: "",
          },
          {
            id: "AF-REQ-002",
            goalId: "goal-1",
            category: "functional",
            title: "Secondary Service",
            description: "Secondary",
            acceptanceCriteria: [],
            impliedDependencies: [],
            riskLevel: "low",
            testStrategy: "",
          },
        ],
        dependencies: [],
        riskAnalysis: [],
        testStrategy: { unit: [], integration: [], e2e: [], security: [] },
        verificationRequirements: [],
        documentationRequirements: [],
        rollbackRequirements: [],
        releaseCriteria: [],
        generatedAt: new Date().toISOString(),
        isLocked: true,
      },
      implementedRequirementIds: ["AF-REQ-001"], // AF-REQ-002 missing
      testedRequirementIds: ["AF-REQ-001"],
      codeArtifactPaths: ["src/core.ts"],
      testFilePaths: ["src/core.test.ts"],
      evidencePacks: [
        {
          requirementId: "AF-REQ-001",
          claim: "Real external live provider connected",
          level: "L2_UNIT_TESTED",
          simulationType: "MOCK", // Simulation honesty breach! Mock claiming live
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.unmetRequirements).toContain("AF-REQ-002");
    expect(result.reasonsForFailure.some(r => r.includes("Simulation honesty breach"))).toBe(true);
  });

  it("Section 9: Automatic Repair Loop — autonomous repair tasks & bounded cycle protection", async () => {
    const repairLoop = new AutomaticRepairLoop(2, 3);
    const mockAuditResult = {
      auditId: "audit-fail",
      passed: false,
      disproofAttempts: [],
      todoFindings: [],
      unmetRequirements: ["AF-REQ-005"],
      untestedImplementations: ["AF-REQ-003"],
      evidenceDeficits: [],
      reasonsForFailure: ["Test suite failed for module X"],
      auditedAt: new Date().toISOString(),
    };

    let repairAttempts = 0;
    const result = await repairLoop.runLoop(
      mockAuditResult,
      async (task) => {
        repairAttempts++;
        return true; // repair succeeds
      },
      async () => {
        // After repair, audit passes
        return {
          auditId: "audit-pass",
          passed: true,
          disproofAttempts: [],
          todoFindings: [],
          unmetRequirements: [],
          untestedImplementations: [],
          evidenceDeficits: [],
          reasonsForFailure: [],
          auditedAt: new Date().toISOString(),
        };
      }
    );

    expect(result.allResolved).toBe(true);
    expect(result.iterationsRun).toBe(1);
    expect(result.repairedTasks.length).toBeGreaterThan(0);
    expect(repairAttempts).toBeGreaterThan(0);
  });

  it("Section 10: Completion Authority & Full Lifecycle — Worker cannot self-complete; only Engine verifies", async () => {
    const engine = new CompletionEngine();
    const session = engine.initializeSession("task-AF-FLOW", sampleGoalText, "user-owner");
    const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-completion-evidence-"));
    const evidencePaths = [
      "artifacts/tests.json",
      "artifacts/build.log",
      "artifacts/typecheck.log",
      "artifacts/integration-tests.json",
      "artifacts/secretscan.json",
      "artifacts/piiscan.json",
      "README.md",
      "docs/rollback.md",
    ];
    for (const evidencePath of evidencePaths) {
      const fullPath = path.join(evidenceDir, evidencePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, "test evidence\n");
    }

    expect(session.state).toBe("PLANNING");
    for (const requirementId of session.prd.requirements.map(requirement => requirement.id)) {
      engine.recordRequirementTraceability(session.taskId, requirementId, {
        codeArtifacts: ["src/core/index.ts"],
        testNames: ["src/masterBuild.test.ts"],
        evidencePackIds: ["artifacts/tests.json"],
      });
    }
    engine.startExecution("task-AF-FLOW");
    expect(session.state).toBe("PLANNING");
    expect(engine.getSession("task-AF-FLOW")?.state).toBe("EXECUTING");

    const reqIds = session.prd.requirements.map(r => r.id);

    // Worker signals WORKER_FINISHED:
    const completedSession = await engine.handleWorkerFinished("task-AF-FLOW", {
      implementedRequirementIds: [...reqIds],
      testedRequirementIds: [...reqIds],
      codeArtifactPaths: ["src/core/index.ts", "src/server/webServer.ts"],
      testFilePaths: ["src/masterBuild.test.ts"],
      evidencePacks: reqIds.map(id => ({
        requirementId: id,
        claim: `Verified implementation for ${id}`,
        level: "L3_INTEGRATION_TESTED" as const,
        simulationType: "MEASURED" as const,
      })),
      uiTestedRealBrowser: true,
      errorPathsCovered: true,
      documentationVerified: true,
      workspaceDir: evidenceDir,
    }, {
      tests: { status: "PASS", evidencePath: "artifacts/tests.json", completedAt: new Date().toISOString(), passRate: 100 },
      build: { status: "PASS", evidencePath: "artifacts/build.log", completedAt: new Date().toISOString() },
      typecheck: { status: "PASS", evidencePath: "artifacts/typecheck.log", completedAt: new Date().toISOString() },
      integrationTests: { status: "PASS", evidencePath: "artifacts/integration-tests.json", completedAt: new Date().toISOString() },
      secretScan: { status: "PASS", evidencePath: "artifacts/secretscan.json", completedAt: new Date().toISOString() },
      piiScan: { status: "PASS", evidencePath: "artifacts/piiscan.json", completedAt: new Date().toISOString() },
      documentation: { status: "PASS", evidencePath: "README.md", completedAt: new Date().toISOString() },
      rollbackPlan: { status: "PASS", evidencePath: "docs/rollback.md", completedAt: new Date().toISOString() },
      evidenceLevel: "L3_INTEGRATION_TESTED",
      simulationDisclosures: ["MOCK", "SIMULATED"],
    });

    // ONLY CompletionEngine has the authority to declare COMPLETE_VERIFIED
    expect(completedSession.state).toBe("COMPLETE_VERIFIED");
    expect(completedSession.verifiedByEngine).toBe(true);
    expect(completedSession.completedAt).toBeDefined();

    const report = engine.generateFinalReport("task-AF-FLOW");
    expect(report).toContain("AgentForge Verified Completion Report");
    expect(report).toContain("COMPLETE_VERIFIED");
    expect(report).toContain("**Verified By Engine:** YES (Verified)");
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  });

  it("fails closed when a worker supplies nonexistent evidence paths", async () => {
    const engine = new CompletionEngine();
    const session = engine.initializeSession("task-AF-NO-EVIDENCE", sampleGoalText);
    engine.startExecution(session.taskId);
    const reqIds = session.prd.requirements.map(req => req.id);
    const emptyWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-empty-evidence-"));

    const result = await engine.handleWorkerFinished("task-AF-NO-EVIDENCE", {
      implementedRequirementIds: [],
      testedRequirementIds: [],
      codeArtifactPaths: ["src/core/index.ts"],
      testFilePaths: ["src/core/index.test.ts"],
      evidencePacks: reqIds.map(id => ({
        requirementId: id,
        claim: `Worker claims implementation for ${id}`,
        level: "L3_INTEGRATION_TESTED" as const,
        simulationType: "MEASURED" as const,
      })),
      workspaceDir: emptyWorkspace,
    }, {
      tests: { status: "PASS", evidencePath: "missing/tests.json", completedAt: new Date().toISOString(), passRate: 100 },
      build: { status: "PASS", evidencePath: "missing/build.log", completedAt: new Date().toISOString() },
      typecheck: { status: "PASS", evidencePath: "missing/typecheck.log", completedAt: new Date().toISOString() },
      integrationTests: { status: "PASS", evidencePath: "missing/integration.json", completedAt: new Date().toISOString() },
      secretScan: { status: "PASS", evidencePath: "missing/secrets.json", completedAt: new Date().toISOString() },
      piiScan: { status: "PASS", evidencePath: "missing/pii.json", completedAt: new Date().toISOString() },
      documentation: { status: "PASS", evidencePath: "missing/readme.md", completedAt: new Date().toISOString() },
      rollbackPlan: { status: "PASS", evidencePath: "missing/rollback.md", completedAt: new Date().toISOString() },
      evidenceLevel: "L3_INTEGRATION_TESTED",
      simulationDisclosures: [],
    });

    expect(result.state).toBe("FAILED");
    expect(result.verifiedByEngine).toBe(false);
    expect(result.contractDeficits).toContain("Build/compilation check failed.");
    expect(result.contractDeficits).toContain("Typecheck / lint verification failed.");
    expect(result.contractDeficits).toContain("Secret scan failed: possible credential leak detected.");
    expect(result.repairLoopResult).toBeUndefined();
    expect(result.traceability.every(record => record.codeArtifacts.length === 0 && record.testNames.length === 0)).toBe(true);
    fs.rmSync(emptyWorkspace, { recursive: true, force: true });
  });

  it("Section 11: Evidence level ranking invariants", () => {
    expect(EVIDENCE_LEVEL_RANK.L0_CLAIMED).toBe(0);
    expect(EVIDENCE_LEVEL_RANK.L3_INTEGRATION_TESTED).toBe(3);
    expect(EVIDENCE_LEVEL_RANK.L7_PRODUCTION_VERIFIED).toBe(7);
    expect(EVIDENCE_LEVEL_RANK.L5_REAL_PROVIDER_TESTED).toBeGreaterThan(EVIDENCE_LEVEL_RANK.L2_UNIT_TESTED);
  });
});
