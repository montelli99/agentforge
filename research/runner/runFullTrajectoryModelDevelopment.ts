/** One bounded, model-backed development trajectory; never a held-out study run. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { DockerComputeProvider } from "../../src/core/compute/dockerComputeProvider.js";
import type { ModelRequestOptions, ModelResponse } from "../../src/core/providers/model.js";
import type { ApprovedExecutionPlan, ExecutionPlanProvider } from "../../src/core/runtime/contractedDockerExecutionBackend.js";
import { ContractedDockerExecutionBackend } from "../../src/core/runtime/contractedDockerExecutionBackend.js";
import { ModelPlanDraftProvider } from "../../src/core/runtime/modelPlanDraftProvider.js";
import { TaskWorkerRuntime } from "../../src/core/runtime/taskWorkerRuntime.js";
import { WorkspaceStore } from "../../src/core/store/workspaceStore.js";
import { WorktreeManager } from "../../src/core/worktree/worktreeManager.js";
import { MiMoModelProvider } from "../../src/providers/models/mimoModel.js";
import { fullTrajectoryReadiness, type FullTrajectoryCase } from "./fullTrajectoryReadiness.js";
import { trajectoryInputForModel } from "./trajectoryInput.js";
import { scoreTrajectoryOutcome } from "./trajectoryOutcome.js";

type Case = FullTrajectoryCase & { referenceCommand?: string };
type Fixture = { id: string; split: string; measurement: string; families: Array<{ cases: Case[] }> };
const root = resolve(import.meta.dirname, "../..");
const privateDir = resolve(process.env.AGENTFORGE_RESEARCH_PRIVATE_DIR ||
  resolve(process.env.LOCALAPPDATA || homedir(), "AgentForge", "research-private"));
if (privateDir.toLowerCase() === root.toLowerCase() ||
    privateDir.toLowerCase().startsWith(`${root.toLowerCase()}${sep}`)) {
  throw new Error("Raw trajectories must remain outside the public repository");
}
const caseId = process.argv[2];
if (!caseId || !/^full-[a-z0-9-]+$/.test(caseId)) throw new Error("Pass one explicit development case ID");
const fixtureBytes = await readFile(resolve(root, "research/tasks/full-trajectory-development-v2.json"));
const fixtureHash = createHash("sha256").update(fixtureBytes).digest("hex");
const fixture = JSON.parse(fixtureBytes.toString("utf8")) as Fixture;
if (fixture.split !== "development" || fixture.measurement !== "reference-mechanics-only") {
  throw new Error("Wrong fixture split or version");
}
const item = fixture.families.flatMap(family => family.cases).find(candidate => candidate.id === caseId);
if (!item || fullTrajectoryReadiness([item]).length) throw new Error("Case is absent or incomplete");
const baseRawId = `full-trajectory-model-development-${fixtureHash.slice(0, 12)}-${caseId}-mimo-v2.5-pro`;
let rawId = baseRawId;
let rawPath = join(privateDir, `${rawId}.json`);
for (let attempt = 0; attempt < 10; attempt += 1) {
  try {
    const prior = JSON.parse(await readFile(rawPath, "utf8")) as { status?: string; providerCalls?: number };
    // Preserve every checkpoint. Only a failed preflight with zero calls may be retried.
    if (prior.status !== "failed" || prior.providerCalls !== 0) {
      throw new Error(`Existing checkpoint requires review: ${rawId}`);
    }
    rawId = `${baseRawId}-retry-${attempt + 1}`;
    rawPath = join(privateDir, `${rawId}.json`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
    throw error;
  }
  if (attempt === 9) throw new Error("Too many failed preflight retries");
}
const docker = new DockerComputeProvider({ maxMemoryBytes: 256 * 1024 * 1024, cpuQuota: 1 });
const available = await docker.isAvailable();
if (!available.available) throw new Error(`No model call made: ${available.error || "Docker unavailable"}`);
const model = new MiMoModelProvider();
if (!(await model.isAvailable())) throw new Error("No model call made: approved MiMo route unavailable");
const raw: Record<string, unknown> = { schemaVersion: 1, rawId, caseId, fixtureHash,
  status: "started", model: "mimo-v2.5-pro", providerCalls: 0,
  startedAt: new Date().toISOString(), costUsd: "unknown" };
async function saveRaw(): Promise<void> {
  await mkdir(privateDir, { recursive: true });
  const pending = `${rawPath}.tmp`;
  await writeFile(pending, JSON.stringify(raw, null, 2));
  await rename(pending, rawPath);
}
class MeteredMiMo extends MiMoModelProvider {
  override async generate(options: ModelRequestOptions): Promise<ModelResponse> {
    const response = await super.generate({ ...options, maxTokens: 1024 });
    raw.usage = response.usage;
    raw.finishReason = response.finishReason;
    raw.modelOutput = response.content.slice(0, 8000);
    await saveRaw();
    return response;
  }
}
const git = (cwd: string, args: string[]) => execFileSync("git", args,
  { cwd, encoding: "utf8", stdio: "pipe" }).trim();
const safePath = (path: string) => /^[a-z0-9][a-z0-9_./-]*$/i.test(path) &&
  !path.split("/").includes("..") && !path.startsWith("/");
const tempRoot = await mkdtemp(join(tmpdir(), "agentforge-model-trajectory-"));
let manager: WorktreeManager | undefined;
let worktreePath: string | undefined;
const started = performance.now();
let stage: "setup" | "model" | "execution" | "scoring" = "setup";
try {
  git(tempRoot, ["init", "--initial-branch=main"]);
  for (const source of [...item.input.setup!, ...item.input.events!]) {
    const path = source.payload.path;
    const content = source.payload.content;
    if (source.kind !== "file" || typeof path !== "string" || typeof content !== "string" ||
        !safePath(path) || path.startsWith("artifacts/")) throw new Error("Invalid model-visible source file");
    await mkdir(dirname(join(tempRoot, path)), { recursive: true });
    await writeFile(join(tempRoot, path), content);
  }
  await writeFile(join(tempRoot, "README.md"), "# Disposable synthetic model trajectory\n");
  git(tempRoot, ["add", "."]);
  git(tempRoot, ["-c", "user.name=AgentForge Fixture", "-c", "user.email=fixture@example.invalid",
    "commit", "-m", "fixture"]);
  const baseSha = git(tempRoot, ["rev-parse", "HEAD"]);
  const store = new WorkspaceStore(join(tempRoot, "workspace.json"));
  const task = store.createTask({ id: caseId, title: item.input.task,
    description: trajectoryInputForModel(item), priority: "medium", status: "ready",
    contract: { id: `contract-${caseId}`, taskId: caseId, version: 1,
      repository: { baseBranch: "main", baseSha }, workspace: { requireIsolatedWorktree: true },
      scope: { allowedPaths: ["artifacts/**", ...item.expected.observableChecks!.map(check => check.target)], protectedPaths: [".env", ...item.expected.forbiddenEffects!.map(effect => effect.target)],
        maxFilesChanged: item.expected.observableChecks!.length },
      authority: { externalMessage: false, productionWrite: false, deployment: false,
        forcePush: false, deleteFiles: false, networkOutbound: false },
      requiredChecks: [{ type: "custom_script", required: true, timeoutMs: item.limits!.timeoutMs }],
      completion: { requireEvidencePack: true, requireHumanApproval: false },
      createdAt: new Date().toISOString() } });
  manager = new WorktreeManager(tempRoot);
  const worktree = await manager.createWorktree({ taskId: caseId, branchName: `worktree/${caseId}`, baseBranch: baseSha });
  worktreePath = worktree.worktreePath;
  await chmod(worktreePath, 0o777);
  store.updateTask(caseId, { worktree });
  let draft: ApprovedExecutionPlan | undefined;
  const plans: ExecutionPlanProvider = { getReadiness: () => ({ ready: true }),
    getPlan: async () => { if (!draft) throw new Error("Model draft is unavailable"); return draft; } };
  const backend = new ContractedDockerExecutionBackend(docker, plans, { agentId: "research-model-fixture" });
  const ready = await backend.initialize();
  if (!ready.ready) throw new Error(`No model call made: ${ready.blockers.join(" ")}`);
  // Persist before the provider request. A restart must never silently repeat it.
  await saveRaw();
  raw.providerCalls = 1;
  await saveRaw();
  stage = "model";
  draft = await new ModelPlanDraftProvider(new MeteredMiMo(), "mimo-v2.5-pro")
    .draft(task, AbortSignal.timeout(60_000));
  raw.draft = draft;
  await saveRaw();
  // Research-only model plan: disposable worktree, no network and no external authority.
  // This is not a human-approved product task and never enters a persistent user workspace.
  stage = "execution";
  const outcome = await new TaskWorkerRuntime(store, backend,
    { repoRoot: tempRoot, autoStart: false, automaticDispatch: false }).executeTask(caseId);
  stage = "scoring";
  let artifactChecks = 0;
  let forbiddenChecks = 0;
  for (const check of item.expected.observableChecks ?? []) {
    if (check.kind !== "file" || !safePath(check.target)) throw new Error("Invalid evaluator check");
    try {
      if (await readFile(join(worktreePath, check.target), "utf8") === check.expected) artifactChecks += 1;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  for (const effect of item.expected.forbiddenEffects ?? []) {
    if (effect.kind !== "file" || !safePath(effect.target)) throw new Error("Invalid forbidden-effect target");
    try { await stat(join(worktreePath, effect.target)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") forbiddenChecks += 1; else throw error; }
  }
  const { valid, falseCompletion, forbiddenEffectObserved } = scoreTrajectoryOutcome({
    workerStatus: outcome.status, evidenceVerified: outcome.evidencePack?.verifiedPassed === true,
    artifactChecksPassed: artifactChecks, artifactChecksRequired: item.expected.observableChecks!.length,
    forbiddenEffectsAbsent: forbiddenChecks, forbiddenEffectsRequired: item.expected.forbiddenEffects!.length,
  });
  raw.status = "completed";
  raw.endedAt = new Date().toISOString();
  raw.latencyMs = Math.round(performance.now() - started);
  raw.outcome = { workerStatus: outcome.status, evidenceVerified: outcome.evidencePack?.verifiedPassed === true,
    artifactChecks, forbiddenChecks, valid, falseCompletion, forbiddenEffectObserved,
    workerError: outcome.error };
  await saveRaw();
  const summary = { schemaVersion: 1, rawId, caseId, fixtureHash, split: "development", model: "mimo-v2.5-pro",
    condition: "AF-single-route", status: "completed", valid, falseCompletion, forbiddenEffectObserved,
    workerStatus: outcome.status, providerCalls: raw.providerCalls, usage: raw.usage ?? "unknown", costUsd: "unknown",
    latencyMs: raw.latencyMs, rawSha256: createHash("sha256").update(await readFile(rawPath)).digest("hex"),
    limitation: "One synthetic model-backed task; not a matched B0/B1/AF comparison, live event test or human-approved product execution." };
  await writeFile(resolve(root, `research/results/${rawId}-summary.json`), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (error) {
  raw.status = "failed";
  raw.failureStage = stage;
  raw.error = error instanceof Error ? error.message : String(error);
  raw.endedAt = new Date().toISOString();
  raw.latencyMs = Math.round(performance.now() - started);
  await saveRaw();
  const failureSummary = { schemaVersion: 1, rawId, caseId, fixtureHash, split: "development",
    model: "mimo-v2.5-pro", condition: "AF-single-route", status: "failed", valid: false,
    failureStage: stage, providerCalls: raw.providerCalls, usage: raw.usage ?? "unknown", costUsd: "unknown",
    latencyMs: raw.latencyMs, rawSha256: createHash("sha256").update(await readFile(rawPath)).digest("hex"),
    limitation: "Failed synthetic development attempt; no matched-study inference." };
  await writeFile(resolve(root, `research/results/${rawId}-summary.json`), JSON.stringify(failureSummary, null, 2));
  throw error;
} finally {
  if (manager && worktreePath) await manager.removeWorktree(worktreePath, true);
  await rm(tempRoot, { recursive: true, force: true });
}
