/**
 * Completion Auditor
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Runs an independent adversarial completion audit that attempts to DISPROVE completion:
 * 1. What was forgotten from OriginalGoal?
 * 2. What claim lacks evidence?
 * 3. What test doesn't test the real path?
 * 4. What integration is actually a mock?
 * 5. What UI claim was only API-tested?
 * 6. What error path is missing?
 * 7. What requirement has no implementation?
 * 8. What implementation has no test?
 * 9. What documentation overstates readiness?
 * 10. Are there unclassified release blockers in codebase scan?
 */

import crypto from "node:crypto";
import type {
  AuditDisproofAttempt,
  CompletionAuditResult,
  EvidenceLevel,
  OriginalGoal,
  PRDDocument,
  Requirement,
  SimulationType,
  TodoScanFinding,
} from "../types/completion.js";
import { EVIDENCE_LEVEL_RANK } from "../types/completion.js";
import { TodoAuditor } from "./todoAuditor.js";

export interface AuditorContext {
  originalGoal: OriginalGoal;
  prd: PRDDocument;
  implementedRequirementIds: string[];
  testedRequirementIds: string[];
  codeArtifactPaths: string[];
  testFilePaths: string[];
  evidencePacks: { requirementId: string; claim: string; level: EvidenceLevel; simulationType: SimulationType }[];
  uiTestedRealBrowser?: boolean;
  errorPathsCovered?: boolean;
  documentationVerified?: boolean;
  workspaceDir?: string;
}

export class CompletionAuditor {
  private todoAuditor = new TodoAuditor();

  /**
   * Adversarially reviews the entire task execution to verify or disprove completion
   */
  async audit(ctx: AuditorContext): Promise<CompletionAuditResult> {
    const auditId = `audit-${crypto.randomUUID().slice(0, 8)}`;
    const disproofAttempts: AuditDisproofAttempt[] = [];
    const reasonsForFailure: string[] = [];
    const unmetRequirements: string[] = [];
    const untestedImplementations: string[] = [];
    const evidenceDeficits: {
      requirementId: string;
      claim: string;
      currentLevel: EvidenceLevel;
      requiredLevel: EvidenceLevel;
    }[] = [];

    // 1. What was forgotten from OriginalGoal?
    for (const req of ctx.prd.requirements) {
      if (!ctx.implementedRequirementIds.includes(req.id)) {
        unmetRequirements.push(req.id);
        reasonsForFailure.push(`Requirement [${req.id}] "${req.title}" has no verified implementation.`);
        disproofAttempts.push({
          inquiry: "What was forgotten?",
          finding: `Requirement ${req.id} omitted during execution`,
          severity: "BLOCKER",
          relatedRequirementId: req.id,
        });
      }
    }

    // 2. What requirement has implementation but no test?
    for (const reqId of ctx.implementedRequirementIds) {
      if (!ctx.testedRequirementIds.includes(reqId)) {
        untestedImplementations.push(reqId);
        reasonsForFailure.push(`Requirement [${reqId}] is implemented but lacks automated test verification.`);
        disproofAttempts.push({
          inquiry: "What implementation has no test?",
          finding: `Implementation of ${reqId} has no corresponding test suite verification`,
          severity: "BLOCKER",
          relatedRequirementId: reqId,
        });
      }
    }

    // 3. What claim lacks evidence? (Claim vs Evidence level)
    for (const pack of ctx.evidencePacks) {
      const rank = EVIDENCE_LEVEL_RANK[pack.level] ?? 0;
      // If a claim claims production readiness but only has unit or mock level:
      if (pack.claim.toLowerCase().includes("production") && rank < EVIDENCE_LEVEL_RANK.L6_SHADOW_VERIFIED) {
        evidenceDeficits.push({
          requirementId: pack.requirementId,
          claim: pack.claim,
          currentLevel: pack.level,
          requiredLevel: "L6_SHADOW_VERIFIED",
        });
        reasonsForFailure.push(
          `Claim "${pack.claim}" claims production readiness but only achieved ${pack.level}.`
        );
        disproofAttempts.push({
          inquiry: "What claim lacks evidence?",
          finding: `Claim "${pack.claim}" overstates verified evidence level (${pack.level})`,
          severity: "BLOCKER",
          relatedRequirementId: pack.requirementId,
        });
      }
    }

    // 4. Simulation Honesty Check: What integration is actually a mock?
    for (const pack of ctx.evidencePacks) {
      if (pack.simulationType === "MOCK" && pack.claim.toLowerCase().includes("real external live")) {
        reasonsForFailure.push(`Simulation honesty breach: Mock provider used but claimed live external: ${pack.claim}`);
        disproofAttempts.push({
          inquiry: "What integration is actually a mock?",
          finding: `Mock provider represented as real live integration for ${pack.requirementId}`,
          severity: "BLOCKER",
          relatedRequirementId: pack.requirementId,
        });
      }
    }

    // 5. What UI claim was only API-tested?
    const hasUIRequirement = ctx.prd.requirements.some(
      r => r.title.toLowerCase().includes("web") || r.title.toLowerCase().includes("ui") || r.title.toLowerCase().includes("view")
    );
    if (hasUIRequirement && ctx.uiTestedRealBrowser === false) {
      disproofAttempts.push({
        inquiry: "What UI claim was only API-tested?",
        finding: "UI views validated through DOM / REST contracts rather than full headless browser session",
        severity: "WARNING",
      });
    }

    // 6. What error path is missing?
    if (ctx.errorPathsCovered === false) {
      disproofAttempts.push({
        inquiry: "What error path is missing?",
        finding: "Adversarial error cases (offline daemon, invalid payloads) not fully exercised",
        severity: "WARNING",
      });
    }

    // 7. Codebase TODO / Placeholder scan
    let todoFindings: TodoScanFinding[] = [];
    if (ctx.workspaceDir) {
      todoFindings = this.todoAuditor.scanDirectory(ctx.workspaceDir);
      const blockers = todoFindings.filter(f => f.classification === "RELEASE_BLOCKER");
      if (blockers.length > 0) {
        reasonsForFailure.push(`Found ${blockers.length} unclassified release-blocking placeholders or stubs.`);
        for (const b of blockers) {
          disproofAttempts.push({
            inquiry: "Are there unclassified release blockers?",
            finding: `Release blocker in ${b.file}:${b.line} (${b.keyword}): ${b.snippet}`,
            severity: "BLOCKER",
          });
        }
      }
    }

    // 8. Documentation overstatement check
    if (ctx.documentationVerified === false) {
      disproofAttempts.push({
        inquiry: "What documentation overstates readiness?",
        finding: "Documentation status not fully synchronized with verified test evidence",
        severity: "WARNING",
      });
    }

    const passed = reasonsForFailure.length === 0;

    return {
      auditId,
      passed,
      disproofAttempts,
      todoFindings,
      unmetRequirements,
      untestedImplementations,
      evidenceDeficits,
      reasonsForFailure,
      auditedAt: new Date().toISOString(),
    };
  }
}
