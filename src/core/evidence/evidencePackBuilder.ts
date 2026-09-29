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
import { sealEvidencePack } from "./evidencePackIntegrity.js";

export class EvidencePackBuilder {
  private filesChanged: FileDiffRecord[] = [];
  private commandsExecuted: CommandAuditRecord[] = [];
  private testResults: TestResultRecord[] = [];
  private artifacts: ArtifactRecord[] = [];

  constructor(
    private readonly taskId?: string,
    private readonly agentId?: string,
    private readonly objective?: string,
    private readonly contractId?: string,
    private readonly baseSha?: string,
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

  build(
    optionsOrFinalSha?: string | (Record<string, any> & {
      taskId?: string;
      objective?: string;
      baseSha?: string;
      finalSha?: string;
      filesChanged?: string[];
      diff?: string;
      commandsExecuted?: string[];
      testsRun?: { total: number; passed: number; failed: number };
      tokensConsumed?: { promptTokens: number; completionTokens: number; totalTokens: number };
      contractVerification?: { contractId: string; verified: boolean; violations: string[] };
    }),
    approvalInfo?: { approvalId: string; approvedBy: string; source: "web" | "telegram" | "discord" | "api" }
  ): any {
    if (typeof optionsOrFinalSha === "object" && optionsOrFinalSha !== null) {
      return sealEvidencePack({
        id: `evid-${crypto.randomUUID().slice(0, 8)}`,
        generatedAt: new Date().toISOString(),
        verifiedPassed: true,
        ...optionsOrFinalSha,
      } as unknown as EvidencePack);
    }

    const finalSha = optionsOrFinalSha as string | undefined;
    const allTestsPassed = this.testResults.length > 0 && this.testResults.every(t => t.passed);
    const insertions = this.filesChanged.reduce((sum, f) => sum + f.linesAdded, 0);
    const deletions = this.filesChanged.reduce((sum, f) => sum + f.linesDeleted, 0);

    return {
      id: `evid-${crypto.randomUUID().slice(0, 8)}`,
      taskId: this.taskId || "task-unknown",
      agentId: this.agentId || "agent-unknown",
      objective: this.objective || "task execution",
      contractId: this.contractId || "contract-unknown",
      baseSha: this.baseSha || "base-sha",
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
