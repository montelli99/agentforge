import type { AgentForgeModelChoice } from "./types.js";

export type BenchmarkResult = {
  model: AgentForgeModelChoice;
  promptType: string;
  latencyMs: number;
  success: boolean;
  qualityScore: number;
  costUsd: number;
  tokenCount: number;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type ModelPerformance = {
  model: AgentForgeModelChoice;
  promptType: string;
  totalAttempts: number;
  successfulAttempts: number;
  successRate: number;
  averageLatencyMs: number;
  averageQualityScore: number;
  averageCostUsd: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  lastUpdated: number;
};

export type ModelRecommendation = {
  model: AgentForgeModelChoice;
  score: number;
  reason: string;
  confidence: number;
};

export type PromptType = "code" | "analysis" | "creative" | "qa" | "translation" | "general";

export function classifyPrompt(prompt: string): PromptType {
  const lower = prompt.toLowerCase();

  if (lower.includes("code") || lower.includes("function") || lower.includes("implement") || lower.includes("debug")) {
    return "code";
  }
  if (lower.includes("analyze") || lower.includes("compare") || lower.includes("evaluate") || lower.includes("explain")) {
    return "analysis";
  }
  if (lower.includes("write") || lower.includes("create") || lower.includes("story") || lower.includes("poem")) {
    return "creative";
  }
  if (lower.includes("what") || lower.includes("how") || lower.includes("why") || lower.includes("when")) {
    return "qa";
  }
  if (lower.includes("translate") || lower.includes("localize") || lower.includes("convert")) {
    return "translation";
  }
  return "general";
}

export class ModelBenchmark {
  private results: Map<string, BenchmarkResult[]> = new Map();
  private maxResultsPerModel: number;

  constructor(maxResultsPerModel: number = 1000) {
    this.maxResultsPerModel = maxResultsPerModel;
  }

  private getModelKey(model: AgentForgeModelChoice, promptType: string): string {
    return `${model.provider}/${model.model}:${promptType}`;
  }

  record(result: BenchmarkResult): void {
    const key = this.getModelKey(result.model, result.promptType);
    const existing = this.results.get(key) || [];
    existing.push(result);

    if (existing.length > this.maxResultsPerModel) {
      existing.splice(0, existing.length - this.maxResultsPerModel);
    }

    this.results.set(key, existing);
  }

  getPerformance(model: AgentForgeModelChoice, promptType: string): ModelPerformance | null {
    const key = this.getModelKey(model, promptType);
    const results = this.results.get(key);

    if (!results || results.length === 0) return null;

    const successful = results.filter((r) => r.success);
    const successRate = successful.length / results.length;

    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const averageLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50Index = Math.floor(latencies.length * 0.5);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    const qualityScores = successful.map((r) => r.qualityScore);
    const averageQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;

    const costs = results.map((r) => r.costUsd);
    const averageCostUsd = costs.reduce((a, b) => a + b, 0) / costs.length;

    return {
      model,
      promptType,
      totalAttempts: results.length,
      successfulAttempts: successful.length,
      successRate,
      averageLatencyMs,
      averageQualityScore,
      averageCostUsd,
      p50LatencyMs: latencies[p50Index] || 0,
      p95LatencyMs: latencies[p95Index] || 0,
      p99LatencyMs: latencies[p99Index] || 0,
      lastUpdated: Math.max(...results.map((r) => r.timestamp)),
    };
  }

  getRecommendation(
    promptType: string,
    availableModels: AgentForgeModelChoice[],
    constraints: {
      maxCostUsd?: number;
      maxLatencyMs?: number;
      minQualityScore?: number;
    } = {},
  ): ModelRecommendation | null {
    const performances: Array<{
      model: AgentForgeModelChoice;
      performance: ModelPerformance;
    }> = [];

    for (const model of availableModels) {
      const performance = this.getPerformance(model, promptType);
      if (performance) {
        performances.push({ model, performance });
      }
    }

    if (performances.length === 0) return null;

    const scored = performances
      .filter(({ performance }) => {
        if (constraints.maxCostUsd && performance.averageCostUsd > constraints.maxCostUsd) {
          return false;
        }
        if (constraints.maxLatencyMs && performance.averageLatencyMs > constraints.maxLatencyMs) {
          return false;
        }
        if (constraints.minQualityScore && performance.averageQualityScore < constraints.minQualityScore) {
          return false;
        }
        return true;
      })
      .map(({ model, performance }) => {
        const score = this.calculateScore(performance);
        return {
          model,
          score,
          reason: this.generateReason(performance),
          confidence: Math.min(performance.totalAttempts / 100, 1),
        };
      });

    if (scored.length === 0) return null;

    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  private calculateScore(performance: ModelPerformance): number {
    const successWeight = 0.3;
    const latencyWeight = 0.25;
    const qualityWeight = 0.35;
    const costWeight = 0.1;

    const normalizedLatency = 1 - Math.min(performance.averageLatencyMs / 10000, 1);
    const normalizedCost = 1 - Math.min(performance.averageCostUsd / 0.1, 1);

    return (
      performance.successRate * successWeight +
      normalizedLatency * latencyWeight +
      performance.averageQualityScore * qualityWeight +
      normalizedCost * costWeight
    );
  }

  private generateReason(performance: ModelPerformance): string {
    const parts: string[] = [];

    if (performance.successRate > 0.95) {
      parts.push("high reliability");
    } else if (performance.successRate > 0.8) {
      parts.push("good reliability");
    } else {
      parts.push("moderate reliability");
    }

    if (performance.averageLatencyMs < 1000) {
      parts.push("fast response");
    } else if (performance.averageLatencyMs < 3000) {
      parts.push("moderate latency");
    } else {
      parts.push("slower response");
    }

    if (performance.averageQualityScore > 0.9) {
      parts.push("high quality");
    } else if (performance.averageQualityScore > 0.7) {
      parts.push("good quality");
    }

    return parts.join(", ");
  }

  getModelStats(): Array<{
    model: AgentForgeModelChoice;
    promptTypes: string[];
    totalAttempts: number;
    averageSuccessRate: number;
  }> {
    const modelMap = new Map<string, {
      model: AgentForgeModelChoice;
      promptTypes: Set<string>;
      totalAttempts: number;
      successfulAttempts: number;
    }>();

    for (const [key, results] of this.results) {
      const modelStr = key.split(":")[0];
      const promptType = key.split(":")[1];

      const existing = modelMap.get(modelStr) || {
        model: results[0]?.model || { provider: "unknown", model: "unknown" },
        promptTypes: new Set(),
        totalAttempts: 0,
        successfulAttempts: 0,
      };

      existing.promptTypes.add(promptType);
      existing.totalAttempts += results.length;
      existing.successfulAttempts += results.filter((r) => r.success).length;

      modelMap.set(modelStr, existing);
    }

    return Array.from(modelMap.values()).map((stats) => ({
      model: stats.model,
      promptTypes: Array.from(stats.promptTypes),
      totalAttempts: stats.totalAttempts,
      averageSuccessRate: stats.totalAttempts > 0
        ? stats.successfulAttempts / stats.totalAttempts
        : 0,
    }));
  }

  clear(): void {
    this.results.clear();
  }

  getResultCount(): number {
    let count = 0;
    for (const results of this.results.values()) {
      count += results.length;
    }
    return count;
  }
}

let globalBenchmark: ModelBenchmark | null = null;

export function getModelBenchmark(): ModelBenchmark {
  if (!globalBenchmark) {
    globalBenchmark = new ModelBenchmark();
  }
  return globalBenchmark;
}

export function resetModelBenchmark(): void {
  globalBenchmark = null;
}
