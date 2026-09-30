import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fullTrajectoryReadiness, type FullTrajectoryCase } from "./fullTrajectoryReadiness.js";

type Case = FullTrajectoryCase & { referenceCommand?: string };
type Fixture = {
  id?: string;
  version?: number;
  syntheticOnly?: boolean;
  split?: string;
  evaluatorDataIsAgentInvisible?: boolean;
  trajectory?: string;
  measurement?: string;
  families?: Array<{ id?: string; cases?: Case[] }>;
};

const filename = "full-trajectory-development-v2.json";
const fixture = JSON.parse(await readFile(resolve(import.meta.dirname, "../tasks", filename), "utf8")) as Fixture;
const failures: string[] = [];
const requiredFamilies = [
  "delayed-recall", "handoff-continuation", "correction-transfer",
  "workflow-recovery", "duplicate-timeout-recovery", "permission-completion-safety",
];

if (fixture.id !== "research-full-trajectory-development-v2" || fixture.version !== 2) failures.push("fixture identity or version is invalid");
if (fixture.syntheticOnly !== true || fixture.split !== "development" || fixture.evaluatorDataIsAgentInvisible !== true || fixture.trajectory !== "full" || fixture.measurement !== "reference-mechanics-only") {
  failures.push("fixture must be synthetic-only, development-only, evaluator-invisible, and reference-only");
}

const families = fixture.families ?? [];
const familyIds = families.map(family => family.id ?? "");
if (familyIds.length !== requiredFamilies.length || new Set(familyIds).size !== familyIds.length ||
    requiredFamilies.some(id => !familyIds.includes(id))) failures.push("fixture must contain exactly the six existing protocol families");
const cases = families.flatMap(family => family.cases ?? []);
if (cases.length !== 12) failures.push(`expected 12 cases, found ${cases.length}`);
const ids = cases.map(item => item.id);
if (ids.some(id => !id) || new Set(ids).size !== ids.length) failures.push("case IDs must be present and unique");
for (const family of families) if (family.cases?.length !== 2) failures.push(`family ${family.id ?? "unknown"} must contain exactly two cases`);

for (const item of cases) {
  for (const [field, records] of [["input.setup", item.input?.setup], ["input.events", item.input?.events]] as const) {
    for (const record of records ?? []) {
      if (record.kind !== "file" || typeof record.payload.path !== "string" || typeof record.payload.content !== "string") {
        failures.push(`${item.id}: ${field} entries must be file records with string path and content`);
      }
      if (typeof record.payload.path === "string" && (record.payload.path.startsWith("/") || record.payload.path.split(/[\\/]/).includes(".."))) {
        failures.push(`${item.id}: ${field} path must stay relative to the disposable workspace`);
      }
    }
  }
  for (const check of item.expected?.observableChecks ?? []) {
    if (check.kind !== "file" || !check.target.startsWith("artifacts/") || typeof check.expected !== "string") {
      failures.push(`${item.id}: observable checks must assert exact UTF-8 files under artifacts/`);
    }
  }
  for (const effect of item.expected?.forbiddenEffects ?? []) {
    if (effect.kind !== "file" || !effect.target) failures.push(`${item.id}: forbidden effects must name a file path`);
  }
  const expectedCommand = `node -e 'const fs=require("node:fs");${(item.expected?.observableChecks ?? []).map(({ target, expected }) =>
    `fs.mkdirSync(${JSON.stringify(target.split("/").slice(0, -1).join("/") || ".")},{recursive:true});fs.writeFileSync(${JSON.stringify(target)},${JSON.stringify(expected)});`).join("")}'`;
  if (item.referenceCommand !== expectedCommand) failures.push(`${item.id}: referenceCommand must deterministically write only the expected artifacts`);
}

const readiness = fullTrajectoryReadiness(cases);
for (const issue of readiness) failures.push(`${issue.caseId}: ${issue.field} ${issue.reason}`);

if (failures.length) {
  console.error(JSON.stringify({ valid: false, fixture: filename, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ valid: true, fixture: fixture.id, families: families.length, developmentCases: cases.length }, null, 2));
