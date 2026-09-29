import type { Assertion } from "./mechanicsHarness.js";
const fixtureContracts: Record<string, Record<string, unknown>> = {
  scoreProtocolFamilies: { valid: true, scorer: "protocol-family-v1", totalCases: 12, correctCases: 12, negativeCases: 0, evaluatorDataUsedOutsideInput: true },
  scoreHeldoutProtocolFamilies: { valid: true, scorer: "protocol-family-v1-heldout", totalCases: 60, correctCases: 60, negativeCases: 0, evaluatorDataUsedOutsideInput: true },
  validateTaskFixtures: { valid: true, fixture: "research-offline-intent-v1", cases: 2 },
  validateProtocolFamilies: { valid: true, fixture: "research-protocol-families-v1", families: 6, developmentCases: 12 },
  validateHeldoutProtocolFamilies: { valid: true, fixture: "research-protocol-families-v1-heldout", split: "heldout", families: 6, heldoutCases: 60 },
};
const contracts: Record<string, Record<string, unknown>> = {
  accountingSlice: { checkpointAtomic: true, unknownBillingPreserved: true, completedTrajectoryNotDuplicated: true, capStopsNextReservation: true },
  productionPathSlice: { evaluatorAnswersOutsideInput: true, trajectoryCheckpointed: true, passedCases: 3, totalCases: 3 },
  measuredRunGuardSlice: { validConfigAccepted: true, mockConfigRejected: true },
  contextIntegritySlice: { preservedRequiredFact: true, sourceProvenancePreserved: true, compressionObserved: true },
  offlineSlice: { "result.passedOverall": true, "result.failedCases": 0, "result.totalCases": 2, "result.passedCases": 2, "negativeControl.rejectedAsExpected": true, "negativeControl.passedCases": 0, "negativeControl.totalCases": 2, "negativeControl.failedCases": 2 },
  memoryAndEvidenceSlice: { "memory.retainedHit": true, "memory.crossTenantIsolation": true, "completionAudit.passed": true },
  correctionSlice: { pendingReplayRejected: true, "automaticMutation.allowed": false, approvedStatus: "APPROVED", replayCaseCreated: true },
  correctionTransferSlice: { pendingReplayRejected: true, laterEquivalentCaseTransferred: true, automaticMutationDenied: true },
  workflowRecoverySlice: { blockedPrerequisiteReported: true, completionClaimed: false },
  durableMemorySlice: { persistedEntryCount: 1, retainedAcrossProcess: true },
  handoffSlice: { restored: true, goalHashPreserved: true, requirementsPreserved: true, dagPreserved: true },
};
export const runners = ["hashProtocolInputs", "validateTaskFixtures", "validateProtocolFamilies", "validateHeldoutProtocolFamilies", "scoreProtocolFamilies", "scoreHeldoutProtocolFamilies", ...Object.keys(contracts), "validatePilotConfig", "validateOwnerApprovalPacket", "validateProtocol", "validateEvidencePaths", "validateManuscript"];
export function adaptLegacy(checkId: string, raw: Record<string, unknown>, inputHashes: Record<string, string>): Assertion[] {
  if (!runners.includes(checkId)) throw new Error("unknown legacy check");
  if (("passed" in raw && raw.passed !== true) || ("valid" in raw && raw.valid !== true)) throw new Error("legacy result reports failure");
  if (checkId === "hashProtocolInputs") {
    const files = raw.files as Record<string, unknown> | undefined;
    if (!files || !Object.keys(files).length) throw new Error("missing hash manifest");
    return Object.entries(files).map(([file, hash]) => ({ id: `hash:${file}`, passed: typeof hash === "string" && hash === inputHashes[file] }));
  }
  const contract = fixtureContracts[checkId] ?? contracts[checkId] ?? { valid: true };
  return Object.entries(contract).map(([field, expected]) => {
    let actual: unknown = raw;
    for (const key of field.split(".")) actual = actual && typeof actual === "object" ? (actual as Record<string, unknown>)[key] : undefined;
    return { id: field, passed: actual === expected };
  });
}
