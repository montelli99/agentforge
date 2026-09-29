import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = [
  "research/runner/localModelSmoke.ts",
  "research/runner/productionAdapterSmoke.ts",
  "research/runner/runLocalAdapterPilot.ts",
  "research/README.md",
  "docs/research/NEXT_RUN_INPUTS.md",
  "docs/research/STATUS_MATRIX.md",
];
const contents = new Map(await Promise.all(files.map(async file => [file, await readFile(resolve(root, file), "utf8")])));
const errors = [];
for (const file of files.slice(0, 3)) {
  const source = contents.get(file);
  if (!source.includes("AGENTFORGE_LOCAL_MODEL")) errors.push(`${file}: missing explicit model environment gate`);
  if (!source.includes("Qwen routes are excluded")) errors.push(`${file}: missing Qwen exclusion`);
  if (/qwen2?\.5/i.test(source.replace(/Qwen routes are excluded[^\n]*/g, ""))) errors.push(`${file}: contains a live Qwen route`);
}
for (const file of files.slice(3)) {
  const source = contents.get(file).toLowerCase();
  if (!source.includes("qwen") || !(source.includes("reject") || source.includes("excluded") || source.includes("does not want qwen") || source.includes("no qwen"))) errors.push(`${file}: missing documented no-Qwen policy`);
}
if (errors.length) {
  console.error(JSON.stringify({ passed: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ passed: true, filesChecked: files.length, defaultRoute: "none", excludedRoutes: ["Qwen"] }, null, 2));
