/**
 * Evidence Pack Builder
 * Section 27: Evidence Pack
 * Compiles tamper-evident audit records answering:
 * WHAT DID THE AGENT DO? WHY? WHAT CHANGED? WHAT TESTED IT? WHO APPROVED IT?
 */

import crypto from "node:crypto";
import type {
  EvidencePack,
  FileDiffRecord,
  TestResultRecord,
  CommandAuditRecord,
  ArtifactRecord,
} from "../types/evidence.js";

export class EvidencePackBuilder {
  private filesChanged: FileDiffRecord[] = [];
  private commandsExecuted: CommandAuditRecord[] = [];
  private testResults: TestResultRecord[] = [];
  private artifacts: ArtifactRecord[] = [];

  constructor(
    private readonly taskId: string,
    private readonly agentId: string,
    private readonly objective: string,
    private readonly contractId: string,
    private readonly baseSha: string,
  ) {}

  recordFileChange(file: FileDiffRecord): this {
    this.filesChanged.push(file);
    return this;
  }

  recordCommand(cmd: CommandAuditRecord): this {
    this.commandsExecuted.push(cmd);
    return this;
  }

  recordTestResult(test: TestResultRecord): this {
    this.testResults.push(test);
    return this;
  }

  recordArtifact(artifact: ArtifactRecord): this {
    this.artifacts.push(artifact);
    return this;
  }

  build(finalSha?: string, approvalInfo?: { approvalId: string; approvedBy: string; source: "web" | "telegram" | "discord" | "api" }): EvidencePack {
    const allTestsPassed = this.testResults.length > 0 && this.testResults.every(t => t.passed);
    const insertions = this.filesChanged.reduce((sum, f) => sum + f.linesAdded, 0);
    const deletions = this.filesChanged.reduce((sum, f) => sum + f.linesDeleted, 0);

    return {
      id: `evid-${crypto.randomUUID().slice(0, 8)}`,
      taskId: this.taskId,
      agentId: this.agentId,
      objective: this.objective,
      contractId: this.contractId,
      baseSha: this.baseSha,
      finalSha,
      filesChanged: [...this.filesChanged],
      diffStat: {
        filesCount: this.filesChanged.length,
        insertions,
        deletions,
      },
      commandsExecuted: [...this.commandsExecuted],
      testResults: [...this.testResults],
      artifacts: [...this.artifacts],
      approvalId: approvalInfo?.approvalId,
      approvedBy: approvalInfo?.approvedBy,
      approvalSource: approvalInfo?.source,
      generatedAt: new Date().toISOString(),
      verifiedPassed: allTestsPassed,
    };
  }
}
