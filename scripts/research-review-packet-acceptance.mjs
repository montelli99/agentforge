import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packetFiles = [
  "docs/research/paper.md",
  "docs/research/paper.html",
  "docs/research/PROTOCOL.md",
  "docs/research/RESULTS.md",
  "docs/research/REPRODUCTION.md",
  "docs/research/CAPABILITY_EVIDENCE.md",
  "docs/research/SOURCE_RUNTIME_TRACE.md",
  "docs/research/RELEASE_EVIDENCE.md",
  "docs/research/OWNER_APPROVAL_PACKET.md",
  "docs/research/ROUTE_READINESS.md",
  "docs/research/PAID_RUN_ESTIMATE.md",
  "docs/research/RELATED_WORK.md",
  "docs/research/MECHANICS_RUNNER_ACCEPTANCE.md",
  "docs/research/SUBMISSION_CHECKLIST.md",
  "research/README.md",
  "research/results/mechanics-2026-09-28.json",
  "research/results/mechanics-2026-09-29.json",
  "research/results/mechanics-2026-09-29T12-52-30-794Z-94ca9148-742e-4073-8fba-4513d22c9901/consolidated.json",
  "docs/research/APOLLO_MATCHED_OPERATIONAL_CANARY_20261001.md",
  "research/results/apollo-ps01-luna56-development-v1-20261001/VERIFIED_RESULTS.json",
  "research/results/apollo-six-family-offline-20261001/ACCEPTANCE_FREEZE.json",
  "research/results/apollo-controller-recovery-20261001/ACCEPTANCE.json",
  "research/results/chatgpt-direct-indexed-pair-preparation-20261002.json",
];
const missing = [];
const failures = [];
for (const relative of packetFiles) {
  try {
    const content = await fs.readFile(path.join(root, relative), "utf8");
    if (!content.trim()) failures.push(`${relative} is empty`);
    if (relative === "docs/research/paper.md" && (!content.includes("complete engineering manuscript for owner review") || !content.includes("Publication is not authorized"))) {
      failures.push("paper must remain explicitly limited to unpublished owner review");
    }
    if (relative === "docs/research/paper.html" && (!content.includes("complete engineering manuscript for owner review") || !content.includes("Publication is not authorized"))) {
      failures.push("HTML paper must remain explicitly limited to unpublished owner review");
    }
    if (relative === "docs/research/RESULTS.md" && !content.includes("No local mechanics check establishes superiority, production readiness, market leadership or novelty.")) {
      failures.push("results must retain the explicit non-superiority boundary");
    }
    if (relative.endsWith("mechanics-2026-09-29T12-52-30-794Z-94ca9148-742e-4073-8fba-4513d22c9901/consolidated.json")) {
      const record = JSON.parse(content);
      if (record.passed !== true) failures.push("latest mechanics record must be passing");
      if (!Array.isArray(record.requiredChecks) || record.requiredChecks.length !== 22) {
        failures.push("latest mechanics record must contain 22 required checks");
      }
    }
  } catch {
    missing.push(relative);
  }
}

if (missing.length || failures.length) {
  console.error(JSON.stringify({ passed: false, missing, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  passed: true,
  packetFiles: packetFiles.length,
  state: "ENGINEERING_MANUSCRIPT_OWNER_REVIEW",
  publicationAction: "not performed",
  measuredOutcomes: "bounded development observations; primary study not measured",
}, null, 2));
