import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentForgeCli } from "./agentforge-cli.js";

const temporaryDirectories: string[] = [];

function makeTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-cli-boundary-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  while (temporaryDirectories.length) {
    fs.rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("AgentForge CLI package boundaries", () => {
  it("refuses a declared tests directory that is a junction outside the package", () => {
    const root = makeTemporaryDirectory();
    const outside = path.join(root, "outside");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "secret.test.ts"), "outside package", "utf8");

    const cli = new AgentForgeCli();
    const created = cli.packInit(root, "safe-package");
    const testsPath = path.join(created.createdPath, "tests");
    fs.rmSync(testsPath, { recursive: true, force: true });
    fs.symlinkSync(outside, testsPath, process.platform === "win32" ? "junction" : "dir");

    const result = cli.packTest(created.createdPath);

    expect(result).toEqual({
      passed: false,
      testCount: 0,
      output: "Package tests path must be a real, non-symlink directory inside the package directory.",
    });
  });
});
