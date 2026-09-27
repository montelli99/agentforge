/**
 * Inspect the exact npm packlist before a public release.
 *
 * Source scans are useful, but npm's `files` rules can still package a stale
 * operational document. This gate checks the same archive inventory npm will
 * publish and rejects private-development paths, credentials, and personal
 * contact data in shipped text assets.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
function runNpm(args) {
  // npm.cmd is a shell shim on Windows and cannot be spawned directly by
  // execFileSync. Invoke npm's JavaScript CLI through the current Node binary.
  const command = process.platform === "win32" ? process.execPath : "npm";
  const commandArgs = process.platform === "win32"
    ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args]
    : args;
  return execFileSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const output = runNpm(["pack", "--dry-run", "--json"]);
const [archive] = JSON.parse(output);
assert.ok(archive && Array.isArray(archive.files), "npm pack did not return an archive file list.");

const shippedFiles = archive.files.map(file => file.path);
const disallowedPaths = shippedFiles.filter(file => /(?:^|\/)(?:all_markdown_files|artifacts|\.agentforge|\.codex-worktrees|\.worktrees|requirements)\//i.test(file)
  || /(?:^|\/)TERRA_(?:COMPLETION_PLAN|START_PROMPT)\.md$/i.test(file));
assert.deepEqual(disallowedPaths, [], `npm archive contains internal operational files:\n${disallowedPaths.join("\n")}`);

const sensitivePatterns = [
  { label: "Windows user path", pattern: /[A-Z]:\\Users\\[^\\\s/]+/i },
  // Keep this case-sensitive: `/users/...` is a normal public HTTP route.
  { label: "POSIX user path", pattern: /\/(?:Users|home)\/[^/\s]+/ },
  { label: "Telegram bot token", pattern: /\b\d{8,12}:[A-Za-z0-9_-]{20,}\b/ },
  { label: "OpenAI-style API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/i },
  { label: "Slack token", pattern: /\bxox(?:b|p|a|r|s)-[A-Za-z0-9-]{10,}\b/i },
  { label: "private email address", pattern: /\b[A-Z0-9._%+-]+@(?!example\.com\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: "North American phone number", pattern: /(?:\+?1[\s.-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]\d{3}[\s.-]\d{4}\b/ },
];
const textExtensions = new Set([".js", ".mjs", ".cjs", ".json", ".md", ".txt"]);
const matches = [];
for (const relativePath of shippedFiles) {
  if (!textExtensions.has(path.extname(relativePath).toLowerCase())) continue;
  const absolutePath = path.join(root, relativePath);
  const contents = fs.readFileSync(absolutePath, "utf8");
  for (const { label, pattern } of sensitivePatterns) {
    if (pattern.test(contents)) matches.push(`${relativePath}: ${label}`);
  }
}
assert.deepEqual(matches, [], `npm archive contains possible private data:\n${matches.join("\n")}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-public-archive-"));
try {
  const packageOutput = runNpm(["pack", "--json", "--pack-destination", tempDir]);
  const [packed] = JSON.parse(packageOutput);
  assert.ok(fs.existsSync(path.join(tempDir, packed.filename)), "npm pack did not create the declared archive.");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(`PASS: npm archive privacy gate inspected ${shippedFiles.length} shipped files with no internal paths or private-data signatures.`);
