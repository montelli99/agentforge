/**
 * Guards the GitHub source surface, which is broader than the npm package.
 * Public examples may be fictional, but operational history and owner-specific
 * artifacts must never be committed as part of the AgentForge product.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const archiveTreeMode = process.argv.includes("--archive-tree");
const archiveFileLimit = 20_000;
const archiveByteLimit = 512 * 1024 * 1024;
const archiveTextFileByteLimit = 5 * 1024 * 1024;
const prohibitedPaths = [
  /^reports\//i,
  /^design\/prototypes\//i,
  /^website\/index\.old\.html$/i,
  /^(?:ANTIGRAVITY_HANDOFF_2026-09-23|MEMORY_AUDIT|PRODUCTION_ISOLATION_CONTRACT|MANIFEST)\./i,
];
const prohibitedContent = [
  /\bmontelli\w*\b/i,
  /\bprolific(?:\s+workflow)?\b/i,
  /\bDivinity Aligned\b/i,
  /\bAI REI\b/i,
  /\bGoHighLevel\b/i,
  /\bJustCall\b/i,
  /\bPPC(?:\s+Pipeline|\s+Engine)?\b/i,
  /\breal-estate-operations-pack\b/i,
  // Public examples use placeholder profiles; real local home directories
  // expose operator identity and make install instructions unusable elsewhere.
  /\b[A-Za-z]:[\\/]+Users[\\/]+(?!(?:example|user|test|alice|bob)(?:[\\/]|$))[^\\/\s`"'<>]+/i,
];
// Git's candidate list intentionally respects .gitignore, but a release
// archive can still be built incorrectly from the raw working directory. Scan
// the filesystem boundary by path and type as well, without reading the
// contents of browser profiles, runtime state, caches, databases, or logs.
const prohibitedFilesystemTrees = [
  { pattern: /(?:^|\/)\.artifacts(?:\/|$)/i, reason: "generated artifact tree" },
  { pattern: /(?:^|\/)artifacts(?:\/|$)/i, reason: "generated artifact tree" },
  { pattern: /(?:^|\/)reports(?:\/|$)/i, reason: "operational report tree" },
  {
    pattern: /(?:^|\/)runtime(?:\/|$)/i,
    reason: "runtime state tree",
    // These are reviewed product-source namespaces, not local runtime state.
    allowed: [/^src\/core\/runtime(?:\/|$)/i, /^dist\/core\/runtime(?:\/|$)/i],
  },
  { pattern: /(?:^|\/)signin-runtime(?:\/|$)/i, reason: "sign-in runtime state tree" },
  { pattern: /(?:^|\/)logs(?:\/|$)/i, reason: "runtime log tree" },
  { pattern: /(?:^|\/)coverage(?:\/|$)/i, reason: "coverage cache tree" },
  { pattern: /(?:^|\/)tmp(?:\/|$)/i, reason: "temporary cache tree" },
  { pattern: /(?:^|\/)temp(?:\/|$)/i, reason: "temporary cache tree" },
  { pattern: /(?:^|\/)\.cache(?:\/|$)/i, reason: "cache tree" },
  { pattern: /(?:^|\/)\.preview-ui(?:\/|$)/i, reason: "preview runtime tree" },
  { pattern: /(?:^|\/)\.visual-review-profile(?:\/|$)/i, reason: "browser profile tree" },
  { pattern: /(?:^|\/)\.playwright-mcp(?:\/|$)/i, reason: "browser automation profile tree" },
  { pattern: /(?:^|\/)\.codex-worktrees(?:\/|$)/i, reason: "local worktree state" },
  { pattern: /(?:^|\/)\.worktrees(?:\/|$)/i, reason: "local worktree state" },
  { pattern: /(?:^|\/)all_markdown_files(?:\/|$)/i, reason: "generated private-reference consolidation" },
  { pattern: /(?:^|\/)design\/prototypes(?:\/|$)/i, reason: "obsolete prototype tree" },
];
const prohibitedStateFileNames = new Map([
  ["cookies", "browser cookie database"],
  ["history", "browser history database"],
  ["login data", "browser login database"],
  ["local state", "browser local-state file"],
  ["network persistent state", "browser network-state file"],
  ["secure preferences", "browser secure-preferences file"],
  ["web data", "browser web-data database"],
]);
const prohibitedStateDirectoryNames = new Map([
  ["sessions", "browser session tree"],
  ["session storage", "browser session-storage tree"],
]);
const prohibitedOperationalExtensions = new Map([
  [".7z", "nested release archive"],
  [".db", "database file"],
  [".db-journal", "database journal"],
  [".ldb", "database file"],
  [".log", "runtime log"],
  [".pid", "runtime process state"],
  [".rar", "nested release archive"],
  [".sqlite", "database file"],
  [".sqlite3", "database file"],
  [".sqlite-shm", "database shared-memory file"],
  [".sqlite-wal", "database write-ahead log"],
  [".tar", "nested release archive"],
  [".tgz", "nested release archive"],
  [".wal", "database write-ahead log"],
  [".zip", "nested release archive"],
]);
const repositoryTraversalSkips = new Set([".git", "node_modules", ".pnpm-store"]);
const archiveForbiddenMetadataTrees = new Map([
  [".git", "version-control metadata"],
  ["node_modules", "installed dependency tree"],
  [".pnpm-store", "package-manager cache tree"],
]);
const approvedPublicReferences = new Map([
  // The package manifest must identify the public repository for npm/GitHub
  // consumers. This is release metadata, not an operational owner record.
  ["package.json", [
    "https://github.com/montelli99/agentforge",
    "git+https://github.com/montelli99/agentforge.git",
  ]],
  ["website/github.html", ["https://github.com/montelli99/agentforge"]],
  ["website/install.html", ["https://github.com/montelli99/agentforge"]],
]);
const textExtensions = new Set([".cjs", ".cts", ".css", ".csv", ".html", ".json", ".js", ".md", ".mjs", ".mts", ".svg", ".ts", ".txt", ".yml", ".yaml"]);

const listFiles = args => execFileSync("git", args, { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const violations = [];
const filesystemFiles = [];
const filesystemFileSizes = new Map();
let filesystemBytes = 0;

function scanFilesystemBoundary(directory, relativeDirectory = "") {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    const normalized = relative.replaceAll("\\", "/");
    if (repositoryTraversalSkips.has(entry.name)) {
      if (archiveTreeMode) {
        violations.push(`${normalized} is prohibited ${archiveForbiddenMetadataTrees.get(entry.name)}.`);
      }
      continue;
    }

    const prohibitedTree = prohibitedFilesystemTrees.find(({ pattern, allowed = [] }) =>
      pattern.test(normalized) && !allowed.some(allowedPattern => allowedPattern.test(normalized)));
    if (prohibitedTree) {
      violations.push(`${normalized} is a prohibited ${prohibitedTree.reason}.`);
      continue;
    }

    const absolute = path.join(directory, entry.name);
    const stats = fs.lstatSync(absolute);
    if (stats.isSymbolicLink()) {
      violations.push(`${normalized} is a symbolic link or junction; release trees must contain reviewed regular files.`);
      continue;
    }

    if (entry.isDirectory()) {
      const stateDirectoryReason = prohibitedStateDirectoryNames.get(entry.name.toLowerCase());
      if (stateDirectoryReason) {
        violations.push(`${normalized} is a prohibited ${stateDirectoryReason}.`);
        continue;
      }
      scanFilesystemBoundary(absolute, normalized);
      continue;
    }

    filesystemFiles.push(normalized);
    filesystemFileSizes.set(normalized, stats.size);
    filesystemBytes += stats.size;

    const stateFileKey = entry.name.toLowerCase().replace(/-(?:journal|shm|wal)$/i, "");
    const stateFileReason = prohibitedStateFileNames.get(stateFileKey);
    if (stateFileReason) violations.push(`${normalized} is a prohibited ${stateFileReason}.`);
    const lowerName = entry.name.toLowerCase();
    const operationalExtension = [...prohibitedOperationalExtensions.entries()]
      .find(([extension]) => lowerName.endsWith(extension));
    if (operationalExtension) {
      violations.push(`${normalized} is a prohibited ${operationalExtension[1]}.`);
    }
  }
}

scanFilesystemBoundary(root);

if (archiveTreeMode) {
  if (filesystemFiles.length > archiveFileLimit) {
    violations.push(`Archive tree contains ${filesystemFiles.length} files; bounded limit is ${archiveFileLimit}.`);
  }
  if (filesystemBytes > archiveByteLimit) {
    violations.push(`Archive tree contains ${filesystemBytes} bytes; bounded limit is ${archiveByteLimit}.`);
  }
  // An oversized archive is outside the reviewed resource boundary. Stop
  // before opening any otherwise eligible content; per-file limits remain a
  // second bound for archive trees that pass these aggregate checks.
  if (filesystemFiles.length > archiveFileLimit || filesystemBytes > archiveByteLimit) {
    const boundaryViolations = [...new Set(violations)].sort();
    assert.deepEqual(boundaryViolations, [], `Public repository privacy gate failed:\n${boundaryViolations.join("\n")}`);
  }
}

// Repository mode preserves the Git-aware tracked-plus-candidate behavior.
// Archive mode deliberately does not invoke Git and scans every bounded regular
// file discovered in the extracted tree.
const files = archiveTreeMode
  ? filesystemFiles
  : [...new Set([
      ...listFiles(["ls-files", "-z"]),
      ...listFiles(["ls-files", "--others", "--exclude-standard", "-z"]),
    ])];

for (const file of files) {
  const absolutePath = path.join(root, file);
  // Deleted working-tree files are absent from the next revision.
  if (!fs.existsSync(absolutePath)) continue;
  // Privacy validators contain their own forbidden-token matchers. The product
  // isolation gate separately verifies their targets, so self-matching adds no
  // coverage and would make the release check fail after the script is tracked.
  if (["public-repository-privacy-acceptance.mjs", "product-isolation-acceptance.mjs", "verify-static.mjs"].includes(path.basename(file))) continue;
  if (prohibitedPaths.some(pattern => pattern.test(file))) {
    violations.push(`${file} is an operational or obsolete private artifact.`);
    continue;
  }
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  if (archiveTreeMode && (filesystemFileSizes.get(file) ?? 0) > archiveTextFileByteLimit) {
    violations.push(`${file} exceeds the bounded text-file scan limit of ${archiveTextFileByteLimit} bytes.`);
    continue;
  }
  let content = fs.readFileSync(absolutePath, "utf8");
  // The public repository URL is a release destination, not private operator
  // data. Remove only this exact approved reference before scanning the rest
  // of the page for owner-specific material.
  const approvedReferences = [
    ...(approvedPublicReferences.get(file) ?? []),
    "https://github.com/montelli99/agentforge",
    "git+https://github.com/montelli99/agentforge.git",
  ];
  for (const reference of approvedReferences) content = content.replaceAll(reference, "APPROVED_PUBLIC_REPOSITORY");
  for (const pattern of prohibitedContent) {
    if (pattern.test(content)) violations.push(`${file} matches ${pattern}.`);
  }
}

const uniqueViolations = [...new Set(violations)].sort();
assert.deepEqual(uniqueViolations, [], `Public repository privacy gate failed:\n${uniqueViolations.join("\n")}`);
console.log(archiveTreeMode
  ? `PASS: bounded archive tree (${files.length} files) contains no prohibited paths, types, owner-specific labels, or local profile references.`
  : "PASS: tracked and candidate public source contain no owner-specific operations labels or archived private artifacts.");
