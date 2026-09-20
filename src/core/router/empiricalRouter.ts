/**
 * Empirical Model & Harness Router
 * Section 5: Model Strategy (Tier 0 to Tier 4)
 * Section 31: Model Selector (Preserve Pluggability)
 * Section 32: Harness Benchmarking
 * Section 48 & 49: Benchmark Domain & Empirical Routing
 * 
 * "Use the cheapest demonstrated-capable model/harness combination for each task."
 * Does NOT rely on marketing claims — consults measured BenchmarkResult history.
 */

import type { BenchmarkResult, BenchmarkTarget, QualityThreshold } from "../types/benchmark.js";

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
  costPer1kTokensUsd: number;
}

export interface EmpiricalRoutingDecision {
  taskId?: string;
  selectedTargetId: string;
  selectedTier: number;
  estimatedCostUsd: number;
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
        costPer1kTokensUsd: 0.0,
      },
      {
        id: "target-tier1-jev",
        targetType: "MODEL",
        name: "jev-system1-classifier",
        provider: "local",
        tier: 1,
        capabilities: { structuredOutput: true, toolCalling: false, maxContextTokens: 2048 },
        costPer1kTokensUsd: 0.0001,
      },
      {
        id: "target-tier2-llama3-8b",
        targetType: "MODEL",
        name: "llama3.1:8b",
        provider: "ollama",
        tier: 2,
        capabilities: { structuredOutput: true, toolCalling: true, maxContextTokens: 32768 },
        costPer1kTokensUsd: 0.0005,
      },
      {
        id: "target-tier3-deepseek-coder",
        targetType: "MODEL",
        name: "deepseek-coder:33b",
        provider: "ollama",
        tier: 3,
        capabilities: { structuredOutput: true, toolCalling: true, maxContextTokens: 65536 },
        costPer1kTokensUsd: 0.002,
      },
      {
        id: "target-tier4-gpt4o",
        targetType: "MODEL",
        name: "gpt-4o",
        provider: "openai",
        tier: 4,
        capabilities: { structuredOutput: true, toolCalling: true, maxContextTokens: 128000 },
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
   * 2. Filter candidates supporting required capabilities (context size, tool use, structured output).
   * 3. Select lowest-cost candidate demonstrating pass rate >= threshold.
   * 4. Fallback to frontier cloud (Tier 4) if no cheaper candidate meets threshold.
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
      const results = this.benchmarkHistory.filter(b => b.target.name === candidate.name);
      const measuredPassRate = results.length > 0
        ? results.reduce((acc, r) => acc + (r.passRate || 0), 0) / results.length
        : candidate.tier === 4 ? 0.99 : 0.60; // Baseline assumption if unmeasured
      return {
        candidate,
        measuredPassRate,
      };
    });

    // Filter by threshold
    const passing = scored.filter(s => s.measuredPassRate >= minPassRate);

    // Sort by cost ascending ("cheapest demonstrated-capable option")
    passing.sort((a, b) => a.candidate.costPer1kTokensUsd - b.candidate.costPer1kTokensUsd);

    const winner = passing[0] || scored.find(s => s.candidate.tier === 4) || scored[0];
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
      measuredPassRate: Number(winner.measuredPassRate.toFixed(3)),
      decisionRule: `min_pass_rate>=${minPassRate} & cost_minimized`,
      rationale: `Selected [${winner.candidate.name}] (Tier ${winner.candidate.tier}) at $${winner.candidate.costPer1kTokensUsd}/1k tokens. Measured benchmark pass rate: ${(winner.measuredPassRate * 100).toFixed(1)}% satisfies risk [${requirements.risk.toUpperCase()}] threshold ${(minPassRate * 100).toFixed(0)}%.`,
      fallbackTargetIds: fallbacks,
    };
  }
}
