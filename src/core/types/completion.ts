/**
 * AgentForge Completion Engine Types
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Defines the immutable goal, PRD, PRD critic, stable requirement IDs,
 * execution DAG, completion contract, claim/evidence levels, simulation honesty,
 * adversarial auditor, and automatic repair loop.
 */

export interface OriginalGoal {
  readonly id: string;
  readonly rawText: string;
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly immutableHash: string;
}

export type RequirementCategory =
  | "functional"
  | "safety"
  | "reliability"
  | "performance"
  | "documentation"
  | "migration";

export interface Requirement {
  id: string; // e.g. "AF-REQ-001"
  goalId: string;
  category: RequirementCategory;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  impliedDependencies: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  testStrategy: string;
  rollbackRequirement?: string;
}

export interface PRDDocument {
  id: string;
  goalId: string;
  title: string;
  overview: string;
  requirements: Requirement[];
  dependencies: string[];
  riskAnalysis: { risk: string; mitigation: string; severity: "low" | "medium" | "high" | "critical" }[];
  testStrategy: { unit: string[]; integration: string[]; e2e: string[]; security: string[] };
  verificationRequirements: string[];
  documentationRequirements: string[];
  rollbackRequirements: string[];
  releaseCriteria: string[];
  generatedAt: string;
  criticReviewedAt?: string;
  isLocked: boolean;
}

export interface PRDCriticReview {
  reviewId: string;
  goalId: string;
  omissionsFromGoal: string[];
  impliedDependenciesAdded: string[];
  missingSafetyRequirements: string[];
  missingTestsIdentified: string[];
  edgeCasesIdentified: string[];
  rollbackIdentified: string[];
  critiquePassed: boolean;
  revisedPRD: PRDDocument;
}

export interface RequirementTraceabilityRecord {
  requirementId: string;
  goalId: string;
  taskIds: string[];
  codeArtifacts: string[];
  testNames: string[];
  evidencePackIds: string[];
  auditResultStatus?: "PENDING" | "PASSED" | "FAILED" | "REPAIRED";
  blockerReason?: string;
}

export type ExecutionDagNodeStatus =
  | "PENDING"
  | "READY"
  | "EXECUTING"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED";

export interface ExecutionDagNode {
  id: string;
  requirementId: string;
  title: string;
  dependencies: string[]; // requirement IDs that must be completed first
  status: ExecutionDagNodeStatus;
  blockedReason?: string;
  isIndependent: boolean;
}

export interface InteractionPolicy {
  autonomous: boolean;
  askOnlyIfBlocking: boolean;
  optionalPreferencesUseSafeDefault: boolean;
  intermediateReports: boolean;
  phaseConfirmation: boolean;
  continueAfterCheckpoint: boolean;
  continueAfterCommit: boolean;
  continueAfterTestPass: boolean;
  continueAfterRepair: boolean;
  continueUnrelatedWorkWhenBlocked: boolean;
}

export const DEFAULT_INTERACTION_POLICY: InteractionPolicy = {
  autonomous: true,
  askOnlyIfBlocking: true,
  optionalPreferencesUseSafeDefault: true,
  intermediateReports: false,
  phaseConfirmation: false,
  continueAfterCheckpoint: true,
  continueAfterCommit: true,
  continueAfterTestPass: true,
  continueAfterRepair: true,
  continueUnrelatedWorkWhenBlocked: true,
};

export type EvidenceLevel =
  | "L0_CLAIMED"
  | "L1_STATIC_IMPLEMENTATION"
  | "L2_UNIT_TESTED"
  | "L3_INTEGRATION_TESTED"
  | "L4_E2E_TESTED"
  | "L5_REAL_PROVIDER_TESTED"
  | "L6_SHADOW_VERIFIED"
  | "L7_PRODUCTION_VERIFIED";

export const EVIDENCE_LEVEL_RANK: Record<EvidenceLevel, number> = {
  L0_CLAIMED: 0,
  L1_STATIC_IMPLEMENTATION: 1,
  L2_UNIT_TESTED: 2,
  L3_INTEGRATION_TESTED: 3,
  L4_E2E_TESTED: 4,
  L5_REAL_PROVIDER_TESTED: 5,
  L6_SHADOW_VERIFIED: 6,
  L7_PRODUCTION_VERIFIED: 7,
};

export type SimulationType =
  | "MOCK"
  | "SIMULATED"
  | "ESTIMATED"
  | "MEASURED"
  | "REAL_PROVIDER"
  | "SHADOW"
  | "PRODUCTION";

export type SubstantialTaskState =
  | "PLANNING"
  | "EXECUTING"
  | "VERIFYING"
  | "AUDITING"
  | "REPAIRING"
  | "BLOCKED_EXTERNAL"
  | "BLOCKED_OWNER"
  | "FAILED"
  | "COMPLETE_VERIFIED";

export interface CompletionContract {
  id: string;
  taskId: string;
  requiredRequirements: string[];
  minEvidenceLevel: EvidenceLevel;
  requiredSimulationDisclosures: SimulationType[];
  requireBuildPass: boolean;
  requireTypecheckPass: boolean;
  requireTestsPass: boolean;
  requireBrowserSmoke: boolean;
  requireIntegrationTests: boolean;
  requireProviderTest: boolean;
  requireSecretScan: boolean;
  requirePiiScan: boolean;
  requireDocumentation: boolean;
  requireRollbackPlan: boolean;
  requireAdversarialAuditPass: boolean;
  allowedUnresolvedTodos: TodoClassification[];
}

export interface CompletionCheckEvidence {
  status: "PASS" | "FAIL" | "NOT_RUN";
  evidencePath?: string;
  completedAt?: string;
}

/** Results from host-side verification tools; worker completion claims are not evidence. */
export interface CompletionVerificationEvidence {
  tests: CompletionCheckEvidence & { passRate: number };
  build: CompletionCheckEvidence;
  typecheck: CompletionCheckEvidence;
  browserSmoke?: CompletionCheckEvidence;
  integrationTests: CompletionCheckEvidence;
  providerTest?: CompletionCheckEvidence;
  secretScan: CompletionCheckEvidence;
  piiScan: CompletionCheckEvidence;
  documentation: CompletionCheckEvidence;
  rollbackPlan: CompletionCheckEvidence;
  evidenceLevel: EvidenceLevel;
  simulationDisclosures: SimulationType[];
}

export type TodoClassification =
  | "EXPECTED_FUTURE"
  | "NON_BLOCKING"
  | "RELEASE_BLOCKER"
  | "DEAD_CODE";

export interface TodoScanFinding {
  file: string;
  line: number;
  keyword: string;
  snippet: string;
  classification: TodoClassification;
  rationale: string;
}

export interface AuditDisproofAttempt {
  inquiry: string;
  finding?: string;
  severity: "BLOCKER" | "WARNING" | "CLEAN";
  relatedRequirementId?: string;
}

export interface CompletionAuditResult {
  auditId: string;
  passed: boolean;
  disproofAttempts: AuditDisproofAttempt[];
  todoFindings: TodoScanFinding[];
  unmetRequirements: string[];
  untestedImplementations: string[];
  evidenceDeficits: {
    requirementId: string;
    claim: string;
    currentLevel: EvidenceLevel;
    requiredLevel: EvidenceLevel;
  }[];
  reasonsForFailure: string[];
  auditedAt: string;
}

export interface RepairTask {
  id: string;
  defectId: string;
  requirementId?: string;
  description: string;
  suggestedFix: string;
  attemptCount: number;
  maxAttempts: number;
  status: "PENDING" | "IN_PROGRESS" | "FIXED" | "BLOCKED";
}
