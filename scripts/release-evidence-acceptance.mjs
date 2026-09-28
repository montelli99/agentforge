import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const evidencePath = path.join(root, "docs/research/RELEASE_EVIDENCE.md");
const evidence = readFileSync(evidencePath, "utf8");
const revision = evidence.match(/Local release-readiness revision: `([0-9a-f]{40})`/)?.[1];
if (!revision) throw new Error("release evidence is missing a 40-character revision");

const revisionExists = execFileSync("git", ["cat-file", "-e", `${revision}^{commit}`], { cwd: root, stdio: "ignore" });
void revisionExists;

const inputs = [
  "docs/research/PROTOCOL.md",
  "research/tasks/offline-intent-v1.json",
  "research/config/pilot-v0.1.json",
];
const failures = [];
for (const file of inputs) {
  const row = evidence.split("\n").find((line) => line.includes(`| \`${file}\` |`));
  const expected = row?.match(/`([0-9a-f]{64})`/)?.[1];
  const actual = createHash("sha256").update(readFileSync(path.join(root, file), "utf8").replaceAll("\r\n", "\n")).digest("hex");
  if (!expected) failures.push(`${file}: missing recorded hash`);
  else if (expected !== actual) failures.push(`${file}: recorded hash does not match current file`);
}
if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ valid: true, revision, frozenInputs: inputs.length }, null, 2));
