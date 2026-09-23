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
      overview: `Autonomous requirements extraction for OriginalGoal [${goal.id}] submitted at ${goal.submittedAt}.`,
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
    return firstLine ? firstLine.slice(0, 80) : "System Execution Plan";
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

    // Parse clauses or bullet points from rawText
    const lines = text.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("=") || line.startsWith("#") || line.length < 5) continue;

      // Extract bullet points, numbered items, or capitalized directives
      const isBullet = line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line);
      const isDirective = /^[A-Z0-9 _-]{6,}:?$/.test(line) && !line.includes("===");

      if (isBullet || isDirective) {
        const cleanText = line.replace(/^[-*•\d.]+\s*/, "").replace(/:$/, "").trim();
        if (cleanText.length < 6) continue;

        const category: RequirementCategory =
          cleanText.toLowerCase().includes("test") ? "reliability"
          : cleanText.toLowerCase().includes("security") || cleanText.toLowerCase().includes("secret") ? "safety"
          : cleanText.toLowerCase().includes("doc") ? "documentation"
          : cleanText.toLowerCase().includes("migrat") ? "migration"
          : cleanText.toLowerCase().includes("perf") || cleanText.toLowerCase().includes("latency") ? "performance"
          : "functional";

        requirements.push({
          id: nextId(),
          goalId: goal.id,
          category,
          title: cleanText.slice(0, 75),
          description: cleanText,
          acceptanceCriteria: [
            `Component executes ${cleanText} according to specification`,
            "Verified by automated test suite with tamper-evident evidence",
          ],
          impliedDependencies: ["AF-REQ-001"],
          riskLevel: category === "safety" ? "critical" : "medium",
          testStrategy: `Unit and integration test coverage verifying ${cleanText}.`,
        });

        // Limit extracted requirements to avoid bloat from long text
        if (requirements.length >= 15) break;
      }
    }

    // Ensure at least core execution requirement if text was unstructured
    if (requirements.length === 1) {
      requirements.push({
        id: nextId(),
        goalId: goal.id,
        category: "functional",
        title: "Complete Core Goal Implementation",
        description: goal.rawText.slice(0, 300),
        acceptanceCriteria: [
          "Implementation passes all specification requirements",
          "All verification checks return 100% pass rate",
        ],
        impliedDependencies: ["AF-REQ-001"],
        riskLevel: "high",
        testStrategy: "Comprehensive end-to-end integration and verification suite.",
      });
    }

    return requirements;
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
