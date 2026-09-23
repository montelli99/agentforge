import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repositoryRoot, "dist", "cli", "bin.js");
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-package-cli-"));

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: tempDirectory,
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  return result;
}

function storedZip(fileNames) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const fileName of fileNames) {
    const name = Buffer.from(fileName, "utf8");
    const data = Buffer.from("acceptance fixture", "utf8");
    let checksum = 0xffffffff;
    for (const byte of data) {
      checksum ^= byte;
      for (let bit = 0; bit < 8; bit++) checksum = checksum & 1 ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1;
    }
    checksum = (checksum ^ 0xffffffff) >>> 0;
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    local.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(offset, 42);
    central.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  }
  const centralDirectory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(fileNames.length, 8);
  end.writeUInt16LE(fileNames.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralDirectory, end]);
}

try {
  assert.ok(fs.existsSync(cliPath), "build the CLI before running package acceptance");

  const initialized = runCli(["pack", "init", "acceptance-starter"]);
  assert.equal(initialized.status, 0, initialized.stderr);
  const packageDirectory = path.join(tempDirectory, "acceptance-starter");
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDirectory, "manifest.json"), "utf8"));
  assert.equal(manifest.license, "UNLICENSED", "new package must not claim an owner-selected license");
  assert.equal(manifest.permissions.filesystem.workspace.read, false);
  assert.equal(manifest.permissions.filesystem.workspace.write, false);
  assert.equal(manifest.permissions.git.read, false);
  assert.equal(manifest.permissions.network.outbound, false);
  assert.deepEqual(manifest.files, ["manifest.json", "README.md"]);

  const validated = runCli(["pack", "validate", packageDirectory]);
  assert.equal(validated.status, 0, validated.stderr);
  assert.match(validated.stdout, /Validation: PASSED/);

  const archivePath = path.join(tempDirectory, "acceptance-starter.zip");
  fs.writeFileSync(archivePath, storedZip(manifest.files));
  const inspected = runCli(["pack", "inspect-archive", packageDirectory, archivePath]);
  assert.equal(inspected.status, 0, inspected.stderr);
  assert.match(inspected.stdout, /Archive inspection: PASSED/, inspected.stderr);

  fs.writeFileSync(archivePath, storedZip(["manifest.json", "../escape.txt"]));
  const rejectedArchive = runCli(["pack", "inspect-archive", packageDirectory, archivePath]);
  assert.equal(rejectedArchive.status, 0, rejectedArchive.stderr);
  assert.match(rejectedArchive.stdout, /Archive inspection: FAILED/);
  assert.match(rejectedArchive.stderr, /Unsafe ZIP entry path|traversal/i);

  const packageTest = runCli(["pack", "test", packageDirectory]);
  assert.equal(packageTest.status, 0, packageTest.stderr);
  assert.match(packageTest.stdout, /not implemented yet; no tests were run/i);

  const traversal = runCli(["pack", "init", "..\\outside-package"]);
  assert.notEqual(traversal.status, 0, "unsafe package names must fail");
  assert.equal(fs.existsSync(path.resolve(tempDirectory, "..", "outside-package")), false);

  console.log("PASS: CLI initializes a least-privilege unlicensed package, validates manifests and ZIP archives, rejects archive traversal, reports package tests honestly, and rejects unsafe package names.");
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}
