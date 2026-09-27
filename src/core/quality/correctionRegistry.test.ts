import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CorrectionRegistry } from "./correctionRegistry.js";
import { WorkspaceStore } from "../store/workspaceStore.js";

describe("CorrectionRegistry", () => {
  it("keeps corrections pending and stores only an opaque evidence reference", () => {
    const registry = new CorrectionRegistry();
    const proposal = registry.propose({
      evidence: { evidenceRef: "evidence-pack:case-42", evidenceDigest: "a".repeat(64) },
      correctedExpectedResult: { kind: "text", value: "Ask one clarifying question before acting." },
      rationale: "The previous result made an unsupported assumption.",
    });

    expect(proposal.status).toBe("PENDING_APPROVAL");
    expect(proposal.evidence).toEqual({ evidenceRef: "evidence-pack:case-42", evidenceDigest: "a".repeat(64) });
    expect(registry.list("PENDING_APPROVAL")).toHaveLength(1);
  });

  it("rejects automatic memory or authority mutation", () => {
    const registry = new CorrectionRegistry();
    expect(registry.rejectAutomaticMutation()).toEqual({ allowed: false, reason: "HUMAN_APPROVAL_REQUIRED" });
  });

  it("does not create a replay case until a human approves the correction", () => {
    const registry = new CorrectionRegistry();
    const proposal = registry.propose({
      evidence: { evidenceRef: "evidence:pending-case" },
      correctedExpectedResult: { kind: "json", value: { disposition: "request_more_evidence" } },
    });

    expect(() => registry.toDeterministicCase(proposal.correctionId)).toThrow(/human-approved/);
    registry.approve(proposal.correctionId, "reviewer-17");
    const replay = registry.toDeterministicCase(proposal.correctionId);
    expect(replay).toMatchObject({
      sourceCorrectionId: proposal.correctionId,
      approvedBy: "reviewer-17",
      expectedResult: { kind: "json", value: { disposition: "request_more_evidence" } },
    });
    expect(replay.replayKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it("requires a pending proposal and records human rejection", () => {
    const registry = new CorrectionRegistry();
    const proposal = registry.propose({
      evidence: { evidenceRef: "evidence:rejected-case" },
      correctedExpectedResult: { kind: "text", value: "Do not send the message." },
    });

    const rejected = registry.reject(proposal.correctionId, "reviewer-9", "Expected result is incomplete.");
    expect(rejected).toMatchObject({ status: "REJECTED", reviewedBy: "reviewer-9" });
    expect(() => registry.approve(proposal.correctionId, "reviewer-9")).toThrow(/already rejected/);
  });

  it("refuses raw evidence and secret-like expected results", () => {
    const registry = new CorrectionRegistry();
    expect(() => registry.propose({
      evidence: { evidenceRef: "full raw transcript goes here" },
      correctedExpectedResult: { kind: "text", value: "Safe" },
    })).toThrow(/opaque identifier/);
    expect(() => registry.propose({
      evidence: { evidenceRef: "evidence:secret" },
      correctedExpectedResult: { kind: "text", value: "api_key=should-not-be-stored" },
    })).toThrow(/credentials or secrets/);
  });

  it("restores only opaque correction metadata after a durable workspace restart", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-corrections-"));
    const snapshotPath = path.join(directory, "workspace.json");
    try {
      const first = new CorrectionRegistry(new WorkspaceStore(snapshotPath));
      const proposal = first.propose({
        evidence: { evidenceRef: "evidence:quality-case-7", evidenceDigest: "b".repeat(64) },
        correctedExpectedResult: { kind: "json", value: { outcome: "ask_for_evidence" } },
      });
      first.approve(proposal.correctionId, "reviewer-7");

      const restored = new CorrectionRegistry(new WorkspaceStore(snapshotPath));
      expect(restored.list()).toEqual([
        expect.objectContaining({
          correctionId: proposal.correctionId,
          status: "APPROVED",
          evidence: { evidenceRef: "evidence:quality-case-7", evidenceDigest: "b".repeat(64) },
          reviewedBy: "reviewer-7",
        }),
      ]);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
