import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { publicReleaseAllowlist } from "./public-release-stage.mjs";

const linkGateSource = fileURLToPath(new URL("./public-link-acceptance.mjs", import.meta.url));
const exporterSource = fileURLToPath(new URL("./public-release-stage.mjs", import.meta.url));
const directoryEntries = new Set([".github", "src", "scripts", "website"]);

function runFixture(readme, setup) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-public-links-"));
  try {
    for (const relative of publicReleaseAllowlist) {
      const target = path.join(root, ...relative.split("/"));
      if (directoryEntries.has(relative)) fs.mkdirSync(target, { recursive: true });
      else {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, "");
      }
    }
    fs.copyFileSync(linkGateSource, path.join(root, "scripts", "public-link-acceptance.mjs"));
    fs.copyFileSync(exporterSource, path.join(root, "scripts", "public-release-stage.mjs"));
    fs.writeFileSync(path.join(root, "README.md"), readme);
    setup?.(root);
    return spawnSync(process.execPath, [path.join(root, "scripts", "public-link-acceptance.mjs")], {
      cwd: root,
      encoding: "utf8",
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("public link export membership", () => {
  it("accepts an allowlisted target with a fragment", () => {
    const result = runFixture("[Chat setup](docs/CHAT_SETUP.md#configure-a-provider)\n");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PASS:/);
  });

  it("rejects an existing target excluded from the exporter allowlist", () => {
    const result = runFixture("[Private research](docs/research/private.md#owner-only)\n", root => {
      const excluded = path.join(root, "docs", "research", "private.md");
      fs.mkdirSync(path.dirname(excluded), { recursive: true });
      fs.writeFileSync(excluded, "private fixture\n");
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0);
    assert.match(output, /docs\/research\/private\.md is excluded from the public export/);
  });
});
