/**
 * Guards the GitHub source surface, which is broader than the npm package.
 * Public examples may be fictional, but operational history and owner-specific
 * artifacts must never be committed as part of the AgentForge product.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const prohibitedPaths = [
  /^reports\//i,
  /^design\/prototypes\//i,
  /^website\/index\.old\.html$/i,
  /^(?:ANTIGRAVITY_HANDOFF_2026-09-23|MEMORY_AUDIT|PRODUCTION_ISOLATION_CONTRACT|MANIFEST)\./i,
];
const prohibitedContent = [
  /\bmontelli\w*\b/i,
  /\bprolific(?:\s+workflow)?\b/i,
  /\bDivinity Aligned\b/i,
  /\bAI REI\b/i,
  /\bGoHighLevel\b/i,
  /\bJustCall\b/i,
  /\bPPC(?:\s+Pipeline|\s+Engine)?\b/i,
  /\breal-estate-operations-pack\b/i,
];
const approvedPublicReferences = new Map([
  ["website/github.html", ["https://github.com/montelli99/agentforge"]],
  ["website/install.html", ["https://github.com/montelli99/agentforge"]],
]);
const textExtensions = new Set([".cjs", ".cts", ".css", ".csv", ".html", ".json", ".js", ".md", ".mjs", ".mts", ".svg", ".ts", ".txt", ".yml", ".yaml"]);

const listFiles = args => execFileSync("git", args, { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
// A release review often happens before `git add`. Include candidate public
// files so a private draft cannot become safe merely because it is untracked.
const files = [...new Set([
  ...listFiles(["ls-files", "-z"]),
  ...listFiles(["ls-files", "--others", "--exclude-standard", "-z"]),
])];
const violations = [];

for (const file of files) {
  const absolutePath = path.join(root, file);
  // Deleted working-tree files are absent from the next revision.
  if (!fs.existsSync(absolutePath)) continue;
  // Privacy validators contain their own forbidden-token matchers. The product
  // isolation gate separately verifies their targets, so self-matching adds no
  // coverage and would make the release check fail after the script is tracked.
  if (["public-repository-privacy-acceptance.mjs", "product-isolation-acceptance.mjs", "verify-static.mjs"].includes(path.basename(file))) continue;
  if (prohibitedPaths.some(pattern => pattern.test(file))) {
    violations.push(`${file} is an operational or obsolete private artifact.`);
    continue;
  }
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  let content = fs.readFileSync(absolutePath, "utf8");
  // The public repository URL is a release destination, not private operator
  // data. Remove only this exact approved reference before scanning the rest
  // of the page for owner-specific material.
  for (const reference of approvedPublicReferences.get(file) ?? []) {
    content = content.replaceAll(reference, "APPROVED_PUBLIC_REPOSITORY");
  }
  for (const pattern of prohibitedContent) {
    if (pattern.test(content)) violations.push(`${file} matches ${pattern}.`);
  }
}

assert.deepEqual(violations, [], `Public repository privacy gate failed:\n${violations.join("\n")}`);
console.log("PASS: tracked and candidate public source contain no owner-specific operations labels or archived private artifacts.");
