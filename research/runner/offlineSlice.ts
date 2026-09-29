import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BenchmarkRunner } from "../../src/providers/benchmark/benchmarkRunner.js";
import type { BenchmarkSuite } from "../../src/core/types/benchmark.js";

/**
 * A mechanics-only benchmark. It deliberately uses no model, network, account,
 * or private data. Its output proves the runner/scorer wiring, not AgentForge
 * quality in production.
 */
const suite = JSON.parse(await readFile(resolve(import.meta.dirname, "../tasks/offline-intent-v1.json"), "utf8")) as BenchmarkSuite;

const runner = new BenchmarkRunner([suite]);
const result = await runner.runSuite(suite, "offline-fixture-executor", async (input) => ({
  output: { intent: String(input.expected) },
  latencyMs: 0,
}));

const negative = await runner.runSuite(suite, "offline-negative-control", async () => ({
  output: { intent: "intentionally-wrong" },
  latencyMs: 0,
}));

if (!result.passedOverall || result.passedCases !== result.totalCases) {
  throw new Error(`offline positive control failed: ${JSON.stringify(result)}`);
}
if (negative.passedOverall || negative.failedCases !== negative.totalCases) {
  throw new Error(`offline negative control was accepted: ${JSON.stringify(negative)}`);
}

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
