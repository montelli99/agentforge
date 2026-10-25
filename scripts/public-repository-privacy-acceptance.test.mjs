import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const scannerSource = fileURLToPath(new URL("./public-repository-privacy-acceptance.mjs", import.meta.url));

function runFixture(relativePath, contents = "synthetic fixture", { archiveTree = false, instrumentContentReads = false, setup } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-repository-privacy-"));
  try {
    if (!archiveTree) execFileSync("git", ["init", "--quiet"], { cwd: root });
    const scanner = path.join(root, "scripts", "public-repository-privacy-acceptance.mjs");
    fs.mkdirSync(path.dirname(scanner), { recursive: true });
    fs.copyFileSync(scannerSource, scanner);
    const fixture = path.join(root, ...relativePath.split("/"));
    fs.mkdirSync(path.dirname(fixture), { recursive: true });
    fs.writeFileSync(fixture, contents);
    setup?.(root);
    const nodeArguments = [];
    if (instrumentContentReads) {
      const instrumentation = path.join(root, "content-read-instrument.mjs");
      fs.writeFileSync(instrumentation, [
        'import fs from "node:fs";',
        'import { syncBuiltinESMExports } from "node:module";',
        'const originalReadFileSync = fs.readFileSync.bind(fs);',
        // Node 22 may load the scanner module through readFileSync(URL).
        // Count scanner content reads (path strings), not the module loader.
        'fs.readFileSync = (...args) => { if (!(args[0] instanceof URL)) process.stderr.write(`CONTENT_READ:${String(args[0])}\\n`); return originalReadFileSync(...args); };',
        'syncBuiltinESMExports();',
      ].join("\n"));
      nodeArguments.push("--import", pathToFileURL(instrumentation).href);
    }
    nodeArguments.push(scanner, ...(archiveTree ? ["--archive-tree"] : []));
    return spawnSync(process.execPath, nodeArguments, { cwd: root, encoding: "utf8" });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("public repository privacy path and type boundary", () => {
  it("allows a harmless public binary asset", () => {
    const result = runFixture("website/logo.png", Buffer.from([0, 1, 2, 3]));
    assert.equal(result.status, 0);
    assert.match(result.stdout, /PASS: tracked and candidate public source/);
  });

  it("scans a fresh archive extraction without Git metadata", () => {
    const result = runFixture("website/logo.png", Buffer.from([0, 1, 2, 3]), { archiveTree: true });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /PASS: bounded archive tree/);
  });

  it("allows the reviewed product runtime source namespace in archive mode", () => {
    const result = runFixture("src/core/runtime/worker.ts", "export const worker = true;", { archiveTree: true });
    assert.equal(result.status, 0);
  });

  it("fails an aggregate archive bound before reading eligible content", () => {
    const result = runFixture("website/readme.md", "safe public text", {
      archiveTree: true,
      instrumentContentReads: true,
      setup(root) {
        const oversized = path.join(root, "assets", "oversized.bin");
        fs.mkdirSync(path.dirname(oversized), { recursive: true });
        const descriptor = fs.openSync(oversized, "w");
        try { fs.ftruncateSync(descriptor, 512 * 1024 * 1024 + 1); }
        finally { fs.closeSync(descriptor); }
      },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0);
    assert.match(output, /bounded limit is 536870912/);
    assert.doesNotMatch(output, /CONTENT_READ:/);
  });

  const rejected = [
    [".visual-review-profile/Default/Cookies", ".visual-review-profile", "browser profile tree"],
    [".playwright-mcp/session/state.json", ".playwright-mcp", "browser automation profile tree"],
    ["artifacts/screenshots/home.png", "artifacts", "generated artifact tree"],
    ["runtime/workspace.json", "runtime", "runtime state tree"],
    [".cache/output.bin", ".cache", "cache tree"],
    ["fixtures/Cookies", "fixtures/Cookies", "browser cookie database"],
    ["fixtures/Login Data", "fixtures/Login Data", "browser login database"],
    ["fixtures/History", "fixtures/History", "browser history database"],
    ["fixtures/Local State", "fixtures/Local State", "browser local-state file"],
    ["fixtures/Sessions/Session_1", "fixtures/Sessions", "browser session tree"],
    ["fixtures/workspace.sqlite", "fixtures/workspace.sqlite", "database file"],
    ["debug.log", "debug.log", "runtime log"],
    ["nested-release.zip", "nested-release.zip", "nested release archive"],
    ["website/.visual-review-profile/cache.bin", "website/.visual-review-profile", "browser profile tree", true],
    ["scripts/.playwright-mcp/state.json", "scripts/.playwright-mcp", "browser automation profile tree", true],
    ["website/runtime/session.json", "website/runtime", "runtime state tree", true],
    ["src/fixtures/artifacts/data.bin", "src/fixtures/artifacts", "generated artifact tree", true],
    ["website/.cache/cache.bin", "website/.cache", "cache tree", true],
    [".git/config", ".git", "version-control metadata", true],
    ["website/.git/config", "website/.git", "version-control metadata", true],
    ["node_modules/example/index.js", "node_modules", "installed dependency tree", true],
    ["website/node_modules/example/index.js", "website/node_modules", "installed dependency tree", true],
    ["website/.pnpm-store/index.json", "website/.pnpm-store", "package-manager cache tree", true],
  ];

  for (const [relativePath, reportedPath, reason, archiveTree = false] of rejected) {
    it(`rejects synthetic non-public path ${relativePath} without reading its contents`, () => {
      const result = runFixture(relativePath, Buffer.from([0, 255, 1, 254]), { archiveTree });
      const output = `${result.stdout}\n${result.stderr}`;
      assert.notEqual(result.status, 0);
      assert.match(output, new RegExp(reportedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(output, new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  }
});
