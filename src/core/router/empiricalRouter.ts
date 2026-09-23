/**
 * Empirical Model & Harness Router
 * Section 5: Model Strategy (Tier 0 to Tier 4)
 * Section 31: Model Selector (Preserve Pluggability)
 * Section 32: Harness Benchmarking
 * Section 33 & 34: Empirical Router Reality & Honest Cost Accounting
 * Section 48 & 49: Benchmark Domain & Empirical Routing
 * 
 * "Use the cheapest demonstrated-capable model/harness combination for each task."
 * Accurately distinguishes API_COST vs COMPUTE_COST_ESTIMATE vs POWER_COST_ESTIMATE vs ZERO_LOCAL.
 * Distinguishes MEASURED vs CONFIGURED vs ESTIMATED vs UNKNOWN benchmark quality.
 */

import type { BenchmarkResult } from "../types/benchmark.js";

export type CostType =
  | "API_COST"
  | "COMPUTE_COST_ESTIMATE"
  | "POWER_COST_ESTIMATE"
  | "ZERO_LOCAL"
  | "UNKNOWN";

export type QualityMeasurementStatus =
  | "MEASURED"
  | "CONFIGURED"
  | "ESTIMATED"
  | "UNKNOWN";

export interface TaskRequirements {
  taskType: "code_generation" | "bug_fix" | "refactor" | "sop_compilation" | "general_qa" | "voice_agent";
  risk: "low" | "medium" | "high" | "critical";
  complexityScore: number; // 1 to 10
  contextTokens: number;
  structuredOutputRequired?: boolean;
  toolUseRequired?: boolean;
  maxLatencyMs?: number;
  generativeModelRequired?: boolean;
}

export interface CandidateTarget {
  id: string;
  targetType: "MODEL" | "HARNESS";
  name: string;
  provider: string;
  tier: 0 | 1 | 2 | 3 | 4;
  capabilities: {
    structuredOutput: boolean;
    toolCalling: boolean;
    maxContextTokens: number;
  };
  costType: CostType;
  costPer1kTokensUsd: number;
}

export interface EmpiricalRoutingDecision {
  taskId?: string;
  selectedTargetId: string;
  selectedTier: number;
  estimatedCostUsd: number;
  costType: CostType;
  qualityStatus: QualityMeasurementStatus;
  measuredPassRate: number;
  decisionRule: string;
  rationale: string;
  fallbackTargetIds: string[];
}

export class EmpiricalRouter {
  private candidates: Map<string, CandidateTarget> = new Map();
  private benchmarkHistory: BenchmarkResult[] = [];

  constructor() {
    this.seedDefaultCandidates();
  }

  private seedDefaultCandidates(): void {
    const defaults: CandidateTarget[] = [
      {
        id: "target-tier0-policy",
        targetType: "MODEL",
        name: "deterministic-engine",
        provider: "internal",
        tier: 0,
        capabilities: { structuredOutput: true, toolCalling: false, maxContextTokens: 4096 },
        costType: "ZERO_LOCAL",
        costPer1kTokensUsd: 0.0,
      },
      {
        id: "target-tier1-jev",
        targetType: "MODEL",
        name: "jev-system1-classifier",
        provider: "local",
        tier: 1,
        capabilities: { structuredOutput: true, toolCalling: false, maxContextTokens: 2048 },
        costType: "POWER_COST_ESTIMATE",
        costPer1kTokensUsd: 0.0001,
      },
      {
        id: "target-tier2-llama3-8b",
        targetType: "MODEL",
        name: "llama3.1:8b",
        provider: "ollama",
        tier: 2,
        capabilities: { structuredOutput: true, toolCalling: true, maxContextTokens: 32768 },
        costType: "POWER_COST_ESTIMATE", // Local inference has $0 API cost, only power estimate
        costPer1kTokensUsd: 0.0005,
      },
      {
        id: "target-tier3-deepseek-coder",
        targetType: "MODEL",
        name: "deepseek-coder:33b",
        provider: "ollama",
        tier: 3,
        capabilities: { structuredOutput: true, toolCalling: true, maxContextTokens: 65536 },
        costType: "POWER_COST_ESTIMATE",
        costPer1kTokensUsd: 0.002,
      },
      {
        id: "target-tier4-gpt4o",
        targetType: "MODEL",
        name: "gpt-4o",
        provider: "openai",
        tier: 4,
        capabilities: { structuredOutput: true, toolCalling: true, maxContextTokens: 128000 },
        costType: "API_COST", // Cloud API token billing
        costPer1kTokensUsd: 0.015,
      },
    ];

    for (const c of defaults) {
      this.candidates.set(c.id, c);
    }
  }

  registerCandidate(candidate: CandidateTarget): void {
    this.candidates.set(candidate.id, candidate);
  }

  recordBenchmarkResult(result: BenchmarkResult): void {
    this.benchmarkHistory.push(result);
  }

  /**
   * Route a task using empirical benchmark evidence:
   * 1. Determine minimum acceptable quality threshold by risk tier.
   * 2. Filter candidates supporting required capabilities.
   * 3. Score against measured benchmarks (distinguishing MEASURED vs CONFIGURED).
   * 4. Conservative routing for high/critical risk if benchmarks are unmeasured.
   * 5. Select lowest-cost candidate demonstrating pass rate >= threshold.
   */
  route(requirements: TaskRequirements, taskId?: string): EmpiricalRoutingDecision {
    // 1. Threshold by risk
    const minPassRate = requirements.risk === "critical" ? 0.95
      : requirements.risk === "high" ? 0.85
      : requirements.risk === "medium" ? 0.70
      : 0.50;

    // 2. Filter capable candidates
    const capable = Array.from(this.candidates.values()).filter(c => {
      if ((requirements.generativeModelRequired || ["general_qa", "code_generation", "bug_fix", "refactor"].includes(requirements.taskType)) && c.tier <= 1) {
        return false;
      }
      if (requirements.toolUseRequired && !c.capabilities.toolCalling) return false;
      if (requirements.structuredOutputRequired && !c.capabilities.structuredOutput) return false;
      if (requirements.contextTokens > c.capabilities.maxContextTokens) return false;
      return true;
    });

    // 3. Score against benchmark history
    const scored = capable.map(candidate => {
      const results = this.benchmarkHistory.filter(b =>
        (b.targetId === candidate.id || b.targetVersion === candidate.name) && b.totalCases > 0,
      );
      let measuredPassRate: number;
      let qualityStatus: QualityMeasurementStatus;

      if (results.length > 0) {
        const totalCases = results.reduce((total, result) => total + result.totalCases, 0);
        const passedCases = results.reduce((total, result) => total + result.passedCases, 0);
        measuredPassRate = totalCases > 0 ? passedCases / totalCases : 0;
        qualityStatus = "MEASURED";
      } else {
        // Configuration and reputation are not benchmark evidence. Never allow an
        // unmeasured candidate to pass a quality threshold on a fabricated score.
        measuredPassRate = 0;
        qualityStatus = "UNKNOWN";
      }

      return {
        candidate,
        measuredPassRate,
        qualityStatus,
      };
    });

    // Filter by threshold
    const passing = scored.filter(s => s.qualityStatus === "MEASURED" && s.measuredPassRate >= minPassRate);

    // Sort by cost ascending ("cheapest demonstrated-capable option")
    passing.sort((a, b) => a.candidate.costPer1kTokensUsd - b.candidate.costPer1kTokensUsd);

    const winner = passing[0] || [...scored].sort((a, b) => b.candidate.tier - a.candidate.tier)[0];
    if (!winner) {
      throw new Error("No registered candidate supports the requested task capabilities.");
    }
    const qualified = passing.includes(winner);
    const estimatedCost = (requirements.contextTokens / 1000) * winner.candidate.costPer1kTokensUsd;

    const fallbacks = capable
      .filter(c => c.id !== winner.candidate.id)
      .sort((a, b) => b.tier - a.tier)
      .map(c => c.id);

    return {
      taskId,
      selectedTargetId: winner.candidate.id,
      selectedTier: winner.candidate.tier,
      estimatedCostUsd: Number(estimatedCost.toFixed(6)),
      costType: winner.candidate.costType,
      qualityStatus: winner.qualityStatus,
      measuredPassRate: Number(winner.measuredPassRate.toFixed(3)),
      decisionRule: qualified ? `measured_pass_rate>=${minPassRate} & cost_minimized` : "no_measured_candidate_meets_threshold; highest_tier_fallback",
      rationale: qualified
        ? `Selected [${winner.candidate.name}] (Tier ${winner.candidate.tier}) with cost type [${winner.candidate.costType}] at $${winner.candidate.costPer1kTokensUsd}/1k. Measured benchmark quality: ${(winner.measuredPassRate * 100).toFixed(1)}% meets the ${(minPassRate * 100).toFixed(0)}% threshold.`
        : `No candidate has measured evidence meeting the ${(minPassRate * 100).toFixed(0)}% threshold. Selected highest-tier available target [${winner.candidate.name}] as an unqualified fallback; human review or benchmark evidence is required.`,
      fallbackTargetIds: fallbacks,
    };
  }
}
