import crypto from "node:crypto";
import type { WorkspaceStore } from "../store/workspaceStore.js";

/**
 * A correction records a human's expected result without retaining the raw
 * conversation, customer record, prompt, or tool payload that produced it.
 * Evidence is deliberately represented by an opaque reference managed by the
 * evidence subsystem.
 */
export interface CorrectionEvidenceReference {
  /** Opaque evidence-pack or artifact identifier; never raw source content. */
  evidenceRef: string;
  /** Optional digest supplied by the evidence store for stable replay lookup. */
  evidenceDigest?: string;
}

export type CorrectionExpectedResult =
  | { kind: "text"; value: string }
  | { kind: "json"; value: Record<string, unknown> };

export type CorrectionStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface CorrectionProposal {
  correctionId: string;
  evidence: CorrectionEvidenceReference;
  correctedExpectedResult: CorrectionExpectedResult;
  rationale?: string;
  status: CorrectionStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface DeterministicCorrectionCase {
  caseId: string;
  sourceCorrectionId: string;
  evidence: CorrectionEvidenceReference;
  expectedResult: CorrectionExpectedResult;
  approvedAt: string;
  approvedBy: string;
  /** Stable checksum over the reference and expected result, for replay verification. */
  replayKey: string;
}

export type AutomaticMutationDecision = {
  allowed: false;
  reason: "HUMAN_APPROVAL_REQUIRED";
};

export class CorrectionRegistry {
  private readonly proposals = new Map<string, CorrectionProposal>();

  /**
   * Supplying the canonical store makes only the privacy-reviewed correction
   * metadata restart-safe. Evidence itself remains an opaque external reference.
   */
  constructor(private readonly store?: WorkspaceStore) {
    for (const proposal of store?.listQualityCorrections() || []) {
      this.proposals.set(proposal.correctionId, clone(proposal));
    }
  }

  propose(input: {
    evidence: CorrectionEvidenceReference;
    correctedExpectedResult: CorrectionExpectedResult;
    rationale?: string;
  }): CorrectionProposal {
    this.validateEvidence(input.evidence);
    this.validateExpectedResult(input.correctedExpectedResult);
    if (input.rationale && input.rationale.length > 2_000) {
      throw new Error("Correction rationale must be 2,000 characters or less.");
    }

    const proposal: CorrectionProposal = {
      correctionId: `correction-${crypto.randomUUID()}`,
      evidence: clone(input.evidence),
      correctedExpectedResult: clone(input.correctedExpectedResult),
      ...(input.rationale ? { rationale: input.rationale } : {}),
      status: "PENDING_APPROVAL",
      createdAt: new Date().toISOString(),
    };
    this.proposals.set(proposal.correctionId, proposal);
    this.persist();
    return clone(proposal);
  }

  get(correctionId: string): CorrectionProposal | undefined {
    const proposal = this.proposals.get(correctionId);
    return proposal ? clone(proposal) : undefined;
  }

  list(status?: CorrectionStatus): CorrectionProposal[] {
    return [...this.proposals.values()]
      .filter((proposal) => !status || proposal.status === status)
      .map(clone);
  }

  approve(correctionId: string, approvedBy: string): CorrectionProposal {
    const proposal = this.requirePending(correctionId);
    if (!approvedBy.trim()) throw new Error("An approving human identity is required.");
    proposal.status = "APPROVED";
    proposal.reviewedBy = approvedBy.trim();
    proposal.reviewedAt = new Date().toISOString();
    this.persist();
    return clone(proposal);
  }

  reject(correctionId: string, rejectedBy: string, reason: string): CorrectionProposal {
    const proposal = this.requirePending(correctionId);
    if (!rejectedBy.trim()) throw new Error("A reviewing human identity is required.");
    if (!reason.trim()) throw new Error("A rejection reason is required.");
    proposal.status = "REJECTED";
    proposal.reviewedBy = rejectedBy.trim();
    proposal.reviewedAt = new Date().toISOString();
    proposal.rejectionReason = reason.trim();
    this.persist();
    return clone(proposal);
  }

  /**
   * Corrections never alter memory, permissions, policy, or agent authority by
   * themselves. An integrator must use the approved replay case in a separate,
   * explicitly governed evaluation or deployment workflow.
   */
  rejectAutomaticMutation(): AutomaticMutationDecision {
    return { allowed: false, reason: "HUMAN_APPROVAL_REQUIRED" };
  }

  toDeterministicCase(correctionId: string): DeterministicCorrectionCase {
    const proposal = this.proposals.get(correctionId);
    if (!proposal) throw new Error(`Unknown correction: ${correctionId}`);
    if (proposal.status !== "APPROVED" || !proposal.reviewedBy || !proposal.reviewedAt) {
      throw new Error("Only a human-approved correction can become a deterministic replay case.");
    }
    const evidence = clone(proposal.evidence);
    const expectedResult = clone(proposal.correctedExpectedResult);
    const replayKey = digest({ evidence, expectedResult });
    return {
      caseId: `replay-${proposal.correctionId}`,
      sourceCorrectionId: proposal.correctionId,
      evidence,
      expectedResult,
      approvedAt: proposal.reviewedAt,
      approvedBy: proposal.reviewedBy,
      replayKey,
    };
  }

  private requirePending(correctionId: string): CorrectionProposal {
    const proposal = this.proposals.get(correctionId);
    if (!proposal) throw new Error(`Unknown correction: ${correctionId}`);
    if (proposal.status !== "PENDING_APPROVAL") {
      throw new Error(`Correction ${correctionId} is already ${proposal.status.toLowerCase()}.`);
    }
    return proposal;
  }

  private persist(): void {
    this.store?.setQualityCorrections(this.list());
  }

  private validateEvidence(evidence: CorrectionEvidenceReference): void {
    if (!evidence.evidenceRef || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/.test(evidence.evidenceRef)) {
      throw new Error("Evidence reference must be an opaque identifier, not raw source content.");
    }
    if (evidence.evidenceDigest && !/^[A-Fa-f0-9]{32,128}$/.test(evidence.evidenceDigest)) {
      throw new Error("Evidence digest must be a hexadecimal checksum.");
    }
  }

  private validateExpectedResult(expected: CorrectionExpectedResult): void {
    const serialized = JSON.stringify(expected);
    if (serialized.length > 10_000) throw new Error("Corrected expected result is too large.");
    if (/\b(?:authorization:\s*bearer|api[_ -]?key|password|secret)\b/i.test(serialized)) {
      throw new Error("Corrected expected result must not contain credentials or secrets.");
    }
  }
}

function digest(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
