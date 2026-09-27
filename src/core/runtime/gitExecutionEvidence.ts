import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat } from "node:fs/promises";
import path from "node:path";
import type { FileDiffRecord } from "../types/evidence.js";

const execute = promisify(execFile);

/** Read the working tree, including staged changes, against the contracted base. */
export async function collectGitExecutionEvidence(worktreePath: string, baseSha: string): Promise<FileDiffRecord[]> {
  if (!/^[a-f0-9]{40,64}$/i.test(baseSha)) throw new Error("Evidence requires a full immutable Git base SHA.");
  const git = async (args: string[]) => (await execute("git", ["--no-pager", ...args], {
    cwd: worktreePath, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  })).stdout;
  await git(["cat-file", "-e", `${baseSha}^{commit}`]);
  const changed = (await git(["diff", "--no-renames", "--name-status", "-z", baseSha, "--"])).split("\0");
  const files: Array<{ filePath: string; status: FileDiffRecord["status"]; untracked?: boolean }> = [];
  for (let index = 0; index < changed.length - 1; index += 2) {
    const status = changed[index];
    files.push({ filePath: changed[index + 1], status: status === "A" ? "added" : status === "D" ? "deleted" : "modified" });
  }
  for (const filePath of (await git(["ls-files", "--others", "--exclude-standard", "-z"])).split("\0").filter(Boolean)) {
    files.push({ filePath, status: "added", untracked: true });
  }
  const evidence: FileDiffRecord[] = [];
  for (const file of files) {
    let patch: string;
    if (file.untracked) {
      const metadata = await lstat(path.join(worktreePath, file.filePath));
      if (!metadata.isFile() || metadata.nlink > 1) throw new Error(`Cannot safely collect new-file evidence: ${file.filePath}`);
      // Git's no-index mode returns 1 for a successfully generated difference.
      try {
        patch = await git(["diff", "--no-index", "--no-ext-diff", "--no-textconv", "--", "/dev/null", file.filePath]);
      } catch (error) {
        const result = error as { code?: number; stdout?: string };
        if (result.code !== 1 || typeof result.stdout !== "string") throw error;
        patch = result.stdout;
      }
    } else {
      patch = await git(["diff", "--no-renames", "--no-ext-diff", "--no-textconv", baseSha, "--", file.filePath]);
    }
    const lines = patch.split("\n");
    evidence.push({ filePath: file.filePath, status: file.status, patch,
      linesAdded: lines.filter(line => line.startsWith("+") && !line.startsWith("+++")).length,
      linesDeleted: lines.filter(line => line.startsWith("-") && !line.startsWith("---")).length });
  }
  return evidence;
}

/** Return the exact commit observed after a run, or fail closed if HEAD is not a commit. */
export async function readGitHeadSha(worktreePath: string): Promise<string> {
  const result = await execute("git", ["rev-parse", "HEAD"], {
    cwd: worktreePath, encoding: "utf8", maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  const sha = result.stdout.trim();
  if (!/^[a-f0-9]{40,64}$/i.test(sha)) throw new Error("Evidence requires a resolvable Git HEAD commit.");
  return sha;
}
