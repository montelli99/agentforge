/** Ensures the generic public product cannot silently absorb a legacy operations stack. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["src", "scripts", "website"];
const prohibited = [
  /\bmontelli\w*\b/i,
  /\bprolific(?:\s+workflow)?\b/i,
  /\bAI REI\b/i,
  /\bGoHighLevel\b/i,
  /\bJustCall\b/i,
  /\/webhook\/(?:ghl|justcall)\b/i,
  /\bPPC(?:\s+Pipeline|\s+Engine)?\b/i,
  /\breal-estate-operations-pack\b/i,
  /\bDivinity Aligned\b/i,
];
const publicTextFiles = ["README.md", "CONTRIBUTING.md"];
const validatorFiles = new Set([
  "product-isolation-acceptance.mjs",
  "public-repository-privacy-acceptance.mjs",
  "verify-static.mjs",
]);

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(target);
    return /\.(?:ts|mts|cts|js|mjs|cjs)$/.test(entry.name) ? [target] : [];
  });
}

const matches = [];
for (const sourceRoot of sourceRoots) {
  for (const file of filesIn(path.join(root, sourceRoot))) {
    // Validators contain forbidden-token matchers by design. They inspect the
    // actual product surface themselves and are not shipped runtime behavior.
    if (validatorFiles.has(path.basename(file))) continue;
    const contents = fs.readFileSync(file, "utf8")
      .replaceAll("https://github.com/montelli99/agentforge", "APPROVED_PUBLIC_REPOSITORY")
      .replaceAll("git+https://github.com/montelli99/agentforge.git", "APPROVED_PUBLIC_REPOSITORY");
    for (const pattern of prohibited) {
      if (pattern.test(contents)) matches.push(`${path.relative(root, file)} matches ${pattern}`);
    }
  }
}
for (const publicFile of publicTextFiles) {
  const contents = fs.readFileSync(path.join(root, publicFile), "utf8");
  for (const pattern of prohibited) {
    if (pattern.test(contents)) matches.push(`${publicFile} matches ${pattern}`);
  }
}
assert.deepEqual(matches, [], `Generic product isolation failed:\n${matches.join("\n")}`);

const launcher = fs.readFileSync(path.join(root, "src/server/start.ts"), "utf8");
assert.match(launcher, /process\.env\.PORT \|\| process\.env\.AGENTFORGE_PORT \|\| "3460"/, "AgentForge must honor its isolated port configuration.");
assert.match(launcher, /3000 is intentionally avoided/, "The launcher must preserve isolation from port 3000.");
console.log("PASS: generic product source and public site are free of legacy integration and personal-release identifiers, and default to an isolated port.");
