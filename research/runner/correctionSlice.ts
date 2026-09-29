import { CorrectionRegistry } from "../../src/core/quality/correctionRegistry.js";

const registry = new CorrectionRegistry();
const proposal = registry.propose({
  evidence: { evidenceRef: "evidence:synthetic-correction" },
  correctedExpectedResult: { kind: "json", value: { outcome: "request_more_evidence" } },
  rationale: "The fixture must not invent a missing fact.",
});

const automaticMutation = registry.rejectAutomaticMutation();
let pendingReplayRejected = false;
try {
  registry.toDeterministicCase(proposal.correctionId);
} catch {
  pendingReplayRejected = true;
}
const approved = registry.approve(proposal.correctionId, "synthetic-reviewer");
const replay = registry.toDeterministicCase(proposal.correctionId);

if (!pendingReplayRejected) throw new Error("pending correction replay was not rejected");
if (automaticMutation.allowed !== false) throw new Error("automatic mutation was allowed");
if (approved.status !== "APPROVED") throw new Error(`correction was not approved: ${approved.status}`);
if (!replay.replayKey) throw new Error("approved correction did not create a replay case");

console.log(JSON.stringify({
  experimentId: "correction-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  pendingReplayRejected,
  automaticMutation,
  approvedStatus: approved.status,
  replayCaseCreated: Boolean(replay.replayKey),
  interpretation: "Mechanics only; this proves approval and replay-key boundaries, not reduced recurrence in a model.",
}, null, 2));
