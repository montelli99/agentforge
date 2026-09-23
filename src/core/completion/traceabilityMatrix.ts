/**
 * Traceability Matrix
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Maintains the complete unbroken chain:
 * OriginalGoal -> Requirement -> Task -> Code/Artifact -> Test -> Evidence -> Audit Result
 * 
 * Invariants:
 * - No orphan requirements (every requirement must have task, code, and test).
 * - No unclassified implementation (every code artifact must map to a requirement).
 */

import type { RequirementTraceabilityRecord } from "../types/completion.js";

export class TraceabilityMatrix {
  private records = new Map<string, RequirementTraceabilityRecord>(); // key: requirementId
  private artifactToRequirement = new Map<string, string>(); // key: artifactPath -> reqId

  registerRequirement(requirementId: string, goalId: string): void {
    if (!this.records.has(requirementId)) {
      this.records.set(requirementId, {
        requirementId,
        goalId,
        taskIds: [],
        codeArtifacts: [],
        testNames: [],
        evidencePackIds: [],
        auditResultStatus: "PENDING",
      });
    }
  }

  /** Restores persisted records only for requirements in this matrix. */
  restoreRecords(records: readonly RequirementTraceabilityRecord[]): void {
    if (records.length !== this.records.size) throw new Error("Persisted traceability record count does not match requirements");
    const restored = new Map<string, RequirementTraceabilityRecord>();
    for (const record of records) {
      if (!this.records.has(record.requirementId) || restored.has(record.requirementId) ||
          !Array.isArray(record.taskIds) || !Array.isArray(record.codeArtifacts) ||
          !Array.isArray(record.testNames) || !Array.isArray(record.evidencePackIds)) {
        throw new Error(`Persisted traceability record is invalid: ${record.requirementId}`);
      }
      restored.set(record.requirementId, structuredClone(record));
    }
    this.records = restored;
    this.artifactToRequirement.clear();
    for (const record of restored.values()) {
      for (const artifact of record.codeArtifacts) this.artifactToRequirement.set(artifact, record.requirementId);
    }
  }

  linkTask(requirementId: string, taskId: string): void {
    const record = this.records.get(requirementId);
    if (record && !record.taskIds.includes(taskId)) {
      record.taskIds.push(taskId);
    }
  }

  linkCodeArtifact(requirementId: string, artifactPath: string): void {
    const record = this.records.get(requirementId);
    if (record) {
      if (!record.codeArtifacts.includes(artifactPath)) {
        record.codeArtifacts.push(artifactPath);
      }
      this.artifactToRequirement.set(artifactPath, requirementId);
    }
  }

  linkTest(requirementId: string, testName: string): void {
    const record = this.records.get(requirementId);
    if (record && !record.testNames.includes(testName)) {
      record.testNames.push(testName);
    }
  }

  linkEvidence(requirementId: string, evidencePackId: string): void {
    const record = this.records.get(requirementId);
    if (record && !record.evidencePackIds.includes(evidencePackId)) {
      record.evidencePackIds.push(evidencePackId);
    }
  }

  updateAuditStatus(requirementId: string, status: "PENDING" | "PASSED" | "FAILED" | "REPAIRED", blocker?: string): void {
    const record = this.records.get(requirementId);
    if (record) {
      record.auditResultStatus = status;
      record.blockerReason = blocker;
    }
  }

  getRecord(requirementId: string): RequirementTraceabilityRecord | undefined {
    return this.records.get(requirementId);
  }

  listRecords(): RequirementTraceabilityRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Identifies orphan requirements (requirements with missing tasks, code, or tests)
   */
  findOrphanRequirements(): { requirementId: string; missing: string[] }[] {
    const orphans: { requirementId: string; missing: string[] }[] = [];

    for (const record of this.records.values()) {
      const missing: string[] = [];
      if (record.taskIds.length === 0) missing.push("task");
      if (record.codeArtifacts.length === 0) missing.push("code");
      if (record.testNames.length === 0) missing.push("test");

      if (missing.length > 0) {
        orphans.push({ requirementId: record.requirementId, missing });
      }
    }

    return orphans;
  }

  /**
   * Verifies that a code artifact is classified under a known requirement
   */
  isArtifactClassified(artifactPath: string): boolean {
    return this.artifactToRequirement.has(artifactPath);
  }
}
