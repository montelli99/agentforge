/**
 * Evidence Pack
 * Answers:
 * WHAT DID THE AGENT DO?
 * WHY?
 * WHAT CHANGED?
 * WHAT TESTED IT?
 * WHO APPROVED IT?
 * WHAT WAS DEPLOYED?
 */

export interface TestResultRecord {
  checkName: string;
  command: string;
  passed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface CommandAuditRecord {
  command: string;
  cwd: string;
  timestamp: string;
  exitCode: number;
  durationMs: number;
}

export interface FileDiffRecord {
  filePath: string;
  status: "added" | "modified" | "deleted" | "renamed";
  linesAdded: number;
  linesDeleted: number;
  patch?: string;
}

export interface ArtifactRecord {
  name: string;
  path: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
}

export interface EvidencePack {
  id: string;
  taskId: string;
  agentId: string;
  objective: string;
  contractId: string;

  baseSha: string;
  finalSha?: string;

  filesChanged: FileDiffRecord[];
  diffStat: {
    filesCount: number;
    insertions: number;
    deletions: number;
  };

  commandsExecuted: CommandAuditRecord[];
  testResults: TestResultRecord[];
  artifacts: ArtifactRecord[];

  /** Serialized governed-process result, when the task was process-bound. */
  processExecution?: {
    processId: string;
    status: "completed" | "waiting_for_approval" | "failed";
    executionMode: "validated_only";
    stepResults: Array<{ stepId: string; status: string; output?: string; error?: string }>;
  };

  approvalId?: string;
  approvedBy?: string;
  approvalSource?: "web" | "telegram" | "discord" | "slack" | "api";

  generatedAt: string;
  verifiedPassed: boolean;
}
