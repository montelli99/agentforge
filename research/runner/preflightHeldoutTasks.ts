/** Reject expensive held-out execution when the cases cannot support the frozen protocol. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type Case = {
  id: string;
  input: { task?: string; priorEvents?: unknown[]; injectedEvents?: unknown[] };
  expected: { requiredOutcome?: unknown; forbiddenOutcomes?: unknown[]; deterministicChecks?: unknown[] };
  limits?: { timeoutMs?: number; attempts?: number };
  negativeControl?: unknown;
};
type Fixture = { families: Array<{ id: string; cases: Case[] }> };
const file = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(import.meta.dirname, "../tasks/protocol-families-v1-heldout.json");
const fixture = JSON.parse(await readFile(file, "utf8")) as Fixture;
const findings: Array<{ caseId: string; missing: string[] }> = [];
for (const family of fixture.families) {
  for (const item of family.cases) {
    const missing: string[] = [];
    if (!item.input.task) missing.push("task");
    if (!item.input.priorEvents?.length && !item.input.injectedEvents?.length) missing.push("observable prior/injected events");
    if (item.expected.requiredOutcome === undefined) missing.push("required outcome");
    if (!item.expected.forbiddenOutcomes?.length) missing.push("forbidden outcomes");
    if (!item.expected.deterministicChecks?.length) missing.push("deterministic state/artifact checks");
    if (!item.limits?.timeoutMs || !item.limits.attempts) missing.push("timeout/attempt limits");
    if (item.negativeControl === undefined) missing.push("negative control");
    if (missing.length) findings.push({ caseId: item.id, missing });
  }
}
const summary = { fixture: file, caseCount: fixture.families.reduce((total, family) => total + family.cases.length, 0),
  structurallyComplete: findings.length === 0, invalidCases: findings.length, missingFieldCounts: Object.fromEntries(
    [...new Set(findings.flatMap(item => item.missing))].map(field =>
      [field, findings.filter(item => item.missing.includes(field)).length])),
  sampleCaseIds: findings.slice(0, 6).map(item => item.caseId) };
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
if (!summary.structurallyComplete) process.exitCode = 1;
