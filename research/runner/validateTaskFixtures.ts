import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const file = resolve(root, "research/tasks/offline-intent-v1.json");
const fixture = JSON.parse(await readFile(file, "utf8")) as {
  id?: string;
  cases?: Array<{ id?: string; input?: { expected?: string }; expectedOutput?: { intent?: string }; timeoutMs?: number; tags?: string[] }>;
};
const failures: string[] = [];

if (!fixture.id || !fixture.id.startsWith("research-")) failures.push("fixture must have a research-prefixed id");
if (!fixture.cases || fixture.cases.length < 2) failures.push("fixture must contain at least two cases");
const ids = new Set<string>();
for (const [index, item] of (fixture.cases ?? []).entries()) {
  if (!item.id) failures.push(`case ${index} is missing an id`);
  else if (ids.has(item.id)) failures.push(`duplicate case id: ${item.id}`);
  else ids.add(item.id);
  if (!item.input?.expected || item.expectedOutput?.intent !== item.input.expected) failures.push(`case ${item.id ?? index} has inconsistent expected output`);
  if (!item.timeoutMs || item.timeoutMs <= 0) failures.push(`case ${item.id ?? index} must define a positive timeout`);
}
if (!(fixture.cases ?? []).some(item => item.tags?.includes("negative-control-compatible"))) failures.push("fixture must identify negative-control-compatible coverage");

if (failures.length > 0) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ valid: true, fixture: fixture.id, cases: fixture.cases?.length ?? 0 }, null, 2));
