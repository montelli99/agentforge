import type { LabScenario } from "./scenarios.js";
import type { AgentForgeBridgeProfile } from "./bridge.js";
import type { LabReport, ScenarioOutcome, ScenarioResult } from "./types.js";
import type { OptimizationConfig } from "./optimization-types.js";
import { AgentForgeBroker } from "./router.js";

export function runScenario(
  scenario: LabScenario,
  optimizationConfig?: Partial<OptimizationConfig>,
): ScenarioResult {
  const broker = new AgentForgeBroker(
    undefined,
    undefined,
    optimizationConfig,
  );
  const result = broker.route(scenario.context);
  const actual = result.outcome;
  return {
    id: scenario.id,
    name: scenario.name,
    expected: scenario.expected,
    actual,
    passed: actual === scenario.expected,
    notes: result.notes,
    optimization: result.optimization,
  };
}

export function runLab(
  scenarios: LabScenario[],
  profile?: AgentForgeBridgeProfile,
  optimizationConfig?: Partial<OptimizationConfig>,
): LabReport {
  const results = scenarios.map((scenario) =>
    runScenario(scenario, optimizationConfig),
  );
  const failed = results.filter((result) => !result.passed).length;
  return {
    generatedAt: new Date().toISOString(),
    passed: failed === 0,
    total: results.length,
    failed,
    profile,
    results,
  };
}
