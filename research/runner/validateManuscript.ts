import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const paperPath = resolve(root, "docs/research/paper.md");
const protocolPath = resolve(root, "docs/research/PROTOCOL.md");

const [paper, protocol] = await Promise.all([
  readFile(paperPath, "utf8"),
  readFile(protocolPath, "utf8"),
]);

const failures: string[] = [];
if (!paper.includes("Status: manuscript scaffold")) {
  failures.push("paper status must remain manuscript scaffold until measured results exist");
}
if (!paper.includes("NOT MEASURED")) {
  failures.push("results placeholders must remain explicit");
}
if (!protocol.includes("no paid or model-backed results")) {
  failures.push("protocol must state that model-backed evaluation is incomplete");
}

for (const claim of ["outperforms", "best-in-class", "first to market"]) {
  if (paper.toLowerCase().includes(claim)) {
    failures.push(`unsupported comparative claim found: ${claim}`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  manuscript: "scaffold",
  results: "not measured",
  unsupportedClaims: "none detected",
}, null, 2));
