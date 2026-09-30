/** Zero-provider, disposable execution of the development fixture's reference commands. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DockerComputeProvider } from "../../src/core/compute/dockerComputeProvider.js";
import { ApprovedPlanProvider, executionContractDigest } from "../../src/core/runtime/approvedPlanProvider.js";
import { ContractedDockerExecutionBackend } from "../../src/core/runtime/contractedDockerExecutionBackend.js";
import { TaskWorkerRuntime } from "../../src/core/runtime/taskWorkerRuntime.js";
import { WorkspaceStore } from "../../src/core/store/workspaceStore.js";
import { WorktreeManager } from "../../src/core/worktree/worktreeManager.js";
import { fullTrajectoryReadiness, type FullTrajectoryCase } from "./fullTrajectoryReadiness.js";

type Case = FullTrajectoryCase & { referenceCommand: string };
type Fixture = { id: string; split: string; measurement: string; families: Array<{ id: string; cases: Case[] }> };
const root = resolve(import.meta.dirname, "../..");
const fixtureBytes = await readFile(resolve(root, "research/tasks/full-trajectory-development-v2.json"));
const fixture = JSON.parse(fixtureBytes.toString("utf8")) as Fixture;
const allCases = fixture.families.flatMap(family => family.cases);
const issues = fullTrajectoryReadiness(allCases);
if (fixture.split !== "development" || fixture.measurement !== "reference-mechanics-only" || allCases.length !== 12 || issues.length) {
  throw new Error(`Development fixture is incomplete: ${issues.length} readiness issues`);
}
const selectedCaseId = process.argv[2];
const cases = selectedCaseId ? allCases.filter(item => item.id === selectedCaseId) : allCases;
if (cases.length === 0) throw new Error(`Unknown development case: ${selectedCaseId}`);
const docker = new DockerComputeProvider({ maxMemoryBytes: 256 * 1024 * 1024, cpuQuota: 1 });
const available = await docker.isAvailable();
if (!available.available) throw new Error(available.error || "Docker is unavailable");
const git = (cwd: string, args: string[]) => execFileSync("git", args,
  { cwd, encoding: "utf8", stdio: "pipe" }).trim();
const isSafe = (path: string) => /^[a-z0-9][a-z0-9_./-]*$/i.test(path) &&
  !path.split("/").includes("..") && !path.startsWith("/");
const results: Array<{ caseId: string; status: string; workerVerified: boolean;
  artifactChecks: number; forbiddenChecks: number; latencyMs: number; error?: string }> = [];

for (const item of cases) {
  const started = performance.now();
  const tempRoot = await mkdtemp(join(tmpdir(), "agentforge-reference-"));
  let manager: WorktreeManager | undefined;
  let worktreePath: string | undefined;
  const result = { caseId: item.id, status: "failed", workerVerified: false,
    artifactChecks: 0, forbiddenChecks: 0, latencyMs: 0, error: undefined as string | undefined };
  try {
    git(tempRoot, ["init", "--initial-branch=main"]);
    const sources = [...(item.input.setup ?? []), ...(item.input.events ?? [])];
    for (const source of sources) {
      const path = source.payload.path;
      const content = source.payload.content;
      if (source.kind !== "file" || typeof path !== "string" || typeof content !== "string" ||
          !isSafe(path) || path.startsWith("artifacts/")) throw new Error("Invalid source file");
      const destination = join(tempRoot, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
    await writeFile(join(tempRoot, "README.md"), "# Synthetic reference fixture\n");
    git(tempRoot, ["add", "."]);
    git(tempRoot, ["-c", "user.name=AgentForge Fixture", "-c", "user.email=fixture@example.invalid",
      "commit", "-m", "fixture"]);
    const baseSha = git(tempRoot, ["rev-parse", "HEAD"]);
    const taskId = item.id;
    const store = new WorkspaceStore(join(tempRoot, "workspace.json"));
    const task = store.createTask({ id: taskId, title: item.input.task,
      description: "Development-only reference command; no model call.", priority: "medium", status: "ready",
      contract: { id: `contract-${taskId}`, taskId, version: 1,
        repository: { baseBranch: "main", baseSha }, workspace: { requireIsolatedWorktree: true },
        scope: { allowedPaths: ["artifacts/**", ...item.expected.observableChecks!.map(check => check.target)], protectedPaths: [".env", ...item.expected.forbiddenEffects!.map(effect => effect.target)],
          maxFilesChanged: item.expected.observableChecks!.length },
        authority: { externalMessage: false, productionWrite: false, deployment: false,
          forcePush: false, deleteFiles: false, networkOutbound: false },
        requiredChecks: [{ type: "custom_script", command: item.referenceCommand, required: true,
          timeoutMs: item.limits!.timeoutMs }],
        completion: { requireEvidencePack: true, requireHumanApproval: false,
          requiredArtifacts: item.expected.observableChecks!.filter(check => check.target.startsWith("artifacts/"))
            .map(check => ({ path: check.target })) },
        createdAt: new Date().toISOString() } });
    manager = new WorktreeManager(tempRoot);
    const worktree = await manager.createWorktree({ taskId, branchName: `worktree/${taskId}`, baseBranch: baseSha });
    worktreePath = worktree.worktreePath;
    await chmod(worktreePath, 0o777);
    store.updateTask(taskId, { worktree });
    const plans = new ApprovedPlanProvider(async id => store.getTask(id)?.approvedExecutionPlan);
    const backend = new ContractedDockerExecutionBackend(docker, plans, { agentId: "reference-fixture" });
    const readiness = await backend.initialize();
    if (!readiness.ready) throw new Error(readiness.blockers.join(" "));
    const now = Date.now();
    store.updateTask(taskId, { approvedExecutionPlan: {
      plan: { taskId, source: "human_approved", commands: [{ checkName: "custom_script",
        command: item.referenceCommand, timeoutMs: item.limits!.timeoutMs }] },
      contractDigest: executionContractDigest(task), approvedBy: "preauthorized-synthetic-reference",
      approvedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 600_000).toISOString() } });
    const outcome = await new TaskWorkerRuntime(store, backend,
      { repoRoot: tempRoot, autoStart: false, automaticDispatch: false }).executeTask(taskId);
    result.workerVerified = outcome.status === "completed" && outcome.evidencePack?.verifiedPassed === true;
    if (!result.workerVerified) throw new Error(outcome.error || `Worker status: ${outcome.status}`);
    for (const check of item.expected.observableChecks ?? []) {
      if (check.kind !== "file" || !isSafe(check.target)) throw new Error("Invalid artifact check");
      const actual = await readFile(join(worktreePath, check.target), "utf8");
      if (actual !== check.expected) throw new Error(`Artifact mismatch: ${check.target}`);
      result.artifactChecks += 1;
    }
    for (const effect of item.expected.forbiddenEffects ?? []) {
      if (effect.kind !== "file" || !isSafe(effect.target)) throw new Error("Invalid forbidden-effect path");
      try { await stat(join(worktreePath, effect.target)); throw new Error(`Forbidden effect observed: ${effect.target}`); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      result.forbiddenChecks += 1;
    }
    result.status = "completed";
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    result.latencyMs = Math.round(performance.now() - started);
    if (manager && worktreePath) await manager.removeWorktree(worktreePath, true);
    await rm(tempRoot, { recursive: true, force: true });
    results.push(result);
  }
}
const summary = { schemaVersion: 1, kind: "full-trajectory-reference-mechanics",
  fixtureId: fixture.id, fixtureSha256: createHash("sha256").update(fixtureBytes).digest("hex"),
  modelCalls: 0, externalSpendUsd: 0, attempted: results.length,
  completed: results.filter(item => item.status === "completed").length, results,
  limitation: "Evaluator-authored reference commands; no model generation, live event timing, or matched study inference." };
const outputName = selectedCaseId ? `full-trajectory-development-v2-reference-${selectedCaseId}.json` :
  "full-trajectory-development-v2-reference.json";
await writeFile(resolve(root, "research/results", outputName), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ attempted: summary.attempted, completed: summary.completed,
  failed: results.filter(item => item.status !== "completed") }));
if (summary.completed !== cases.length) process.exitCode = 1;
