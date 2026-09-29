import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BenchmarkRunner } from "../../src/providers/benchmark/benchmarkRunner.js";
import type { BenchmarkSuite } from "../../src/core/types/benchmark.js";
import { TrajectoryLedger } from "./trajectoryLedger.js";

const suite: BenchmarkSuite = {
  id: "research-production-path-smoke-v1",
  name: "Production benchmark path mechanics",
  targetType: "MODEL",
  thresholds: [{ metricName: "pass_rate", comparison: "eq", targetValue: 100 }],
  cases: [
    { id: "case-a", name: "Synthetic greeting", description: "No evaluator answer in input", input: { caseId: "case-a", task: "Classify this synthetic greeting" }, expectedOutput: { intent: "greeting" }, timeoutMs: 1000, tags: ["synthetic"] },
    { id: "case-b", name: "Synthetic bug report", description: "No evaluator answer in input", input: { caseId: "case-b", task: "Classify this synthetic defect report" }, expectedOutput: { intent: "bug_report" }, timeoutMs: 1000, tags: ["synthetic"] },
    { id: "case-c", name: "Evaluator isolation control", description: "Input contains a deliberately wrong evaluator answer; the scorer-side answer must win", input: { caseId: "case-c", task: "Classify this synthetic handoff" , evaluatorAnswer: "wrong" }, expectedOutput: { intent: "handoff" }, timeoutMs: 1000, tags: ["synthetic", "negative-control"] },
  ],
};

const evaluatorAnswers = new Map([["case-a", "greeting"], ["case-b", "bug_report"], ["case-c", "handoff"]]);
const checkpoint = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "agentforge-production-path-")), "run.json");
const ledger = new TrajectoryLedger(checkpoint, 0.01);
await ledger.start("production-path-smoke-1", 0);
const runner = new BenchmarkRunner([suite]);
const result = await runner.runSuite(suite, "agentforge-production-path-smoke", async input => {
  const answer = evaluatorAnswers.get(String(input.caseId));
  if (!answer) throw new Error("evaluator answer unavailable for case");
  return { output: { intent: answer }, latencyMs: 0 };
});
if (!result.passedOverall) throw new Error(`production benchmark path smoke failed: ${JSON.stringify(result)}`);
await ledger.complete("production-path-smoke-1", { inputTokens: 0, outputTokens: 0, totalTokens: 0, currency: "USD", costSource: "synthetic-no-provider" }, 0);

console.log(JSON.stringify({
  experimentId: "production-path-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  providerCalls: 0,
  runner: "BenchmarkRunner",
  passedCases: result.passedCases,
  totalCases: result.totalCases,
  evaluatorAnswersOutsideInput: true,
  trajectoryCheckpointed: true,
  interpretation: "Production benchmark and ledger wiring only; no model or provider quality result.",
}, null, 2));
