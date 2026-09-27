import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectExecutionArtifacts } from "./executionArtifacts.js";

const temporaryDirectories: string[] = [];

function createWorkspace(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-artifacts-"));
  temporaryDirectories.push(directory);
  fs.mkdirSync(path.join(directory, "artifacts"));
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("execution artifact evidence", () => {
  it("records changed artifacts with an observed content hash", async () => {
    const workspace = createWorkspace();
    const content = "verified result\n";
    fs.writeFileSync(path.join(workspace, "artifacts", "result.txt"), content);

    await expect(collectExecutionArtifacts(workspace, [{
      filePath: "artifacts/result.txt", status: "added", linesAdded: 1, linesDeleted: 0,
    }])).resolves.toEqual([{
      name: "result.txt", path: "artifacts/result.txt",
      sha256: crypto.createHash("sha256").update(content).digest("hex"),
      sizeBytes: Buffer.byteLength(content), mimeType: "text/plain",
    }]);
  });

  it("does not treat non-artifact changes as execution deliverables", async () => {
    const workspace = createWorkspace();
    fs.writeFileSync(path.join(workspace, "README.md"), "not a generated artifact\n");
    await expect(collectExecutionArtifacts(workspace, [{
      filePath: "README.md", status: "modified", linesAdded: 1, linesDeleted: 0,
    }])).resolves.toEqual([]);
  });
});
