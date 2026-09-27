/**
 * PRD Engine
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Automatically generates a structured PRD from an immutable OriginalGoal:
 * - Extracts stable requirement IDs (AF-REQ-001, ...)
 * - Formulates explicit acceptance criteria
 * - Identifies implied dependencies and risks
 * - Synthesizes test strategy, verification, documentation, rollback, and release criteria
 */

import crypto from "node:crypto";
import type {
  OriginalGoal,
  PRDDocument,
  Requirement,
  RequirementCategory,
} from "../types/completion.js";

export class PRDEngine {
  /**
   * Generates a comprehensive PRD directly from OriginalGoal without asking the owner
   */
  generatePRD(goal: OriginalGoal): PRDDocument {
    const prdId = `prd-${crypto.randomUUID().slice(0, 8)}`;
    const requirements = this.extractRequirements(goal);
    const dependencies = this.identifyDependencies(requirements);
    const riskAnalysis = this.analyzeRisks(requirements);
    const testStrategy = this.formulateTestStrategy(requirements);
    const verificationRequirements = [
      "Full automated test suite execution with 100% pass rate",
      "Zero unclassified release blockers in codebase scan",
      "Independent adversarial completion audit pass",
      "Tamper-evident EvidencePack compiled with verification hash",
    ];
    const documentationRequirements = [
      "Architecture and design specification updated",
      "API endpoints documented with request/response schemas",
      "Operator verification and runbook instructions updated",
    ];
    const rollbackRequirements = [
      "Worktree discard / clean git reset without workspace pollution",
      "Database schema and state migration rollback capability",
      "Feature-flagged capability cutoff for provider fallbacks",
    ];
    const releaseCriteria = [
      "All requirements mapped to verified tests with >= min evidence level",
      "Zero regressions in baseline suites",
      "Audit disproof attempts completely satisfied",
    ];

    return {
      id: prdId,
      goalId: goal.id,
      title: `PRD: ${this.extractTitle(goal.rawText)}`,
      overview: `Source-preserving, intent-aware draft from the original request. Each nonempty source line is retained and deterministically enriched with observable acceptance, verification, risk, and rollback guidance; this is not a model-generated implementation plan. Original goal: ${goal.id}.`,
      requirements,
      dependencies,
      riskAnalysis,
      testStrategy,
      verificationRequirements,
      documentationRequirements,
      rollbackRequirements,
      releaseCriteria,
      generatedAt: new Date().toISOString(),
      isLocked: false,
    };
  }

  private extractTitle(rawText: string): string {
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
    const firstLine = lines.find(l => !l.startsWith("=") && !l.startsWith("-"));
    return firstLine ? (firstLine.length > 80 ? firstLine.slice(0, 77).trimEnd() + "…" : firstLine) : "System Execution Plan";
  }

  private extractRequirements(goal: OriginalGoal): Requirement[] {
    const text = goal.rawText;
    const requirements: Requirement[] = [];
    let counter = 1;

    // Helper to format ID
    const nextId = () => `AF-REQ-${String(counter++).padStart(3, "0")}`;

    // Always include safety and production isolation requirement
    requirements.push({
      id: nextId(),
      goalId: goal.id,
      category: "safety",
      title: "Absolute Staging & Production Isolation",
      description: "Ensure zero writes, modifications, or cutovers to live production systems or credentials.",
      acceptanceCriteria: [
        "No production config, databases, or queues modified",
        "Mocks and sandboxes used for external side effects",
        "Localhost (127.0.0.1) network boundary enforced",
      ],
      impliedDependencies: [],
      riskLevel: "critical",
      testStrategy: "Automated isolation guard tests, secret redacting tests, and mock provider assertions.",
      rollbackRequirement: "Immediate halt of all worker tasks if boundary probe indicates external network write.",
    });

    // Preserve every source line, including prose and headings. Never silently
    // discard the tail of a long request or replace it with a generic goal.
    for (const sourceLine of text.split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line || /^[=\-_]{3,}$/.test(line)) continue;
      const description = line.replace(/^(?:[-*•]\s+|\d+[.)]\s+|#{1,6}\s+)/, "").trim();
      if (!description) continue;
      const analysis = this.analyzeRequirement(description);
      requirements.push({
        id: nextId(), goalId: goal.id, category: analysis.category,
        title: description.length > 75 ? description.slice(0, 72).trimEnd() + "…" : description,
        description,
        acceptanceCriteria: analysis.acceptanceCriteria,
        impliedDependencies: ["AF-REQ-001"],
        riskLevel: analysis.riskLevel,
        testStrategy: analysis.testStrategy,
        rollbackRequirement: analysis.rollbackRequirement,
      });

      // Retain the owner's exact source line as the parent requirement, then
      // make multi-sentence requests actionable as separate, reviewable steps.
      // This is a bounded deterministic decomposition, not a claim that a
      // connected planning model has inferred hidden intent.
      const parentId = requirements.at(-1)!.id;
      for (const clause of this.extractCompoundClauses(description)) {
        const clauseAnalysis = this.analyzeRequirement(clause);
        requirements.push({
          id: nextId(),
          goalId: goal.id,
          category: clauseAnalysis.category,
          title: clause.length > 75 ? clause.slice(0, 72).trimEnd() + "…" : clause,
          description: clause,
          acceptanceCriteria: clauseAnalysis.acceptanceCriteria,
          impliedDependencies: ["AF-REQ-001", parentId],
          riskLevel: clauseAnalysis.riskLevel,
          testStrategy: clauseAnalysis.testStrategy,
          rollbackRequirement: clauseAnalysis.rollbackRequirement,
        });
      }
    }

    return requirements;
  }

  private extractCompoundClauses(description: string): string[] {
    // Sentence boundaries are intentionally conservative. Product names,
    // version numbers, URLs, and ordinary bullet wording remain intact.
    const clauses = description
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(clause => clause.replace(/[.!?]+$/, "").trim())
      .filter(clause => clause.length >= 12);
    if (clauses.length < 2) return [];
    return clauses.slice(0, 12);
  }

  /**
   * This is intentionally deterministic. It turns common owner intent into
   * observable checks without pretending a text parser has judged completion.
   */
  private analyzeRequirement(description: string): Pick<Requirement, "category" | "acceptanceCriteria" | "riskLevel" | "testStrategy" | "rollbackRequirement"> {
    const lower = description.toLowerCase();
    const category: RequirementCategory = /\b(security|secret|permission|credential|privacy|auth)\b/.test(lower) ? "safety"
      : /\b(test|verify|verification|audit|reliab)\b/.test(lower) ? "reliability"
      : /\b(documentation|document|readme|runbook)\b/.test(lower) ? "documentation"
      : /\b(migration|migrate|import|export)\b/.test(lower) ? "migration"
      : /\b(performance|latency|fast|slow|throughput)\b/.test(lower) ? "performance" : "functional";
    const isUi = /\b(ui|ux|dashboard|screen|view|visual|design|chat|mobile|responsive)\b/.test(lower);
    const isFix = /\b(fix|repair|bug|regression|broken)\b/.test(lower);
    const isIntegration = /\b(api|webhook|integration|connect|provider|telegram|discord|email)\b/.test(lower);
    const acceptanceCriteria = [
      isFix ? "A focused regression check reproduces the prior failure and passes after the change."
        : "The complete requested behavior is present in the relevant saved workflow.",
      isUi ? "Populated, empty, loading, error, disconnected, desktop, and narrow-screen states are checked against the visual acceptance matrix."
        : isIntegration ? "The integration boundary is tested with an explicit local or mock receipt; configuration is not described as a live connection."
        : "A focused automated check demonstrates the behavior or records the exact reason it cannot be run.",
      "The original source requirement remains traceable to code, test, and evidence; saved planning alone is not proof of completion.",
    ];
    return {
      category,
      acceptanceCriteria,
      riskLevel: category === "safety" ? "critical" : isIntegration || isFix ? "high" : "medium",
      testStrategy: isUi ? (isFix
        ? "Run a focused regression test, then UI/browser acceptance at desktop and narrow widths."
        : "Run focused UI/browser acceptance at desktop and narrow widths, plus the relevant API or storage test.")
        : isIntegration ? "Run a contract or adapter test with explicit disconnected and error-path coverage."
        : isFix ? "Add a focused regression test, then run the affected suite."
        : "Run a focused unit or integration test that directly demonstrates this requirement.",
      rollbackRequirement: isIntegration || category === "migration"
        ? "Disable the affected capability and preserve existing records without destructive migration."
        : "Revert the bounded change while retaining audit and evidence records for review.",
    };
  }

  private identifyDependencies(requirements: Requirement[]): string[] {
    const deps: string[] = [];
    for (const r of requirements) {
      deps.push(...r.impliedDependencies);
    }
    return Array.from(new Set(deps));
  }

  private analyzeRisks(requirements: Requirement[]): { risk: string; mitigation: string; severity: "low" | "medium" | "high" | "critical" }[] {
    return [
      {
        risk: "Production state contamination",
        mitigation: "Strict execution contract below model layer, mock external providers",
        severity: "critical",
      },
      {
        risk: "Unverified worker completion claims",
        mitigation: "Completion authority reserved exclusively for independent CompletionAuditor",
        severity: "high",
      },
      {
        risk: "Infinite repair loops on non-recoverable defects",
        mitigation: "Bounded repair loop protection with max attempts and cycle detection",
        severity: "medium",
      },
    ];
  }

  private formulateTestStrategy(requirements: Requirement[]): { unit: string[]; integration: string[]; e2e: string[]; security: string[] } {
    return {
      unit: ["Isolated unit tests for all domain models, parsers, and contracts"],
      integration: ["Multi-subsystem integration tests verifying state transitions and REST APIs"],
      e2e: ["End-to-end synthetic user workflows verifying entire feature lifecycle"],
      security: ["Production boundary probes, secret redacting tests, and TODO/placeholder scans"],
    };
  }
}
