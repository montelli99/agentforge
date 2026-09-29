import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packetFiles = [
  "docs/research/paper.md",
  "docs/research/PROTOCOL.md",
  "docs/research/RESULTS.md",
  "docs/research/REPRODUCTION.md",
  "docs/research/CAPABILITY_EVIDENCE.md",
  "docs/research/SOURCE_RUNTIME_TRACE.md",
  "docs/research/RELEASE_EVIDENCE.md",
  "docs/research/OWNER_APPROVAL_PACKET.md",
  "docs/research/PAID_RUN_ESTIMATE.md",
  "docs/research/RELATED_WORK.md",
  "docs/research/MECHANICS_RUNNER_ACCEPTANCE.md",
  "docs/research/SUBMISSION_CHECKLIST.md",
  "research/README.md",
  "research/results/mechanics-2026-09-28.json",
  "research/results/mechanics-2026-09-29.json",
  "research/results/mechanics-2026-09-29T12-52-30-794Z-94ca9148-742e-4073-8fba-4513d22c9901/consolidated.json",
];
const missing = [];
const failures = [];
for (const relative of packetFiles) {
  try {
    const content = await fs.readFile(path.join(root, relative), "utf8");
    if (!content.trim()) failures.push(`${relative} is empty`);
    if (relative === "docs/research/paper.md" && !content.includes("Status: manuscript scaffold")) {
      failures.push("paper must remain explicitly marked as a manuscript scaffold");
    }
    if (relative === "docs/research/RESULTS.md" && !content.includes("NOT MEASURED")) {
      failures.push("results must retain the explicit NOT MEASURED boundary");
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
  state: "MECHANICS_VERIFIED",
  publicationAction: "not performed",
  measuredOutcomes: "not measured",
}, null, 2));
