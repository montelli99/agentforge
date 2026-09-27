import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readRuntimeSecret } from "./runtimeSecretFile.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("readRuntimeSecret", () => {
  it("uses a private regular file outside a Git worktree", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-secret-"));
    temporaryDirectories.push(directory);
    const secretPath = path.join(directory, "channel-token");
    fs.writeFileSync(secretPath, "  private-runtime-value  ", "utf8");
    expect(readRuntimeSecret(undefined, secretPath)).toBe("private-runtime-value");
  });

  it("rejects a configured path inside the repository while allowing an explicit environment value", () => {
    expect(readRuntimeSecret(undefined, path.join(process.cwd(), ".agentforge-channel-token"))).toBeUndefined();
    expect(readRuntimeSecret(" ephemeral-value ", path.join(process.cwd(), ".agentforge-channel-token"))).toBe("ephemeral-value");
  });
});
