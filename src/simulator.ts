import type { LabScenario } from "./scenarios.js";
import type { AgentForgeBridgeProfile } from "./bridge.js";
import type { LabReport, ScenarioOutcome, ScenarioResult } from "./types.js";
import type { OptimizationConfig } from "./optimization-types.js";
import { AgentForgeBroker } from "./router.js";

export async function runScenario(
  scenario: LabScenario,
  optimizationConfig?: Partial<OptimizationConfig>,
): Promise<ScenarioResult> {
  const broker = new AgentForgeBroker(
    undefined,
    undefined,
    { ...scenario.context.optimization, ...optimizationConfig },
  );
  const result = await broker.route(scenario.context);
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

export async function runLab(
  scenarios: LabScenario[],
  profile?: AgentForgeBridgeProfile,
  optimizationConfig?: Partial<OptimizationConfig>,
): Promise<LabReport> {
  const results = await Promise.all(scenarios.map((scenario) =>
    runScenario(scenario, optimizationConfig),
  ));
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
