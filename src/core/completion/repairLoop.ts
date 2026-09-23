/**
 * Automatic Repair Loop
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * If an audit fails:
 * 1. DO NOT REPORT TO OWNER.
 * 2. Create repair tasks for each audit failure.
 * 3. Execute repairs autonomously.
 * 4. Rerun tests.
 * 5. Re-audit.
 * 6. Repeat until PASS or genuine external/owner blocker.
 * 
 * Includes bounded loop protection to prevent infinite repair cycles:
 * - Max attempts per defect (default: 3)
 * - Cycle / repeating failure pattern detection
 * - If failure repeats beyond threshold: isolate as blocker with evidence, continue unrelated work!
 */

import crypto from "node:crypto";
import type { CompletionAuditResult, RepairTask } from "../types/completion.js";

export interface RepairLoopResult {
  allResolved: boolean;
  iterationsRun: number;
  repairedTasks: RepairTask[];
  unresolvableBlockers: { defectId: string; reason: string; attempts: number }[];
  history: { iteration: number; defectsCount: number; passed: boolean }[];
}

export class AutomaticRepairLoop {
  constructor(
    private readonly maxAttemptsPerDefect = 3,
    private readonly maxTotalIterations = 5,
  ) {}

  /**
   * Generates repair tasks from audit failure reasons
   */
  createRepairTasks(auditResult: CompletionAuditResult): RepairTask[] {
    const tasks: RepairTask[] = [];

    // From reasons for failure
    auditResult.reasonsForFailure.forEach((reason, idx) => {
      tasks.push({
        id: `repair-${crypto.randomUUID().slice(0, 8)}`,
        defectId: `defect-audit-${idx}-${crypto.createHash("sha256").update(reason).digest("hex").slice(0, 8)}`,
        description: `Resolve audit failure: ${reason}`,
        suggestedFix: this.synthesizeSuggestedFix(reason),
        attemptCount: 0,
        maxAttempts: this.maxAttemptsPerDefect,
        status: "PENDING",
      });
    });

    // From unmet requirements
    auditResult.unmetRequirements.forEach(reqId => {
      tasks.push({
        id: `repair-${crypto.randomUUID().slice(0, 8)}`,
        defectId: `defect-unmet-${reqId}`,
        requirementId: reqId,
        description: `Implement missing requirement ${reqId}`,
        suggestedFix: `Add implementation module and corresponding automated test suite for ${reqId}`,
        attemptCount: 0,
        maxAttempts: this.maxAttemptsPerDefect,
        status: "PENDING",
      });
    });

    // From untested implementations
    auditResult.untestedImplementations.forEach(reqId => {
      tasks.push({
        id: `repair-${crypto.randomUUID().slice(0, 8)}`,
        defectId: `defect-untested-${reqId}`,
        requirementId: reqId,
        description: `Add test coverage for implemented requirement ${reqId}`,
        suggestedFix: `Author unit/integration tests asserting acceptance criteria for ${reqId}`,
        attemptCount: 0,
        maxAttempts: this.maxAttemptsPerDefect,
        status: "PENDING",
      });
    });

    return tasks;
  }

  /**
   * Orchestrates the repair loop across iterations
   */
  async runLoop(
    initialAudit: CompletionAuditResult,
    repairExecutor: (task: RepairTask) => Promise<boolean>,
    reAuditor: () => Promise<CompletionAuditResult>,
  ): Promise<RepairLoopResult> {
    let currentAudit = initialAudit;
    let iteration = 0;
    const history: { iteration: number; defectsCount: number; passed: boolean }[] = [];
    const defectAttempts = new Map<string, number>();
    const resolvedTasks: RepairTask[] = [];
    const unresolvableBlockers: { defectId: string; reason: string; attempts: number }[] = [];

    while (iteration < this.maxTotalIterations && !currentAudit.passed) {
      iteration++;
      const repairTasks = this.createRepairTasks(currentAudit);
      history.push({
        iteration,
        defectsCount: repairTasks.length,
        passed: currentAudit.passed,
      });

      let iterationRepairsAttempted = 0;

      for (const task of repairTasks) {
        const attempts = (defectAttempts.get(task.defectId) || 0) + 1;
        defectAttempts.set(task.defectId, attempts);
        task.attemptCount = attempts;

        // Bounded loop check
        if (attempts > this.maxAttemptsPerDefect) {
          task.status = "BLOCKED";
          unresolvableBlockers.push({
            defectId: task.defectId,
            reason: `Exceeded max repair attempts (${this.maxAttemptsPerDefect}) for: ${task.description}`,
            attempts,
          });
          continue;
        }

        task.status = "IN_PROGRESS";
        iterationRepairsAttempted++;

        try {
          const success = await repairExecutor(task);
          if (success) {
            task.status = "FIXED";
            resolvedTasks.push(task);
          } else {
            task.status = "PENDING";
          }
        } catch {
          task.status = "PENDING";
        }
      }

      // If no repairs could be attempted due to all being blocked, exit loop
      if (iterationRepairsAttempted === 0) {
        break;
      }

      // Re-audit
      currentAudit = await reAuditor();
      if (currentAudit.passed) {
        history.push({
          iteration: iteration + 1,
          defectsCount: 0,
          passed: true,
        });
        break;
      }
    }

    return {
      allResolved: currentAudit.passed,
      iterationsRun: iteration,
      repairedTasks: resolvedTasks,
      unresolvableBlockers,
      history,
    };
  }

  private synthesizeSuggestedFix(reason: string): string {
    if (reason.toLowerCase().includes("test")) {
      return "Execute failing test suite, diagnose error stack trace, and apply targeted bugfix.";
    }
    if (reason.toLowerCase().includes("secret") || reason.toLowerCase().includes("leak")) {
      return "Wrap credential references in IsolatedSecretStore and sanitize payload with [REDACTED_SECRET].";
    }
    if (reason.toLowerCase().includes("placeholder") || reason.toLowerCase().includes("stub")) {
      return "Complete placeholder implementation or reclassify as non-blocking test fixture.";
    }
    return "Refactor code module to satisfy contract verification requirements.";
  }
}
