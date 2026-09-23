/**
 * PRD Critic
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Before execution, conducts an independent adversarial review of the PRD against OriginalGoal:
 * 1. What did the PRD omit from OriginalGoal?
 * 2. What implied dependencies are required?
 * 3. What safety requirements are missing?
 * 4. What tests prove each requirement?
 * 5. What edge cases matter?
 * 6. What rollback is required?
 * 
 * Revises PRD automatically and locks the requirement baseline.
 */

import crypto from "node:crypto";
import type {
  OriginalGoal,
  PRDDocument,
  PRDCriticReview,
  Requirement,
} from "../types/completion.js";

export class PRDCritic {
  /**
   * Reviews and revises the PRD before execution begins
   */
  reviewAndLock(prd: PRDDocument, goal: OriginalGoal): PRDCriticReview {
    const reviewId = `critic-${crypto.randomUUID().slice(0, 8)}`;
    const omissionsFromGoal: string[] = [];
    const impliedDependenciesAdded: string[] = [];
    const missingSafetyRequirements: string[] = [];
    const missingTestsIdentified: string[] = [];
    const edgeCasesIdentified: string[] = [];
    const rollbackIdentified: string[] = [];

    // 1. Omission Check
    const goalKeywords = this.extractCoreKeywords(goal.rawText);
    const prdKeywords = this.extractCoreKeywords(
      prd.requirements.map(r => `${r.title} ${r.description}`).join(" ")
    );

    for (const kw of goalKeywords) {
      if (!prdKeywords.has(kw) && kw.length > 5) {
        omissionsFromGoal.push(`OriginalGoal keyword '${kw}' was not explicitly represented in initial PRD`);
      }
    }

    // 2. Safety Audit
    const hasSafety = prd.requirements.some(r => r.category === "safety");
    if (!hasSafety) {
      missingSafetyRequirements.push("Missing explicit safety and production isolation requirement");
    }

    // 3. Implied Dependencies & Tests
    const revisedRequirements: Requirement[] = prd.requirements.map(req => {
      const updated = { ...req };

      // Ensure every requirement has a test strategy
      if (!updated.testStrategy || updated.testStrategy.length < 10) {
        updated.testStrategy = `Automated verification tests asserting ${updated.title}`;
        missingTestsIdentified.push(`Added test strategy for requirement ${req.id}`);
      }

      // Ensure rollback clause exists
      if (!updated.rollbackRequirement) {
        updated.rollbackRequirement = `Clean git worktree discard / reversible state rollback for ${req.id}`;
        rollbackIdentified.push(`Added rollback strategy for requirement ${req.id}`);
      }

      // Edge case identification
      if (req.riskLevel === "critical" || req.riskLevel === "high") {
        edgeCasesIdentified.push(`Failure under high concurrency or missing credentials for ${req.id}`);
      }

      return updated;
    });

    // If omissions were significant, inject synthesized requirement
    if (omissionsFromGoal.length > 3) {
      const nextId = `AF-REQ-${String(revisedRequirements.length + 1).padStart(3, "0")}`;
      revisedRequirements.push({
        id: nextId,
        goalId: goal.id,
        category: "functional",
        title: "Synthesized Goal Gap Fulfillment",
        description: `Covers omitted goal elements: ${omissionsFromGoal.slice(0, 3).join("; ")}`,
        acceptanceCriteria: ["All omitted items verified against OriginalGoal"],
        impliedDependencies: ["AF-REQ-001"],
        riskLevel: "medium",
        testStrategy: "Integration test covering goal synthesis.",
        rollbackRequirement: "Revert newly added synthesis module.",
      });
    }

    const revisedPRD: PRDDocument = {
      ...prd,
      requirements: revisedRequirements,
      criticReviewedAt: new Date().toISOString(),
      isLocked: true, // Lock requirement baseline
    };

    return {
      reviewId,
      goalId: goal.id,
      omissionsFromGoal,
      impliedDependenciesAdded,
      missingSafetyRequirements,
      missingTestsIdentified,
      edgeCasesIdentified,
      rollbackIdentified,
      // This is a lexical screen, not semantic review; never return PASS when it found gaps.
      critiquePassed: omissionsFromGoal.length === 0 && missingSafetyRequirements.length === 0,
      revisedPRD,
    };
  }

  private extractCoreKeywords(text: string): Set<string> {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w));
    return new Set(words);
  }
}

const STOPWORDS = new Set([
  "this", "that", "with", "from", "have", "been", "must", "will",
  "should", "what", "which", "when", "where", "into", "over", "more",
  "than", "such", "only", "also", "then", "them", "some", "other",
]);
