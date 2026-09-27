import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const checks = [];
const check = (id, passed, detail, blocker = false) => checks.push({ id, passed, detail, blocker });

function runGate(scriptName) {
  try {
    execFileSync(process.execPath, [path.join(root, "scripts", scriptName)], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { passed: true, detail: `${scriptName} passed.` };
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    const message = stderr || error.message;
    return { passed: false, detail: `${scriptName} failed: ${message}` };
  }
}

check("license", fs.existsSync(path.join(root, "LICENSE")), "Apache-2.0 LICENSE is present.", true);
check("goal-execution-map", fs.existsSync(path.join(root, "docs", "GOAL_EXECUTION_MAP.md")), "Approved goal execution map is present.", true);
check("public-entrypoint", fs.existsSync(path.join(root, "dist", "index.js")), "Built public entrypoint dist/index.js exists.", true);
check("public-manifest", fs.existsSync(path.join(root, "src", "publicSystemManifest.ts")), "Public subsystem manifest is present.", true);
const isolationGate = runGate("product-isolation-acceptance.mjs");
check("privacy-gate", isolationGate.passed, isolationGate.detail, true);
const repositoryPrivacyGate = runGate("public-repository-privacy-acceptance.mjs");
check("repository-source-privacy", repositoryPrivacyGate.passed, repositoryPrivacyGate.detail, true);
const packageGate = runGate("public-package-acceptance.mjs");
check("package-surface-and-archive-privacy", packageGate.passed, packageGate.detail, true);
check("cli-acceptance", fs.existsSync(path.join(root, "scripts", "package-cli-acceptance.mjs")), "CLI package acceptance gate is available.", true);
check("package-version", typeof pkg.version === "string" && pkg.version.trim().length > 0 && pkg.version !== "0.0.0", pkg.private === true ? "Owner-selected package version is still required before publishing." : "Package version is selected.", true);
check("publishability", pkg.private !== true, pkg.private === true ? "Package remains private by design until an owner selects a public release version." : "Package is publishable.", true);

const blockers = checks.filter(item => item.blocker && !item.passed);
const packageReady = blockers.length === 0;
// These cannot be inferred from a local checkout. Keep them distinct from the
// package gate so a green local audit never misrepresents an unpublished
// project as a completed public release.
const externalReleaseProof = [
  "Hosted CI run for the release commit has not been recorded by this local audit.",
  "Registry publication and provenance verification have not been performed by this local audit.",
];
const report = {
  packageReady,
  publishReady: packageReady && externalReleaseProof.length === 0,
  blockers,
  externalReleaseProof,
  checks,
  generatedAt: new Date().toISOString(),
};
console.log(JSON.stringify(report, null, 2));
// Local package readiness is the command's pass/fail contract. Publishing is
// intentionally an explicit external action, never performed here.
process.exitCode = packageReady ? 0 : 1;
