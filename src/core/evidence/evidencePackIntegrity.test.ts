import { describe, expect, it } from "vitest";
import { evidencePackIntegrityHash, sealEvidencePack, verifyEvidencePackIntegrity } from "./evidencePackIntegrity.js";
import type { EvidencePack } from "../types/evidence.js";

function pack(): EvidencePack {
  return {
    id: "ev-test", taskId: "task-test", agentId: "agent-test", objective: "verify", contractId: "contract-test",
    baseSha: "base", filesChanged: [], diffStat: { filesCount: 0, insertions: 0, deletions: 0 },
    commandsExecuted: [], testResults: [], artifacts: [], generatedAt: "2026-09-29T00:00:00.000Z", verifiedPassed: true,
  };
}

describe("evidence pack integrity", () => {
  it("seals and verifies a canonical pack", () => {
    const sealed = sealEvidencePack(pack());
    expect(sealed.integrityHash).toBe(evidencePackIntegrityHash(sealed));
    expect(verifyEvidencePackIntegrity(sealed)).toBe(true);
  });

  it("rejects changed evidence and missing digests", () => {
    const sealed = sealEvidencePack(pack());
    expect(verifyEvidencePackIntegrity({ ...sealed, objective: "changed" })).toBe(false);
    expect(verifyEvidencePackIntegrity(pack())).toBe(false);
  });
});
