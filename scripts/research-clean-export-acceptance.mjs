import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const exportRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agentforge-research-export-"));
const required = [
  "research/README.md",
  "research/tasks/offline-intent-v1.json",
  "research/tasks/protocol-families-v1.json",
  "research/tasks/protocol-families-v1-heldout.json",
  "research/config/pilot-v0.1.json",
  "research/config/owner-approval-template.json",
  "research/results/mechanics-2026-09-29.json",
  "research/runner/mechanicsSweep.ts",
  "docs/research/PROTOCOL.md",
  "docs/research/REPRODUCTION.md",
  "docs/research/OWNER_APPROVAL_PACKET.md",
  "docs/research/paper.md",
  "docs/research/RESULTS.md",
];
const forbidden = [
  /[A-Z]:\\Users\\/i,
  /(?:^|[/\\])Users[/\\][^/\\]+[/\\]/i,
  /(?:sk|pk|api)[-_]?[a-z0-9]{16,}/i,
  /(?:password|secret|token)\s*[:=]\s*\S+/i,
  /@(?:gmail|outlook|yahoo)\.[a-z]{2,}/i,
];

for (const relative of required) {
  const source = path.join(root, relative);
  const destination = path.join(exportRoot, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

const violations = [];
for (const relative of required) {
  const content = await fs.readFile(path.join(exportRoot, relative), "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) violations.push({ file: relative, pattern: pattern.source });
  }
}

await fs.rm(exportRoot, { recursive: true, force: true });
if (violations.length) {
  console.error(JSON.stringify({ passed: false, violations }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ passed: true, filesChecked: required.length, cleanExport: true }, null, 2));
