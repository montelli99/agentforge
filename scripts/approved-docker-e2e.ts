/**
 * Real local acceptance for the approved-command execution path.
 *
 * It creates a disposable Git repository and an actual managed worktree, runs
 * one human-approved command in AgentForge's network-disabled Docker sandbox,
 * then verifies observed output and evidence. Nothing in this check reads an
 * operator workspace, credential, or external account.
 */

import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DockerComputeProvider } from "../src/core/compute/dockerComputeProvider.js";
import { WorktreeManager } from "../src/core/worktree/worktreeManager.js";
import { ApprovedPlanProvider, executionContractDigest } from "../src/core/runtime/approvedPlanProvider.js";
import { ContractedDockerExecutionBackend, type ApprovedExecutionPlan } from "../src/core/runtime/contractedDockerExecutionBackend.js";
import type { Task } from "../src/core/types/task.js";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
}

async function main(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentforge-approved-docker-"));
  try {
    git(root, ["init", "--initial-branch=main"]);
    await writeFile(path.join(root, "README.md"), "# AgentForge Docker E2E\n", "utf8");
    git(root, ["add", "README.md"]);
    git(root, ["-c", "user.name=AgentForge E2E", "-c", "user.email=e2e@example.invalid", "commit", "-m", "fixture"]);
    const baseSha = git(root, ["rev-parse", "HEAD"]);

    const taskId = "approved-docker-e2e";
    const manager = new WorktreeManager(root);
    const worktree = await manager.createWorktree({ taskId, branchName: `worktree/${taskId}`, baseBranch: baseSha });
    // The portable node image runs as an unprivileged user. Make the disposable
    // fixture writable without changing the production Docker sandbox policy.
    await chmod(worktree.worktreePath, 0o777);
    const now = Date.now();
    const command = "node -e \"require('node:fs').mkdirSync('artifacts',{recursive:true});require('node:fs').writeFileSync('artifacts/verified.txt','agentforge-docker-e2e');require('node:fs').chmodSync('artifacts/verified.txt',0o666)\"";
    const task: Task = {
      id: taskId,
      projectId: "local-acceptance",
      title: "Prove approved Docker execution",
      description: "Disposable local acceptance fixture.",
      priority: "medium",
      status: "ready",
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      contract: {
        id: "contract-approved-docker-e2e",
        taskId,
        version: 1,
        repository: { baseBranch: "main", baseSha },
        workspace: { requireIsolatedWorktree: true },
        scope: { allowedPaths: ["artifacts/**"], protectedPaths: [".env"], maxFilesChanged: 1 },
        authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
        requiredChecks: [{ type: "custom_script", command, required: true }],
        completion: { requireEvidencePack: true, requireHumanApproval: true },
        createdAt: new Date(now).toISOString(),
      },
      worktree,
    };
    const plan: ApprovedExecutionPlan = {
      taskId,
      source: "human_approved",
      commands: [{ checkName: "custom_script", command, timeoutMs: 30_000 }],
    };
    const planProvider = new ApprovedPlanProvider(async requestedTaskId => requestedTaskId === taskId ? {
      plan,
      contractDigest: executionContractDigest(task),
      approvedBy: "local-e2e-operator",
      approvedAt: new Date(now - 60_000).toISOString(),
      expiresAt: new Date(now + 60 * 60 * 1_000).toISOString(),
    } : undefined);
    const backend = new ContractedDockerExecutionBackend(
      new DockerComputeProvider({ maxMemoryBytes: 256 * 1024 * 1024, cpuQuota: 1 }),
      planProvider,
      { agentId: "agentforge-e2e" },
    );
    const readiness = await backend.initialize();
    if (!readiness.ready) {
      if (process.env.CI === "true") {
        console.warn(`SKIP: approved Docker acceptance unavailable in this hosted runner: ${readiness.blockers.join(" ")}`);
        return;
      }
      throw new Error(`Approved Docker backend unavailable: ${readiness.blockers.join(" ")}`);
    }
    await backend.validateTask(task);
    const output = await backend.execute({ task, worktreePath: worktree.worktreePath, signal: new AbortController().signal });
    if (!output.testResults.every(result => result.passed)) {
      const detail = output.testResults.map(result => `${result.checkName}: ${result.stderr || result.stdout || `exit ${result.exitCode}`}`).join("\n");
      throw new Error(`A required Docker verification result did not pass.\n${detail}`);
    }
    const artifact = await readFile(path.join(worktree.worktreePath, "artifacts", "verified.txt"), "utf8");
    if (artifact !== "agentforge-docker-e2e") throw new Error("Sandbox artifact did not contain the expected value.");
    if (output.filesChanged.length !== 1 || output.filesChanged[0]?.filePath !== "artifacts/verified.txt") {
      throw new Error("Execution evidence did not report the expected constrained file change.");
    }
    if (output.artifacts.length !== 1 || output.artifacts[0]?.path !== "artifacts/verified.txt"
      || output.artifacts[0]?.sha256.length !== 64 || output.artifacts[0]?.sizeBytes !== artifact.length) {
      throw new Error("Execution evidence did not capture a tamper-evident record for the generated artifact.");
    }
    if (output.finalSha !== baseSha) throw new Error("Execution evidence reported an unexpected repository revision.");
    await manager.removeWorktree(worktree.worktreePath, true);
    console.log("PASS: approved plan, isolated worktree, network-disabled Docker execution, and observed evidence verified.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await main();
