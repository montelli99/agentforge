import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const required = [
  "docs/COMPLETION_AUDIT_2026-09-27.md",
  "docs/GOAL_EXECUTION_MAP.md",
  "docs/RELEASE_STATUS.md",
  "docs/RELEASE_RUNBOOK.md",
  "docs/requirements/IMPLEMENTATION_TRACEABILITY.md",
  "docs/research/STATUS_MATRIX.md",
  "docs/research/EXECUTION_LEDGER.md",
  "docs/research/RELEASE_EVIDENCE.md",
  "research/config/owner-approval-template.json",
  "research/results/mechanics-2026-09-29.json",
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Completion audit is missing: ${missing.join(", ")}`);
  process.exit(1);
}

const goalMap = fs.readFileSync(path.join(root, "docs/GOAL_EXECUTION_MAP.md"), "utf8");
const audit = fs.readFileSync(path.join(root, "docs/COMPLETION_AUDIT_2026-09-27.md"), "utf8");
const forbidden = ["no Git remote configured", "personal phone", "seller data"];
const stale = forbidden.filter(marker => goalMap.includes(marker) || audit.includes(marker));
if (stale.length) {
  console.error(`Completion audit contains stale/private markers: ${stale.join(", ")}`);
  process.exit(1);
}

const status = fs.readFileSync(path.join(root, "docs/research/STATUS_MATRIX.md"), "utf8");
const ledger = fs.readFileSync(path.join(root, "docs/research/EXECUTION_LEDGER.md"), "utf8");
const approval = JSON.parse(fs.readFileSync(path.join(root, "research/config/owner-approval-template.json"), "utf8"));
const mechanics = JSON.parse(fs.readFileSync(path.join(root, "research/results/mechanics-2026-09-29.json"), "utf8"));
const requiredMarkers = ["model-backed outcome measurements", "publication acceptance", "WAITING_FOR_INPUT", "mechanics"];
const markerSource = `${status}\n${ledger}`.toLowerCase();
const missingMarkers = requiredMarkers.filter(marker => !markerSource.includes(marker.toLowerCase()));
if (missingMarkers.length) {
  console.error(`Completion audit is missing truthful boundary markers: ${missingMarkers.join(", ")}`);
  process.exit(1);
}
if (approval.providerCallsAuthorized === true || approval.spendAuthorized === true) {
  console.error("Completion audit refuses an approval template that authorizes provider calls or spending by default.");
  process.exit(1);
}
try {
  const evidenceResult = execFileSync(process.execPath, ["scripts/release-evidence-acceptance.mjs"], { cwd: root, encoding: "utf8" });
  const parsed = JSON.parse(evidenceResult);
  if (parsed.valid !== true || parsed.frozenInputs !== 5 || parsed.sanitizedRecords !== 1) {
    throw new Error("release evidence did not verify the expected five inputs and one sanitized record");
  }
} catch (error) {
  console.error(`Completion audit release-evidence verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
if (mechanics.syntheticOnly !== true || mechanics.networkCalls !== 0 || mechanics.providerCalls !== 0) {
  console.error("Completion audit refuses a mechanics record that is not explicitly zero-spend and synthetic-only.");
  process.exit(1);
}

console.log(JSON.stringify({ passed: true, sourceDocuments: required.length, frozenInputs: 5, sanitizedRecords: 1, syntheticOnly: true, generatedAt: new Date().toISOString() }, null, 2));
