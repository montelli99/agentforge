import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WorktreeManager } from "./worktreeManager.js";

const temporaryRepositories: string[] = [];

function createRepository(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-worktree-test-"));
  temporaryRepositories.push(root);
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "AgentForge Test"], { cwd: root, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "agentforge-test@example.invalid"], { cwd: root, stdio: "pipe" });
  fs.writeFileSync(path.join(root, "README.md"), "worktree test\n");
  execFileSync("git", ["add", "README.md"], { cwd: root, stdio: "pipe" });
  execFileSync("git", ["commit", "-m", "test base"], { cwd: root, stdio: "pipe" });
  return root;
}

afterEach(() => {
  for (const root of temporaryRepositories.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("WorktreeManager", () => {
  it("validates resumed checkout identity while preserving unfinished edits", async () => {
    const root = createRepository();
    const manager = new WorktreeManager(root);
    const info = await manager.createWorktree({ taskId: "resume", branchName: "task/resume" });
    fs.writeFileSync(path.join(info.worktreePath, "README.md"), "unfinished work\n");
    expect(manager.validateWorktree(info, "resume", info.baseSha)).toBe(info.worktreePath);
    expect(() => manager.validateWorktree({ ...info, worktreePath: root }, "resume", info.baseSha)).toThrow();
    expect(() => manager.validateWorktree(info, "other-task", info.baseSha)).toThrow();
    expect(() => manager.validateWorktree(info, "resume", "0".repeat(40))).toThrow();
    execFileSync("git", ["checkout", "-b", "unexpected"], { cwd: info.worktreePath, stdio: "pipe" });
    expect(() => manager.validateWorktree(info, "resume", info.baseSha)).toThrow("branch changed");
    expect(fs.readFileSync(path.join(info.worktreePath, "README.md"), "utf-8")).toBe("unfinished work\n");
  });

  it("creates and removes a real Git worktree", async () => {
    const root = createRepository();
    const manager = new WorktreeManager(root);
    const result = await manager.createWorktree({ taskId: "task-1", branchName: "task/task-1" });

    expect(result.isIsolated).toBe(true);
    expect(fs.statSync(result.worktreePath).isDirectory()).toBe(true);
    expect(execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: result.worktreePath,
      encoding: "utf-8",
    }).trim()).toBe(path.resolve(result.worktreePath).replaceAll("\\", "/"));

    await manager.removeWorktree(result.worktreePath);
    expect(fs.existsSync(result.worktreePath)).toBe(false);
  });

  it("does not fall back to a directory when Git cannot resolve the requested base", async () => {
    const root = createRepository();
    const manager = new WorktreeManager(root);
    const expectedPath = path.join(root, ".worktrees", "task-task-2");

    await expect(manager.createWorktree({
      taskId: "task-2",
      branchName: "task/task-2",
      baseBranch: "missing-revision",
    })).rejects.toThrow();
    expect(fs.existsSync(expectedPath)).toBe(false);
  });

  it("refuses to remove a path outside the managed worktrees directory", async () => {
    const root = createRepository();
    const manager = new WorktreeManager(root);

    await expect(manager.removeWorktree(path.join(root, "README.md"))).rejects.toThrow("outside this repository");
    expect(fs.existsSync(path.join(root, "README.md"))).toBe(true);
  });
});
