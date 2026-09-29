import { SemanticMemory, type EmbeddingProvider } from "../../src/semanticMemory.js";
import { CompletionAuditor, type AuditorContext } from "../../src/core/completion/completionAuditor.js";

// Deterministic fixture embedding: real SemanticMemory, no network or model.
const provider: EmbeddingProvider = {
  dimension: 4,
  async embed(text: string) {
    const value = text.toLowerCase();
    return [
      value.includes("deadline") ? 1 : 0,
      value.includes("privacy") ? 1 : 0,
      value.includes("handoff") ? 1 : 0,
      value.includes("photos") ? 1 : 0,
    ];
  },
};

const memory = new SemanticMemory(provider, 10, 0.8);
await memory.store({
  prompt: "The handoff deadline is Friday; preserve the privacy boundary.",
  response: { deadline: "Friday", privacy: "synthetic-only" },
  tenantId: "tenant-a",
  modelFamily: "fixture",
  tokenCount: 18,
});

const retained = await memory.query({
  prompt: "What is the handoff deadline?",
  tenantId: "tenant-a",
  modelFamily: "fixture",
});
const isolated = await memory.query({
  prompt: "What is the handoff deadline?",
  tenantId: "tenant-b",
  modelFamily: "fixture",
});

const auditor = new CompletionAuditor();
const baseContext: AuditorContext = {
  originalGoal: {
    id: "goal-fixture",
    rawText: "Complete the synthetic task with evidence.",
    submittedBy: "fixture",
    submittedAt: new Date(0).toISOString(),
    immutableHash: "fixture-hash",
  },
  prd: {
    id: "prd-fixture",
    goalId: "goal-fixture",
    title: "Synthetic task",
    overview: "Fixture",
    requirements: [{
      id: "REQ-1",
      goalId: "goal-fixture",
      category: "functional",
      title: "Produce evidence",
      description: "Produce a checked artifact.",
      acceptanceCriteria: ["artifact exists"],
      impliedDependencies: [],
      riskLevel: "low",
      testStrategy: "deterministic",
    }],
    dependencies: [],
    riskAnalysis: [],
    testStrategy: { unit: [], integration: [], e2e: [], security: [] },
    verificationRequirements: [],
    documentationRequirements: [],
    rollbackRequirements: [],
    releaseCriteria: [],
    generatedAt: new Date(0).toISOString(),
    isLocked: true,
  },
  implementedRequirementIds: ["REQ-1"],
  testedRequirementIds: ["REQ-1"],
  codeArtifactPaths: ["research/runner/memoryAndEvidenceSlice.ts"],
  testFilePaths: ["research/runner/memoryAndEvidenceSlice.ts"],
  evidencePacks: [{ requirementId: "REQ-1", claim: "fixture evidence", level: "L2_UNIT_TESTED", simulationType: "SIMULATED" }],
  errorPathsCovered: true,
  documentationVerified: true,
};
const audit = await auditor.audit(baseContext);

if (!retained.hit) throw new Error("same-tenant memory fact was not retained");
if (isolated.hit) throw new Error("cross-tenant memory query returned a fact");
if (!audit.passed) throw new Error(`completion evidence audit failed: ${JSON.stringify(audit)}`);

const summary = {
  experimentId: "memory-evidence-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  memory: {
    retainedHit: retained.hit,
    retainedResponse: retained.entry?.response,
    crossTenantIsolation: !isolated.hit,
  },
  completionAudit: { passed: audit.passed, reasons: audit.reasonsForFailure },
  interpretation: "Mechanics only; this does not establish cross-process durability, model handoff quality, or production reliability.",
};
console.log(JSON.stringify(summary, null, 2));
