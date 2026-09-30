/** Prevent a phrase-only case from being counted as a complete task trajectory. */
export type FullTrajectoryCase = {
  id: string;
  input: {
    task: string;
    setup?: Array<{ kind: string; payload: Record<string, unknown> }>;
    events?: Array<{ kind: string; payload: Record<string, unknown> }>;
  };
  expected: {
    requiredFact?: string;
    observableChecks?: Array<{ kind: string; target: string; expected: unknown }>;
    forbiddenEffects?: Array<{ kind: string; target: string }>;
  };
  limits?: { timeoutMs: number; maxAttempts: number };
};

export type ReadinessIssue = { caseId: string; field: string; reason: string };

export function fullTrajectoryReadiness(cases: FullTrajectoryCase[]): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  for (const item of cases) {
    const add = (field: string, reason: string) => issues.push({ caseId: item.id, field, reason });
    if (!item.input?.task?.trim()) add("input.task", "missing task instruction");
    if (!Array.isArray(item.input?.setup) || item.input.setup.length === 0) {
      add("input.setup", "no independently initialized starting state");
    }
    if (!Array.isArray(item.input?.events) || item.input.events.length === 0) {
      add("input.events", "no observable event or fault injection");
    }
    if (!Array.isArray(item.expected?.observableChecks) || item.expected.observableChecks.length === 0) {
      add("expected.observableChecks", "no artifact or state check independent of model prose");
    }
    if (!Array.isArray(item.expected?.forbiddenEffects) || item.expected.forbiddenEffects.length === 0) {
      add("expected.forbiddenEffects", "no observable negative control");
    }
    if (!item.limits || !Number.isSafeInteger(item.limits.timeoutMs) || item.limits.timeoutMs <= 0 ||
        !Number.isSafeInteger(item.limits.maxAttempts) || item.limits.maxAttempts <= 0) {
      add("limits", "missing positive timeout or attempt bound");
    }
  }
  return issues;
}
