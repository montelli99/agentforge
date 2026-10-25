/**
 * Real local acceptance for the approved-command execution path.
 *
 * It creates a disposable Git repository and an actual managed worktree, runs
 * one human-approved command in AgentForge's network-disabled Docker sandbox,
 * then verifies observed output and evidence. Nothing in this check reads an
 * operator workspace, credential, or external account.
 */

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DockerComputeProvider } from "../src/core/compute/dockerComputeProvider.js";
import { WorktreeManager } from "../src/core/worktree/worktreeManager.js";
import { ApprovedPlanProvider, executionContractDigest } from "../src/core/runtime/approvedPlanProvider.js";
import { ContractedDockerExecutionBackend, type ApprovedExecutionPlan } from "../src/core/runtime/contractedDockerExecutionBackend.js";
import { EventEmitter } from "node:events";
import type { ServerResponse } from "node:http";
import { WorkspaceStore } from "../src/core/store/workspaceStore.js";
import { TaskWorkerRuntime } from "../src/core/runtime/taskWorkerRuntime.js";
import { ConversationRuntime } from "../src/server/conversationRuntime.js";
import type { GenerativeModelProvider } from "../src/core/providers/model.js";
import type { Task } from "../src/core/types/task.js";
import { MiMoModelProvider } from "../src/providers/models/mimoModel.js";
import { createHash } from "node:crypto";

const live = process.env.AGENTFORGE_LIVE_EXECUTION_PROOF === "1";
if (live && !process.env.AGENTFORGE_PROOF_MODEL) throw Error("Choose an explicit model from the provider model list");
const started = Date.now();
let providerFailure: string | undefined;
// Diagnostic metadata only; never persist provider bodies or request content.
if (live) {
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (!response.ok) {
   const data = await response.clone().json().catch(() => ({})) as { error?: { message?: string; code?: string } };
   const message = String(data.error?.message || "");
   providerFailure = `HTTP ${response.status}: ` + message.replaceAll(process.env.MIMO_API_KEY || "__none__", "[credential]").slice(0, 400);
  }
  return response;
 };
}
const proof = { live, model: live ? process.env.AGENTFORGE_PROOF_MODEL! : "synthetic", requests: 0, toolCalls: [] as string[], disconnected: false, status: "running", elapsedMs: 0, artifactSha256: "", costUsd: "unmeasured", tokenUsage: "not exposed by streaming adapter", limitation: "Pre-approved fixed task; does not prove autonomous planning, process-crash recovery, or competitor superiority." };

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
}

async function main(): Promise<void> {
  const image = process.env.AGENTFORGE_APPROVED_DOCKER_IMAGE?.trim() || "node:22-alpine";
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
    const now = Date.now();
    const command = "node -e \"require('node:fs').writeFileSync('artifacts/verified.txt','agentforge-docker-e2e')\"";
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
        completion: { requireEvidencePack: true, requireHumanApproval: true, requiredArtifacts: [{ path: "artifacts/verified.txt" }] },
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
      new DockerComputeProvider({ defaultImage: image, maxMemoryBytes: 256 * 1024 * 1024, cpuQuota: 1 }),
      planProvider,
      { agentId: "agentforge-e2e" },
    );
    const readiness = await backend.initialize();
    if (!readiness.ready) {
      throw new Error(`Approved Docker backend unavailable: ${readiness.blockers.join(" ")}`);
    }
    const store = new WorkspaceStore(path.join(root, "state.json"));
    const workspace = store.createWorkspace({ name: "Synthetic acceptance" });
    const project = store.createSpace({ workspaceId: workspace.id, name: "Synthetic", provider: "web" });
    const channel = store.createChannel({ workspaceId: workspace.id, spaceId: project.id, name: "Acceptance", visibility: "private", archived: false, provider: "web" });
    const thread = store.createThread(channel.id, "Approved synthetic execution");
    const prompt = store.createMessage({ channelId: channel.id, threadId: thread.id, authorId: "synthetic-owner", authorType: "user", content: "Run the already-approved task approved-docker-e2e using execute_task. Inspect its result and briefly report only what the tool evidence proves. Do not prepare a replacement task." });
    task.projectId = project.id; task.originChannelId = channel.id; task.originThreadId = thread.id;
    store.createTask(task);
    store.updateTask(taskId, { worktree, approvedExecutionPlan: { plan, contractDigest: executionContractDigest(task), approvedBy: "synthetic-owner", approvedAt: new Date(now-60000).toISOString(), expiresAt: new Date(now+3600000).toISOString() } });
    const worker = new TaskWorkerRuntime(store, backend, { repoRoot: root, requireEffectReceipts: true, workspaceIdentity: workspace.id });
    const response = Object.assign(new EventEmitter(), { destroyed: false, writeHead() {}, write() {}, end() {} }) as unknown as ServerResponse;
    let round = 0;
    const model: GenerativeModelProvider = { id: "synthetic", name: "Scripted acceptance model", defaultTier: 1,
      isAvailable: async()=>true, listModels: async()=>["synthetic"], generate: async()=>{throw Error("unexpected");},
      async *stream() {
        if (!round++) { response.emit("close"); response.destroyed = true;
          yield { id: "1", toolCalls: [{ id: "run", type: "function" as const, function: { name: "execute_task", arguments: JSON.stringify({ taskId }) } }], finishReason: "tool_calls" };
        } else { yield { id: "2", deltaText: "Execution evidence is saved for review.", finishReason: "stop" }; }
      }
    };
    const provider = new MiMoModelProvider();
    const liveModel: GenerativeModelProvider = { id: "bounded-live-proof", name: "Bounded live MiMo proof", defaultTier: 4,
      isAvailable: () => provider.isAvailable(), listModels: async () => [proof.model], generate: async () => { throw Error("Unexpected non-streaming request"); },
      async *stream(options) {
        if (++proof.requests > 4) throw Error("Live proof request limit reached; no retries");
        if (!proof.disconnected) { response.emit("close"); response.destroyed = true; proof.disconnected = true; }
        try { for await (const chunk of provider.stream({ ...options, maxTokens: 768, thinking: "disabled", signal: AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(60000)]) })) {
          for (const call of chunk.toolCalls || []) if (call.function.name) proof.toolCalls.push(call.function.name);
          yield chunk;
        } } catch (error) { providerFailure ||= /MiMo stream error \d{3}/.exec(String(error))?.[0] || "Provider transport failure"; throw error; }
      }
    };
    if (live && !process.env.MIMO_API_KEY) throw Error("Explicit MiMo credential required for live proof");
    await new ConversationRuntime(store, { provider: live ? liveModel : model, models: [proof.model] }, worker).respond(thread.id, prompt.id, proof.model, "synthetic-owner", response);
    const executed = store.getTask(taskId)!;
    if (executed.status !== "waiting_approval" || !executed.evidencePack?.verifiedPassed) throw Error("Governed execution did not produce verified evidence: " + executed.error);
    if (executed.executionReceipts?.at(-1)?.status !== "observed") throw Error("Missing observed execution receipt");
    const restored = new WorkspaceStore(path.join(root, "state.json"));
    if (restored.listThreadMessages(thread.id).at(-1)?.generation?.status !== "complete") throw Error("Disconnected response was not persisted");
    const output = executed.evidencePack;
    const artifact = await readFile(path.join(worktree.worktreePath, "artifacts", "verified.txt"), "utf8");
    if (artifact !== "agentforge-docker-e2e") throw new Error("Sandbox artifact did not contain the expected value.");
    proof.artifactSha256 = createHash("sha256").update(artifact).digest("hex");
    if (output.filesChanged.length !== 1 || output.filesChanged[0]?.filePath !== "artifacts/verified.txt") {
      throw new Error("Execution evidence did not report the expected constrained file change.");
    }
    if (output.artifacts.length !== 1 || output.artifacts[0]?.path !== "artifacts/verified.txt"
      || output.artifacts[0]?.sha256.length !== 64 || output.artifacts[0]?.sizeBytes !== artifact.length) {
      throw new Error("Execution evidence did not capture a tamper-evident record for the generated artifact.");
    }
    if (output.finalSha !== baseSha) throw new Error("Execution evidence reported an unexpected repository revision.");
    await manager.removeWorktree(worktree.worktreePath, true);
    proof.status = "passed";
    console.log(`PASS: conversation tool loop, disconnected subscriber, persisted response, governed worker, observed receipt, isolated network-disabled Docker execution with ${image}, and observed evidence verified.`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

try { await main(); } catch (error) { proof.status = "failed"; process.exitCode = 1; console.error(error instanceof Error ? error.name : "Proof failed"); }
finally { proof.elapsedMs = Date.now() - started; const report = JSON.stringify({ ...proof, providerFailure }, null, 2); if (process.env.AGENTFORGE_PROOF_OUTPUT) await writeFile(process.env.AGENTFORGE_PROOF_OUTPUT, report); console.log(report); }
