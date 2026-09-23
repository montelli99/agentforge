/**
 * Worktree Isolation Manager
 * Section 26: Project / Repository / Worktree Model
 * Manages isolated Git worktrees for concurrent task execution.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { TaskWorktreeInfo } from "../types/task.js";

export class WorktreeManager {
  constructor(private readonly repoRoot: string) {}

  /** Create a real Git worktree or fail; a directory is never presented as isolation. */
  async createWorktree(params: {
    taskId: string;
    branchName: string;
    baseBranch?: string;
  }): Promise<TaskWorktreeInfo> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(params.taskId)) {
      throw new Error("Task ID contains characters that are not safe for a worktree path.");
    }
    const worktreeDir = path.join(this.repoRoot, ".worktrees", `task-${params.taskId}`);
    const branchName = params.branchName || `task/${params.taskId}`;
    const baseBranch = params.baseBranch || "HEAD";
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branchName) || branchName.includes("..")) {
      throw new Error("Branch name is invalid.");
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(baseBranch) || baseBranch.includes("..")) {
      throw new Error("Base revision is invalid.");
    }

    const parentDir = path.dirname(worktreeDir);
    fs.mkdirSync(parentDir, { recursive: true });
    if (fs.existsSync(worktreeDir)) {
      throw new Error(`Worktree path already exists: ${worktreeDir}`);
    }

    const baseSha = execFileSync("git", ["rev-parse", "--verify", `${baseBranch}^{commit}`], {
      cwd: this.repoRoot,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    execFileSync("git", ["worktree", "add", "-b", branchName, worktreeDir, baseSha], {
      cwd: this.repoRoot,
      stdio: "pipe",
    });

    return {
      worktreePath: worktreeDir,
      branchName,
      baseSha,
      isIsolated: true,
      createdAt: new Date().toISOString(),
    };
  }

  /** Remove only a Git worktree contained in this repository's managed directory. */
  async removeWorktree(worktreeDir: string, force = false): Promise<void> {
    const managedRoot = path.resolve(this.repoRoot, ".worktrees") + path.sep;
    const resolvedWorktreeDir = path.resolve(worktreeDir);
    if (!resolvedWorktreeDir.startsWith(managedRoot)) {
      throw new Error("Refusing to remove a path outside this repository's .worktrees directory.");
    }
    execFileSync("git", ["worktree", "remove", ...(force ? ["--force"] : []), resolvedWorktreeDir], {
      cwd: this.repoRoot,
      stdio: "pipe",
    });
  }
}
