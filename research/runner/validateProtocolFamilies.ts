import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const file = resolve(import.meta.dirname, "../tasks/protocol-families-v1.json");
const fixture = JSON.parse(await readFile(file, "utf8")) as {
  id?: string; version?: number; syntheticOnly?: boolean; split?: string;
  evaluatorDataIsAgentInvisible?: boolean;
  families?: Array<{ id?: string; cases?: Array<{ id?: string; input?: unknown; expected?: unknown }> }>;
};
const failures: string[] = [];
const requiredFamilies = ["delayed-recall", "handoff-continuation", "correction-transfer", "workflow-recovery", "duplicate-timeout-recovery", "permission-completion-safety"];
if (!fixture.id || fixture.version !== 1 || fixture.syntheticOnly !== true) failures.push("fixture identity/version/synthetic boundary is invalid");
if (fixture.split !== "development") failures.push("fixture must be explicitly marked development");
if (fixture.evaluatorDataIsAgentInvisible !== true) failures.push("evaluator data must be declared agent-invisible");
const families = fixture.families ?? [];
const familyIds = new Set(families.map(family => family.id));
for (const id of requiredFamilies) if (!familyIds.has(id)) failures.push(`missing protocol family: ${id}`);
const caseIds = new Set<string>();
for (const family of families) {
  if (!family.id || !family.cases || family.cases.length < 2) failures.push(`family ${family.id ?? "unknown"} needs two development cases`);
  for (const item of family.cases ?? []) {
    if (!item.id || caseIds.has(item.id)) failures.push(`missing or duplicate case id: ${item.id ?? "unknown"}`);
    else caseIds.add(item.id);
    if (item.input === undefined || item.expected === undefined) failures.push(`case ${item.id ?? "unknown"} lacks input or evaluator expectation`);
    if (item.input !== undefined && item.expected !== undefined) {
      const inputText = JSON.stringify(item.input);
      const expectedText = JSON.stringify(item.expected);
      if (inputText.includes(expectedText) || (typeof item.expected === "object" && Object.values(item.expected as Record<string, unknown>).some(value => inputText.includes(String(value))))) {
        failures.push(`case ${item.id ?? "unknown"} leaks evaluator expectation into agent input`);
      }
    }
  }
}
if (caseIds.size !== 12) failures.push(`expected 12 development cases, found ${caseIds.size}`);
if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ valid: true, fixture: fixture.id, families: familyIds.size, developmentCases: caseIds.size }, null, 2));
