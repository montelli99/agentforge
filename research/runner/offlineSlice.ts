import { BenchmarkRunner } from "../../src/providers/benchmark/benchmarkRunner.js";
import type { BenchmarkSuite } from "../../src/core/types/benchmark.js";

/**
 * A mechanics-only benchmark. It deliberately uses no model, network, account,
 * or private data. Its output proves the runner/scorer wiring, not AgentForge
 * quality in production.
 */
const suite: BenchmarkSuite = {
  id: "research-offline-intent-v1",
  name: "Research offline intent mechanics",
  targetType: "MODEL",
  thresholds: [{ metricName: "pass_rate", comparison: "eq", targetValue: 100 }],
  cases: [
    {
      id: "greeting",
      name: "Recognize greeting",
      description: "Synthetic routing fixture.",
      input: { text: "Hello from the synthetic fixture", expected: "greeting" },
      expectedOutput: { intent: "greeting" },
      timeoutMs: 1000,
      tags: ["offline", "negative-control-compatible"],
    },
    {
      id: "bug-report",
      name: "Recognize bug report",
      description: "Synthetic routing fixture.",
      input: { text: "TypeError in the synthetic fixture", expected: "bug_report" },
      expectedOutput: { intent: "bug_report" },
      timeoutMs: 1000,
      tags: ["offline"],
    },
  ],
};

const runner = new BenchmarkRunner([suite]);
const result = await runner.runSuite(suite, "offline-fixture-executor", async (input) => ({
  output: { intent: String(input.expected) },
  latencyMs: 0,
}));

const negative = await runner.runSuite(suite, "offline-negative-control", async () => ({
  output: { intent: "intentionally-wrong" },
  latencyMs: 0,
}));

const summary = {
  experimentId: "offline-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  providerCalls: 0,
  result: {
    suiteId: result.suiteId,
    totalCases: result.totalCases,
    passedCases: result.passedCases,
    failedCases: result.failedCases,
    passedOverall: result.passedOverall,
  },
  negativeControl: {
    totalCases: negative.totalCases,
    passedCases: negative.passedCases,
    failedCases: negative.failedCases,
    rejectedAsExpected: !negative.passedOverall,
  },
  interpretation: "Mechanics only; not evidence of model quality, token savings, cost, or production performance.",
};

console.log(JSON.stringify(summary, null, 2));
