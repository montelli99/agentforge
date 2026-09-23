/**
 * Completion Contract
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Defines and evaluates: WHAT MUST BE TRUE BEFORE AGENTFORGE MAY DECLARE DONE.
 * (Separate from ExecutionContract which governs WHAT AGENT MAY DO).
 */

import type {
  CompletionContract,
  EvidenceLevel,
  SimulationType,
  TodoClassification,
} from "../types/completion.js";
import { EVIDENCE_LEVEL_RANK } from "../types/completion.js";

export interface CompletionEvaluationContext {
  requirementsImplemented: string[];
  testsPassed: boolean;
  testPassRate: number;
  buildPassed: boolean;
  typecheckPassed: boolean;
  browserSmokePassed?: boolean;
  integrationTestsPassed?: boolean;
  providerTestsPassed?: boolean;
  secretScanPassed: boolean;
  piiScanPassed: boolean;
  documentationPresent: boolean;
  rollbackPlanPresent: boolean;
  adversarialAuditPassed: boolean;
  unresolvedTodoClassifications: TodoClassification[];
  evidenceLevel: EvidenceLevel;
  simulationDisclosures: SimulationType[];
}

export interface ContractEvaluationResult {
  passed: boolean;
  deficits: string[];
  evaluatedAt: string;
}

export class CompletionContractEnforcer {
  /**
   * Creates a default standard completion contract for substantial tasks
   */
  static createDefaultContract(taskId: string, requirementIds: string[]): CompletionContract {
    return {
      id: `compl-contract-${taskId}`,
      taskId,
      requiredRequirements: [...requirementIds],
      minEvidenceLevel: "L3_INTEGRATION_TESTED",
      requiredSimulationDisclosures: ["MOCK", "SIMULATED"],
      requireBuildPass: true,
      requireTypecheckPass: true,
      requireTestsPass: true,
      requireBrowserSmoke: false,
      requireIntegrationTests: true,
      requireProviderTest: false,
      requireSecretScan: true,
      requirePiiScan: true,
      requireDocumentation: true,
      requireRollbackPlan: true,
      requireAdversarialAuditPass: true,
      allowedUnresolvedTodos: ["EXPECTED_FUTURE", "NON_BLOCKING"],
    };
  }

  /**
   * Evaluates whether a completion contract is satisfied
   */
  evaluate(contract: CompletionContract, ctx: CompletionEvaluationContext): ContractEvaluationResult {
    const deficits: string[] = [];

    // 1. Requirements completeness
    for (const reqId of contract.requiredRequirements) {
      if (!ctx.requirementsImplemented.includes(reqId)) {
        deficits.push(`Requirement ${reqId} is not verified as implemented.`);
      }
    }

    // 2. Automated tests & compilation
    if (contract.requireTestsPass && (!ctx.testsPassed || ctx.testPassRate < 100)) {
      deficits.push(`Automated tests not 100% passing (current: ${ctx.testPassRate}%).`);
    }
    if (contract.requireBuildPass && !ctx.buildPassed) {
      deficits.push("Build/compilation check failed.");
    }
    if (contract.requireTypecheckPass && !ctx.typecheckPassed) {
      deficits.push("Typecheck / lint verification failed.");
    }
    if (contract.requireIntegrationTests && !ctx.integrationTestsPassed) {
      deficits.push("Integration test suites failed or were not executed.");
    }
    if (contract.requireBrowserSmoke && !ctx.browserSmokePassed) {
      deficits.push("Required real-browser smoke check failed or was not executed.");
    }
    if (contract.requireProviderTest && !ctx.providerTestsPassed) {
      deficits.push("Required provider integration test failed or was not executed.");
    }

    // 3. Security & Safety
    if (contract.requireSecretScan && !ctx.secretScanPassed) {
      deficits.push("Secret scan failed: possible credential leak detected.");
    }
    if (contract.requirePiiScan && !ctx.piiScanPassed) {
      deficits.push("PII scan failed: unredacted personal identifiers detected.");
    }

    // 4. Documentation & Rollback
    if (contract.requireDocumentation && !ctx.documentationPresent) {
      deficits.push("Documentation requirement not satisfied.");
    }
    if (contract.requireRollbackPlan && !ctx.rollbackPlanPresent) {
      deficits.push("Rollback plan or reversible worktree procedure missing.");
    }

    // 5. Evidence Level Rank
    const currentRank = EVIDENCE_LEVEL_RANK[ctx.evidenceLevel] ?? 0;
    const requiredRank = EVIDENCE_LEVEL_RANK[contract.minEvidenceLevel] ?? 0;
    if (currentRank < requiredRank) {
      deficits.push(
        `Evidence level ${ctx.evidenceLevel} is below required minimum ${contract.minEvidenceLevel}.`
      );
    }

    // 6. Adversarial Audit
    if (contract.requireAdversarialAuditPass && !ctx.adversarialAuditPassed) {
      deficits.push("Independent adversarial completion audit failed or has open blocker findings.");
    }

    // 7. TODO / Placeholder audit classification
    for (const cls of ctx.unresolvedTodoClassifications) {
      if (!contract.allowedUnresolvedTodos.includes(cls)) {
        deficits.push(`Unresolved code placeholder with disallowed classification: ${cls}`);
      }
    }

    return {
      passed: deficits.length === 0,
      deficits,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
