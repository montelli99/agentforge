import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CanonicalSpace } from "../core/types/workspace.js";
import { connectProjectFolder, listProjectFiles, ProjectFileError, readProjectFile } from "./projectFiles.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<CanonicalSpace> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agentforge-project-files-"));
  temporaryDirectories.push(root);
  await fs.writeFile(path.join(root, "README.md"), "safe preview\n", "utf8");
  await fs.writeFile(path.join(root, ".env"), "token=sk-hiddenfixture123456789\n", "utf8");
  await fs.mkdir(path.join(root, "nested"));
  await fs.writeFile(path.join(root, "nested", "note.txt"), "nested content\n", "utf8");
  const repositoryAccess = await connectProjectFolder(root, "test-owner");
  const timestamp = new Date().toISOString();
  return { id: "space-test", workspaceId: "ws-test", name: "Test project", provider: "agentforge", archived: false, repositoryAccess, createdAt: timestamp, updatedAt: timestamp };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })));
});

describe("project file boundary", () => {
  it("shows approved regular files while excluding hidden credential-like files", async () => {
    const project = await createProject();
    const listed = await listProjectFiles(project);
    expect(listed.entries.map(entry => entry.name)).toEqual(["nested", "README.md"]);
    await expect(readProjectFile(project, "README.md")).resolves.toMatchObject({ content: "safe preview\n" });
  });

  it("rejects traversal, absolute paths, hidden files, and oversized previews", async () => {
    const project = await createProject();
    const root = project.repositoryAccess!.rootPath;
    await fs.writeFile(path.join(root, "too-large.txt"), "x".repeat(256 * 1024 + 1), "utf8");

    for (const candidate of ["../outside.txt", "nested/../../outside.txt", ".env", "C:/outside.txt"]) {
      await expect(readProjectFile(project, candidate)).rejects.toBeInstanceOf(ProjectFileError);
    }
    await expect(readProjectFile(project, "too-large.txt")).rejects.toMatchObject({ status: 413 });
  });

  it("refuses home and drive-root connections", async () => {
    await expect(connectProjectFolder(os.homedir(), "test-owner")).rejects.toMatchObject({ status: 400 });
    await expect(connectProjectFolder(path.parse(os.homedir()).root, "test-owner")).rejects.toMatchObject({ status: 400 });
  });
});
