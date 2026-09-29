import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const files = [
  "docs/research/PROTOCOL.md",
  "research/tasks/offline-intent-v1.json",
  "research/tasks/protocol-families-v1.json",
  "research/tasks/protocol-families-v1-heldout.json",
  "research/config/pilot-v0.1.json",
];
const hashes: Record<string, string> = {};
for (const relative of files) {
  const bytes = await readFile(resolve(root, relative));
  hashes[relative] = createHash("sha256").update(bytes).digest("hex");
}
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  files: hashes,
  note: "Record this manifest with each run; it identifies inputs but does not prove outcome quality.",
}, null, 2));
