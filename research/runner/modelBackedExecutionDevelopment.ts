/** One resumable, synthetic model-plan -> governed worker development trajectory. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { DockerComputeProvider } from "../../src/core/compute/dockerComputeProvider.js";
import { ApprovedPlanProvider, executionContractDigest } from "../../src/core/runtime/approvedPlanProvider.js";
import { ContractedDockerExecutionBackend } from "../../src/core/runtime/contractedDockerExecutionBackend.js";
import { ModelPlanDraftProvider } from "../../src/core/runtime/modelPlanDraftProvider.js";
import { TaskWorkerRuntime } from "../../src/core/runtime/taskWorkerRuntime.js";
import { WorkspaceStore } from "../../src/core/store/workspaceStore.js";
import { WorktreeManager } from "../../src/core/worktree/worktreeManager.js";
import type { ModelRequestOptions, ModelResponse } from "../../src/core/providers/model.js";
import { MiMoModelProvider } from "../../src/providers/models/mimoModel.js";

const projectRoot = resolve(import.meta.dirname, "../..");
const privateDir = resolve(process.env.AGENTFORGE_RESEARCH_PRIVATE_DIR ||
  resolve(process.env.LOCALAPPDATA || homedir(), "AgentForge", "research-private"));
if (privateDir.toLowerCase() === projectRoot.toLowerCase() ||
    privateDir.toLowerCase().startsWith(`${projectRoot.toLowerCase()}${sep}`)) {
  throw new Error("Raw research evidence must stay outside the public repository");
}
const runId = "model-backed-execution-development-v5-mimo-v2.5-pro";
const rawPath = join(privateDir, `${runId}.json`);
const summaryPath = resolve(projectRoot, `research/results/${runId}-summary.json`);
try {
  await readFile(rawPath);
  throw new Error(`Existing trajectory checkpoint requires review: ${runId}`);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const docker = new DockerComputeProvider({ maxMemoryBytes: 256 * 1024 * 1024, cpuQuota: 1 });
const availability = await docker.isAvailable();
if (!availability.available) throw new Error(`No model call made: ${availability.error || "Docker unavailable"}`);
const model = new MiMoModelProvider();
if (!(await model.isAvailable())) throw new Error("No model call made: MiMo route unavailable");
let usage: ModelResponse["usage"] | undefined;
class MeteredMiMo extends MiMoModelProvider {
  override async generate(options: ModelRequestOptions): Promise<ModelResponse> {
    const response = await super.generate({ ...options, maxTokens: 512 });
    usage = response.usage;
    raw.usage = response.usage;
    raw.finishReason = response.finishReason;
    raw.modelOutput = response.content.slice(0, 4000);
    await saveRaw();
    return response;
  }
}
const git = (cwd: string, args: string[]) => execFileSync("git", args,
  { cwd, encoding: "utf8", stdio: "pipe" }).trim();
const tempRoot = await mkdtemp(join(tmpdir(), "agentforge-model-execution-"));
let manager: WorktreeManager | undefined;
let worktreePath: string | undefined;
const started = performance.now();
const raw: Record<string, unknown> = { schemaVersion: 1, runId,
  model: "mimo-v2.5-pro", status: "started", startedAt: new Date().toISOString(),
  source: "synthetic-disposable-development", providerCalls: 0, costUsd: "unknown" };
async function saveRaw(): Promise<void> {
  await mkdir(privateDir, { recursive: true });
  const pending = `${rawPath}.tmp`;
  await writeFile(pending, JSON.stringify(raw, null, 2));
  await rename(pending, rawPath);
}
try {
  git(tempRoot, ["init", "--initial-branch=main"]);
  await writeFile(join(tempRoot, "README.md"), "# Synthetic development fixture\n");
  git(tempRoot, ["add", "README.md"]);
  git(tempRoot, ["-c", "user.name=AgentForge Fixture", "-c", "user.email=fixture@example.invalid",
    "commit", "-m", "fixture"]);
  const baseSha = git(tempRoot, ["rev-parse", "HEAD"]);
  const taskId = "model-development-task";
  const command = "node -e \"require('node:fs').mkdirSync('artifacts',{recursive:true});require('node:fs').writeFileSync('artifacts/verified.txt','agentforge-model-development');require('node:fs').chmodSync('artifacts',0o777)\"";
  const store = new WorkspaceStore(join(tempRoot, "workspace.json"));
  const task = store.createTask({ id: taskId, title: "Write and verify a synthetic fixture artifact",
    description: "Disposable local development acceptance only.", priority: "medium", status: "ready",
    contract: { id: `contract-${taskId}`, taskId, version: 1,
      repository: { baseBranch: "main", baseSha }, workspace: { requireIsolatedWorktree: true },
      scope: { allowedPaths: ["artifacts/**"], protectedPaths: [".env"], maxFilesChanged: 1 },
      authority: { externalMessage: false, productionWrite: false, deployment: false,
        forcePush: false, deleteFiles: false, networkOutbound: false },
      requiredChecks: [{ type: "custom_script", command, required: true }],
      completion: { requireEvidencePack: true, requireHumanApproval: false },
      createdAt: new Date().toISOString() } });
  manager = new WorktreeManager(tempRoot);
  const worktree = await manager.createWorktree({ taskId, branchName: `worktree/${taskId}`, baseBranch: baseSha });
  worktreePath = worktree.worktreePath;
  await chmod(worktreePath, 0o777);
  store.updateTask(taskId, { worktree });
  const plans = new ApprovedPlanProvider(async id => store.getTask(id)?.approvedExecutionPlan);
  const backend = new ContractedDockerExecutionBackend(docker, plans, { agentId: "development-fixture" });
  const readiness = await backend.initialize();
  if (!readiness.ready) throw new Error(`No model call made: ${readiness.blockers.join(" ")}`);
  await saveRaw(); // A rerun must not duplicate the charged request.
  raw.providerCalls = 1;
  await saveRaw();
  const draft = await new ModelPlanDraftProvider(new MeteredMiMo(), "mimo-v2.5-pro")
    .draft(task, AbortSignal.timeout(60_000));
  raw.usage = usage;
  raw.draft = draft;
  await saveRaw();
  if (draft.commands.length !== 1 || draft.commands[0]?.checkName !== "custom_script" ||
      draft.commands[0].command !== command || (draft.commands[0].timeoutMs ?? 30_000) > 30_000) {
    throw new Error("Model draft did not exactly match the preauthorized synthetic command; no execution occurred");
  }
  // The owner authorized bounded tests; only the predeclared command is accepted.
  const now = Date.now();
  store.updateTask(taskId, { approvedExecutionPlan: {
    plan: { ...draft, source: "human_approved" }, contractDigest: executionContractDigest(task),
    approvedBy: "owner-authorized-disposable-test", approvedAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 600_000).toISOString() } });
  const result = await new TaskWorkerRuntime(store, backend,
    { repoRoot: tempRoot, autoStart: false, automaticDispatch: false }).executeTask(taskId);
  const artifact = await readFile(join(worktreePath, "artifacts", "verified.txt"), "utf8");
  if (result.status !== "completed" || !result.evidencePack?.verifiedPassed ||
      artifact !== "agentforge-model-development") throw new Error("Worker evidence did not prove completion");
  raw.status = "completed";
  raw.endedAt = new Date().toISOString();
  raw.latencyMs = Math.round(performance.now() - started);
  raw.evidence = { verifiedPassed: true, checkCount: result.evidencePack.testResults.length,
    artifactSha256: createHash("sha256").update(artifact).digest("hex"),
    fileCount: result.evidencePack.diffStat.filesCount };
  await saveRaw();
  const digest = createHash("sha256").update(await readFile(rawPath)).digest("hex");
  const summary = { runId, split: "development", model: "mimo-v2.5-pro", condition: "AF",
    status: "completed", providerCalls: 1, usage, costUsd: "unknown", rawSha256: digest,
    latencyMs: raw.latencyMs, evidence: raw.evidence,
    scope: "single synthetic model-plan and governed-worker acceptance; not a matched study result" };
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (error) {
  if (raw.status === "started") {
    raw.status = "failed";
    raw.error = error instanceof Error ? error.message : String(error);
    raw.endedAt = new Date().toISOString();
    await saveRaw();
  }
  throw error;
} finally {
  if (manager && worktreePath) await manager.removeWorktree(worktreePath, true);
  await rm(tempRoot, { recursive: true, force: true });
}
