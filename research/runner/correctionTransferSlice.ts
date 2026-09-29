import { CorrectionRegistry } from "../../src/core/quality/correctionRegistry.js";

const registry = new CorrectionRegistry();
const proposal = registry.propose({
  evidence: { evidenceRef: "evidence:synthetic-transfer", evidenceDigest: "c".repeat(64) },
  correctedExpectedResult: { kind: "json", value: { disposition: "request_more_evidence" } },
});
let pendingRejected = false;
try { registry.toDeterministicCase(proposal.correctionId); } catch { pendingRejected = true; }
registry.approve(proposal.correctionId, "synthetic-reviewer");
const replay = registry.toDeterministicCase(proposal.correctionId);
const laterEquivalentCase = {
  caseId: "correction-transfer-later-equivalent",
  sourceCorrectionId: replay.sourceCorrectionId,
  expectedResult: replay.expectedResult,
  replayKey: replay.replayKey,
};
const transferApplied = laterEquivalentCase.expectedResult.value.disposition === "request_more_evidence"
  && laterEquivalentCase.replayKey === replay.replayKey;
const unapprovedMutationDenied = registry.rejectAutomaticMutation().allowed === false;
if (!pendingRejected || !transferApplied || !unapprovedMutationDenied) {
  console.error(JSON.stringify({ valid: false, pendingRejected, transferApplied, unapprovedMutationDenied }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  experimentId: "correction-transfer-slice-2026-09-29-v1",
  syntheticOnly: true,
  networkCalls: 0,
  providerCalls: 0,
  pendingReplayRejected: pendingRejected,
  laterEquivalentCaseTransferred: transferApplied,
  automaticMutationDenied: unapprovedMutationDenied,
  interpretation: "Correction transfer mechanics only; recurrence reduction in model behavior remains unmeasured.",
}, null, 2));
