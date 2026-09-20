import type { AgentForgeModelChoice } from "./types.js";

export type SpeculativeRequest = {
  prompt: string;
  model: AgentForgeModelChoice;
  timeout: number;
  priority: number;
};

export type SpeculativeResult = {
  request: SpeculativeRequest;
  response: unknown;
  latencyMs: number;
  success: boolean;
  error?: string;
};

export type RaceConfig = {
  strategy: "first-acceptable" | "cheapest-first" | "quality-first";
  maxConcurrency: number;
  timeout: number;
  qualityThreshold: number;
};

export type RaceResult = {
  winner: SpeculativeResult;
  losers: SpeculativeResult[];
  strategy: string;
  totalLatencyMs: number;
  savedLatencyMs: number;
};

export interface SpeculativeExecutor {
  execute(
    prompt: string,
    candidates: SpeculativeRequest[],
    config?: Partial<RaceConfig>,
  ): Promise<RaceResult>;
}

export class DefaultSpeculativeExecutor implements SpeculativeExecutor {
  private executeFn: (
    prompt: string,
    model: AgentForgeModelChoice,
  ) => Promise<{ response: unknown; success: boolean; error?: string }>;

  constructor(
    executeFn: (
      prompt: string,
      model: AgentForgeModelChoice,
    ) => Promise<{ response: unknown; success: boolean; error?: string }>,
  ) {
    this.executeFn = executeFn;
  }

  async execute(
    prompt: string,
    candidates: SpeculativeRequest[],
    config: Partial<RaceConfig> = {},
  ): Promise<RaceResult> {
    const {
      strategy = "first-acceptable",
      maxConcurrency = 3,
      timeout = 30000,
      qualityThreshold = 0.8,
    } = config;

    const startTime = Date.now();
    const sortedCandidates = this.sortCandidates(candidates, strategy);
    const limitedCandidates = sortedCandidates.slice(0, maxConcurrency);

    const results: SpeculativeResult[] = [];
    const abortControllers: AbortController[] = [];

    const executeWithTimeout = async (
      request: SpeculativeRequest,
    ): Promise<SpeculativeResult> => {
      const controller = new AbortController();
      abortControllers.push(controller);

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, request.timeout || timeout);

      try {
        const result = await this.executeFn(prompt, request.model);
        clearTimeout(timeoutId);

        return {
          request,
          response: result.response,
          latencyMs: Date.now() - startTime,
          success: result.success,
          error: result.error,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        return {
          request,
          response: null,
          latencyMs: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    };

    const promises = limitedCandidates.map((request) =>
      executeWithTimeout(request),
    );

    const allResults = await Promise.allSettled(promises);

    for (const result of allResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    const successfulResults = results.filter((r) => r.success);

    if (successfulResults.length === 0) {
      return {
        winner: results[0] || {
          request: limitedCandidates[0],
          response: null,
          latencyMs: Date.now() - startTime,
          success: false,
          error: "All requests failed",
        },
        losers: results.slice(1),
        strategy,
        totalLatencyMs: Date.now() - startTime,
        savedLatencyMs: 0,
      };
    }

    const winner = this.selectWinner(successfulResults, strategy);
    const losers = results.filter((r) => r !== winner);

    const maxLatency = Math.max(...results.map((r) => r.latencyMs));
    const savedLatencyMs = maxLatency - winner.latencyMs;

    return {
      winner,
      losers,
      strategy,
      totalLatencyMs: Date.now() - startTime,
      savedLatencyMs,
    };
  }

  private sortCandidates(
    candidates: SpeculativeRequest[],
    strategy: string,
  ): SpeculativeRequest[] {
    switch (strategy) {
      case "cheapest-first":
        return [...candidates].sort((a, b) => a.priority - b.priority);
      case "quality-first":
        return [...candidates].sort((a, b) => b.priority - a.priority);
      case "first-acceptable":
      default:
        return [...candidates].sort((a, b) => a.priority - b.priority);
    }
  }

  private selectWinner(
    results: SpeculativeResult[],
    strategy: string,
  ): SpeculativeResult {
    switch (strategy) {
      case "cheapest-first":
        return results.reduce((best, current) =>
          current.request.priority < best.request.priority ? current : best,
        );
      case "quality-first":
        return results.reduce((best, current) =>
          current.request.priority > best.request.priority ? current : best,
        );
      case "first-acceptable":
      default:
        return results.reduce((best, current) =>
          current.latencyMs < best.latencyMs ? current : best,
        );
    }
  }
}

export class AdaptiveSpeculativeExecutor implements SpeculativeExecutor {
  private performanceHistory: Map<string, {
    successRate: number;
    averageLatency: number;
    totalAttempts: number;
    successfulAttempts: number;
  }> = new Map();

  private executeFn: (
    prompt: string,
    model: AgentForgeModelChoice,
  ) => Promise<{ response: unknown; success: boolean; error?: string }>;

  constructor(
    executeFn: (
      prompt: string,
      model: AgentForgeModelChoice,
    ) => Promise<{ response: unknown; success: boolean; error?: string }>,
  ) {
    this.executeFn = executeFn;
  }

  async execute(
    prompt: string,
    candidates: SpeculativeRequest[],
    config: Partial<RaceConfig> = {},
  ): Promise<RaceResult> {
    const sortedCandidates = this.sortByPerformance(candidates);
    const executor = new DefaultSpeculativeExecutor(this.executeFn);
    const result = await executor.execute(prompt, sortedCandidates, config);

    this.updatePerformance(result);

    return result;
  }

  private sortByPerformance(
    candidates: SpeculativeRequest[],
  ): SpeculativeRequest[] {
    return [...candidates].sort((a, b) => {
      const perfA = this.performanceHistory.get(`${a.model.provider}/${a.model.model}`);
      const perfB = this.performanceHistory.get(`${b.model.provider}/${b.model.model}`);

      const scoreA = perfA
        ? perfA.successRate * 0.7 + (1 - perfA.averageLatency / 10000) * 0.3
        : 0.5;
      const scoreB = perfB
        ? perfB.successRate * 0.7 + (1 - perfB.averageLatency / 10000) * 0.3
        : 0.5;

      return scoreB - scoreA;
    });
  }

  private updatePerformance(result: RaceResult): void {
    const updateModel = (
      model: AgentForgeModelChoice,
      success: boolean,
      latencyMs: number,
    ) => {
      const key = `${model.provider}/${model.model}`;
      const existing = this.performanceHistory.get(key) || {
        successRate: 0,
        averageLatency: 0,
        totalAttempts: 0,
        successfulAttempts: 0,
      };

      existing.totalAttempts++;
      if (success) existing.successfulAttempts++;

      existing.successRate =
        existing.successfulAttempts / existing.totalAttempts;
      existing.averageLatency =
        (existing.averageLatency * (existing.totalAttempts - 1) + latencyMs) /
        existing.totalAttempts;

      this.performanceHistory.set(key, existing);
    };

    updateModel(
      result.winner.request.model,
      result.winner.success,
      result.winner.latencyMs,
    );

    for (const loser of result.losers) {
      updateModel(loser.request.model, loser.success, loser.latencyMs);
    }
  }

  getPerformanceStats(): Map<string, {
    successRate: number;
    averageLatency: number;
    totalAttempts: number;
  }> {
    return new Map(this.performanceHistory);
  }
}

let globalExecutor: SpeculativeExecutor | null = null;

export function getSpeculativeExecutor(
  executeFn: (
    prompt: string,
    model: AgentForgeModelChoice,
  ) => Promise<{ response: unknown; success: boolean; error?: string }>,
  adaptive: boolean = true,
): SpeculativeExecutor {
  if (!globalExecutor) {
    globalExecutor = adaptive
      ? new AdaptiveSpeculativeExecutor(executeFn)
      : new DefaultSpeculativeExecutor(executeFn);
  }
  return globalExecutor;
}

export function resetSpeculativeExecutor(): void {
  globalExecutor = null;
}
