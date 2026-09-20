/**
 * Migration Center Domain Types & Canonical Lifecycle
 * Sections 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27
 */

export type MigrationSource =
  | "OPENCLAW_LEGACY"
  | "OPENCLAW_CURRENT"
  | "HERMES"
  | "GROK_BOT"
  | "GENERIC";

export type MigrationItemStatus =
  | "DIRECT"           // Direct 1:1 mapping into canonical AgentForge entity
  | "TRANSFORM"        // Translated/adapted structure (e.g. prompt shape, topic format)
  | "MANUAL_REVIEW"    // Requires owner inspection before import
  | "UNSUPPORTED"      // Cannot be represented safely; excluded
  | "SECRET_REQUIRED"  // Requires owner to reconnect credential in staging
  | "DANGEROUS";       // Privilege escalation or production write risk; blocked

export interface MigrationSecretRequirement {
  provider: string;
  keyName: string;
  description: string;
  requiredFor: string[];
  reconnectRequired: true; // NEVER migrate raw credentials
}

export interface MigrationItem {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  targetCategory: "agent" | "channel" | "tool" | "model_policy" | "memory" | "task" | "schedule" | "project" | "external_binding";
  targetName: string;
  status: MigrationItemStatus;
  transformDetails?: string;
  warning?: string;
  canonicalPayload?: Record<string, unknown>;
}

export interface MigrationConflict {
  itemId: string;
  description: string;
  resolutionStrategy: "skip" | "rename" | "overwrite" | "manual";
  chosenResolution?: string;
}

export interface MigrationInspection {
  source: MigrationSource;
  sourceVersion?: string;
  inspectedAt: string;
  discovered: {
    agentsCount: number;
    channelsCount: number;
    toolsCount: number;
    modelsCount: number;
    tasksCount: number;
    schedulesCount: number;
    projectsCount: number;
  };
  secretRequirements: MigrationSecretRequirement[];
  rawMetadata: Record<string, unknown>;
}

export interface MigrationPlan {
  id: string;
  source: MigrationSource;
  createdAt: string;
  items: MigrationItem[];
  conflicts: MigrationConflict[];
  secretRequirements: MigrationSecretRequirement[];
  summary: {
    direct: number;
    transform: number;
    manualReview: number;
    unsupported: number;
    secretRequired: number;
    dangerous: number;
  };
  readinessScore: number; // 0 to 100%
}

export interface MigrationDryRun {
  planId: string;
  executedAt: string;
  simulatedImportsCount: number;
  simulatedErrorsCount: number;
  validationWarnings: string[];
  wouldMutateProduction: false; // Strictly guaranteed false
  wouldConnectExternalChannels: false; // Strictly guaranteed false
  dryRunPassed: boolean;
}

export interface MigrationVerification {
  migrationRunId: string;
  verifiedAt: string;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  overallPassed: boolean;
  privilegeExpansionDetected: false; // Security invariant
}

export interface MigrationComparison {
  source: MigrationSource;
  eventScenario: string;
  sourceExpectedBehavior: {
    route: string;
    agent: string;
    tier: number;
    safetyCheck: boolean;
  };
  agentforgePredictedBehavior: {
    route: string;
    agent: string;
    tier: number;
    safetyCheck: boolean;
  };
  conforms: boolean;
  criticalDifferences: string[];
}

export interface MigrationCutoverPlan {
  planId: string;
  strategy: "shadow_validate_then_cutover";
  steps: Array<{
    stepNumber: number;
    name: string;
    action: string;
    requiresOwnerApproval: boolean;
    isExecuted: boolean;
  }>;
  rollbackPlanId: string;
  status: "DRAFT_ONLY_NO_LIVE_EXECUTION";
}

export interface MigrationRollbackPlan {
  planId: string;
  cutoverPlanId: string;
  steps: Array<{
    stepNumber: number;
    name: string;
    restoreAction: string;
  }>;
  preservesSourceData: true;
  destructiveOperations: false;
}

export interface MigrationArtifact {
  id: string;
  planId: string;
  createdAt: string;
  exportedManifest: Record<string, unknown>;
  sanitized: true; // Verified zero PII and zero secrets
}
