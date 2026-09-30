import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fullTrajectoryReadiness, type FullTrajectoryCase } from "./fullTrajectoryReadiness.js";

let incomplete = false;
for (const name of ["protocol-families-v1.json", "protocol-families-v1-heldout.json"]) {
  const fixture = JSON.parse(await readFile(resolve(import.meta.dirname, "../tasks", name), "utf8")) as {
    families: Array<{ cases: FullTrajectoryCase[] }>;
  };
  const cases = fixture.families.flatMap(family => family.cases);
  const issues = fullTrajectoryReadiness(cases);
  if (issues.length) incomplete = true;
  console.log(JSON.stringify({ fixture: name, cases: cases.length,
    ready: cases.length - new Set(issues.map(issue => issue.caseId)).size,
    issueCount: issues.length,
    missingFields: Object.fromEntries([...new Set(issues.map(issue => issue.field))].map(field =>
      [field, issues.filter(issue => issue.field === field).length])) }));
}
if (incomplete && !process.argv.includes("--report-only")) process.exitCode = 1;
