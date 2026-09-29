import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const output = path.resolve(process.argv[2] ?? path.join(".artifacts", "research-public-bundle"));
const files = [
  "research/README.md",
  "research/tasks/offline-intent-v1.json",
  "research/tasks/protocol-families-v1.json",
  "research/tasks/protocol-families-v1-heldout.json",
  "research/config/pilot-v0.1.json",
  "research/config/owner-approval-template.json",
  "research/results/mechanics-2026-09-29.json",
  "research/runner/mechanicsSweep.ts",
  "docs/research/PROTOCOL.md",
  "docs/research/REPRODUCTION.md",
  "docs/research/OWNER_APPROVAL_PACKET.md",
  "docs/research/paper.md",
  "docs/research/RESULTS.md",
];
const forbidden = [
  /[A-Z]:\\Users\\/i,
  /(?:^|[/\\])Users[/\\][^/\\]+[/\\]/i,
  /(?:sk|pk|api)[-_]?[a-z0-9]{16,}/i,
  /(?:password|secret|token)\s*[:=]\s*\S+/i,
  /@(?:gmail|outlook|yahoo)\.[a-z]{2,}/i,
];

await fs.rm(output, { recursive: true, force: true });
const manifest = [];
for (const relative of files) {
  const source = path.join(root, relative);
  const content = await fs.readFile(source, "utf8");
  const violations = forbidden.filter((pattern) => pattern.test(content)).map((pattern) => pattern.source);
  if (violations.length) throw new Error(`${relative}: forbidden content ${violations.join(", ")}`);
  const destination = path.join(output, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content);
  manifest.push({ path: relative, sha256: crypto.createHash("sha256").update(content).digest("hex"), bytes: Buffer.byteLength(content) });
}
await fs.writeFile(path.join(output, "MANIFEST.json"), JSON.stringify({ schemaVersion: 1, files: manifest }, null, 2) + "\n");
console.log(JSON.stringify({ output, files: manifest.length, bytes: manifest.reduce((sum, item) => sum + item.bytes, 0), passed: true }, null, 2));
