type MeasuredCondition = {
  id: string;
  provider: string;
  model: string;
  version: string;
  route: string;
  syntheticOnly?: boolean;
  mock?: boolean;
};

type MeasuredRunConfig = {
  mode: "measured" | "dry-run";
  providerCallsAllowed: boolean;
  conditions: MeasuredCondition[];
  maxEstimatedUsd: number;
  stopOnUnknownBilling: boolean;
};

export function validateMeasuredRunConfig(config: MeasuredRunConfig): string[] {
  const failures: string[] = [];
  if (config.mode !== "measured") failures.push("measured mode must be explicit");
  if (config.providerCallsAllowed !== true) failures.push("measured mode must explicitly allow provider calls");
  if (!Number.isFinite(config.maxEstimatedUsd) || config.maxEstimatedUsd <= 0) failures.push("measured mode requires a positive owner-approved spend ceiling");
  if (config.stopOnUnknownBilling !== true) failures.push("measured mode must stop on unknown billing");
  if (!config.conditions.length) failures.push("measured mode requires at least one configured provider condition");
  for (const condition of config.conditions) {
    if (!condition.provider || !condition.model || !condition.version || !condition.route) failures.push(`condition ${condition.id || "unknown"} is missing provider/model/version/route identity`);
    if (condition.syntheticOnly === true) failures.push(`condition ${condition.id || "unknown"} is synthetic-only`);
    if (condition.mock === true || /mock|fixture|synthetic/i.test(condition.provider) || /mock|fixture|synthetic/i.test(condition.model)) failures.push(`condition ${condition.id || "unknown"} uses a mock or synthetic provider`);
  }
  return failures;
}

const valid: MeasuredRunConfig = {
  mode: "measured", providerCallsAllowed: true, maxEstimatedUsd: 10, stopOnUnknownBilling: true,
  conditions: [{ id: "AF", provider: "owner-selected", model: "owner-selected", version: "provider-reported", route: "owner-approved-route" }],
};
const invalid: MeasuredRunConfig = {
  mode: "measured", providerCallsAllowed: true, maxEstimatedUsd: 10, stopOnUnknownBilling: true,
  conditions: [{ id: "AF", provider: "mock", model: "fixture-model", version: "test", route: "local-fixture", mock: true }],
};
const validFailures = validateMeasuredRunConfig(valid);
const invalidFailures = validateMeasuredRunConfig(invalid);
if (validFailures.length || invalidFailures.length === 0) {
  console.error(JSON.stringify({ valid: false, validFailures, invalidFailures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  experimentId: "measured-run-guard-2026-09-29-v1",
  syntheticOnly: true,
  networkCalls: 0,
  providerCalls: 0,
  validConfigAccepted: true,
  mockConfigRejected: true,
  rejectionReasons: invalidFailures,
  interpretation: "Configuration guard only; no provider route was contacted and no spend was authorized.",
}, null, 2));
