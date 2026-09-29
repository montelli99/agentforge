import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const npmrc = path.join(os.tmpdir(), `agentforge-npmrc-${process.pid}`);
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (args) => execFileSync(npmBin, args, { cwd: root, encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });

try {
  fs.writeFileSync(npmrc, "", "utf8");
  const pack = JSON.parse(run(["pack", "--dry-run", "--json", `--userconfig=${npmrc}`]))[0];
  let registryState = "unpublished-or-inaccessible";
  try { run(["view", pkg.name, "version", `--userconfig=${npmrc}`]); registryState = "published"; } catch { /* expected before first publication */ }
  const archiveFingerprint = crypto.createHash("sha256").update(JSON.stringify({ id: pack.id, integrity: pack.integrity, files: pack.files.map(({ path: filePath, size }) => ({ path: filePath, size })) })).digest("hex");
  console.log(JSON.stringify({ passed: true, package: pack.id, archive: { filename: pack.filename, size: pack.size, unpackedSize: pack.unpackedSize, integrity: pack.integrity, fingerprint: archiveFingerprint, files: pack.entryCount }, registryState, publishPerformed: false }, null, 2));
} finally {
  fs.rmSync(npmrc, { force: true });
}
