import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const protocol = await readFile(resolve(root, "docs/research/PROTOCOL.md"), "utf8");
const results = await readFile(resolve(root, "docs/research/RESULTS.md"), "utf8");
const failures: string[] = [];

for (const required of [
  "B0",
  "B1",
  "AF",
  "AF-memory-off",
  "AF-routing-off",
  "AF-evidence-off",
  "Valid success",
  "False completion",
  "Fact retention",
  "correction recurrence",
  "Cost per valid success",
  "negative control",
]) {
  if (!protocol.toLowerCase().includes(required.toLowerCase())) {
    failures.push(`protocol is missing required term: ${required}`);
  }
}

if (!results.includes("NOT MEASURED")) {
  failures.push("results ledger must retain explicit unmeasured outcomes");
}
if (!results.includes("No local mechanics check establishes superiority")) {
  failures.push("results ledger must state its interpretation boundary");
}

if (failures.length > 0) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  protocolVersion: protocol.match(/Version:\s*([^\r\n]+)/)?.[1] ?? "unknown",
  conditionsChecked: 6,
  resultsBoundary: "explicit",
}, null, 2));
