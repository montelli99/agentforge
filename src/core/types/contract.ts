/**
 * Execution Contract — Core AgentForge Differentiator
 * Enforces strict boundaries BELOW the model layer.
 * Model/harness/agent cannot bypass or override this contract.
 */

export interface ScopePolicy {
  allowedPaths: string[];      // e.g. ["modules/system1/**", "src/core/**"]
  protectedPaths: string[];    // e.g. ["modules/ppc-safety-validator.cjs", "package.json", ".env"]
  maxFilesChanged?: number;
  maxLinesChanged?: number;
}

export interface AuthorityGates {
  externalMessage: boolean;    // permission to send external messages (SMS, WhatsApp, emails)
  productionWrite: boolean;    // permission to write to production DB/endpoints
  deployment: boolean;         // permission to trigger production deployments
  forcePush: boolean;          // permission to git force-push (default: strictly false)
  deleteFiles: boolean;        // permission to permanently delete files
  networkOutbound: boolean;    // permission to make outbound internet calls
}

export type VerificationCheckType =
  | "unit_tests"
  | "regression_tests"
  | "diff_scope"
  | "lint"
  | "build"
  | "security_scan"
  | "custom_script";

export interface VerificationCheck {
  type: VerificationCheckType;
  command?: string;
  required: boolean;
  timeoutMs?: number;
}

export interface ExecutionContract {
  id: string;
  taskId: string;
  version: number;

  repository: {
    baseBranch: string;
    baseSha: string;
  };

  workspace: {
    requireIsolatedWorktree: boolean;
    worktreePath?: string;
  };

  scope: ScopePolicy;
  authority: AuthorityGates;
  requiredChecks: VerificationCheck[];
  completion: {
    requireEvidencePack: boolean;
    requireHumanApproval: boolean;
  };

  budget?: {
    maxSpendUsd?: number;
    maxDurationSeconds?: number;
  };

  createdAt: string;
}
