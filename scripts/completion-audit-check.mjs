import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "docs/COMPLETION_AUDIT_2026-09-27.md",
  "docs/GOAL_EXECUTION_MAP.md",
  "docs/RELEASE_STATUS.md",
  "docs/RELEASE_RUNBOOK.md",
  "docs/requirements/IMPLEMENTATION_TRACEABILITY.md",
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

console.log(JSON.stringify({ passed: true, sourceDocuments: required.length, generatedAt: new Date().toISOString() }, null, 2));
