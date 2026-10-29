/** Kill the AgentForge worker during a real, network-disabled Docker effect.
 * Restart must discover the surviving operation without replay or completion.
 * Cleanup removes only containers selected by this fixture's workspace labels.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {DockerComputeProvider} from '../src/core/compute/dockerComputeProvider.js';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {WorktreeManager} from '../src/core/worktree/worktreeManager.js';
import {TaskWorkerRuntime} from '../src/core/runtime/taskWorkerRuntime.js';
import {ApprovedPlanProvider, executionContractDigest} from '../src/core/runtime/approvedPlanProvider.js';
import {ContractedDockerExecutionBackend} from '../src/core/runtime/contractedDockerExecutionBackend.js';
import type {Task} from '../src/core/types/task.js';

const taskId = 'docker-crash-proof';
const image = process.env.AGENTFORGE_APPROVED_DOCKER_IMAGE?.trim() || 'node:22-alpine';
const git = (cwd: string, args: string[]) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: 'pipe', timeout: 15000}).trim();
async function runtime(root: string) {
  const store = new WorkspaceStore(path.join(root, 'state.json'));
  const docker = new DockerComputeProvider({defaultImage: image, maxMemoryBytes: 256 * 1024 * 1024, cpuQuota: 1});
  const backend = new ContractedDockerExecutionBackend(docker, new ApprovedPlanProvider(async id => store.getTask(id)?.approvedExecutionPlan), {resultJournalDirectory: path.join(root, 'results')});
  const readiness = await backend.initialize();
  assert.equal(readiness.ready, true, 'Docker must be available; this proof cannot silently skip');
  return {store, docker, worker: new TaskWorkerRuntime(store, backend, {
    repoRoot: path.join(root, 'repo'), requireEffectReceipts: true, workspaceIdentity: 'synthetic-docker-crash',
    autoStart: false, automaticDispatch: false,
  })};
}

if (process.argv[2] === 'child') {
  const {worker} = await runtime(process.argv[3]);
  const result = await worker.executeTask(taskId);
  throw Error('Hanging fixture unexpectedly completed: ' + JSON.stringify({status: result.status, error: result.error, checks: result.evidencePack?.testResults}));
} else {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-docker-crash-')));
  const repo = path.join(root, 'repo');
  let child: ReturnType<typeof spawn> | undefined;
  let worktreePath: string | undefined;
  try {
    await fs.mkdir(repo);
    git(repo, ['init', '--initial-branch=main']);
    await fs.writeFile(path.join(repo, 'README.md'), '# Synthetic Docker crash proof\n');
    git(repo, ['add', 'README.md']);
    git(repo, ['-c', 'user.name=AgentForge acceptance', '-c', 'user.email=acceptance@example.invalid', 'commit', '-m', 'fixture']);
    const baseSha = git(repo, ['rev-parse', 'HEAD']);
    const worktree = await new WorktreeManager(repo).createWorktree({taskId, branchName: `worktree/${taskId}`, baseBranch: baseSha});
    worktreePath = worktree.worktreePath;
    const now = new Date().toISOString();
    const command = `node -e "require('node:fs').appendFileSync('artifacts/effects.txt','effect\\n');setInterval(()=>{},1000)"`;
    const task: Task = {id: taskId, projectId: 'synthetic', title: 'Docker crash recovery', description: 'One disposable effect followed by a deliberate wait.',
      priority: 'medium', status: 'ready', createdAt: now, updatedAt: now, worktree,
      contract: {id: 'docker-crash-contract', taskId, version: 1, repository: {baseBranch: 'main', baseSha},
        workspace: {requireIsolatedWorktree: true}, scope: {allowedPaths: ['artifacts/**'], protectedPaths: [], maxFilesChanged: 1},
        authority: {externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false},
        requiredChecks: [{type: 'custom_script', command, required: true}], completion: {requireEvidencePack: true, requireHumanApproval: true, requiredArtifacts: [{path: 'artifacts/effects.txt'}]}, createdAt: now}};
    task.approvedExecutionPlan = {plan: {taskId, source: 'human_approved', commands: [{checkName: 'custom_script', command, timeoutMs: 120000}]},
      contractDigest: executionContractDigest(task), approvedBy: 'synthetic-acceptance', approvedAt: now, expiresAt: new Date(Date.now() + 3600000).toISOString()};
    new WorkspaceStore(path.join(root, 'state.json')).createTask(task);
    const env: NodeJS.ProcessEnv = {AGENTFORGE_APPROVED_DOCKER_IMAGE: image};
    for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'DOCKER_HOST', 'DOCKER_CONTEXT']) if (process.env[key]) env[key] = process.env[key];
    child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), 'child', root], {cwd: process.cwd(), env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
    let diagnostic = '';
    child.stderr?.on('data', chunk => {diagnostic = (diagnostic + String(chunk)).slice(-8192);});
    const exited = once(child, 'exit');
    const marker = path.join(worktreePath, 'artifacts', 'effects.txt');
    const deadline = Date.now() + 60000;
    while (true) {
      try { if ((await fs.readFile(marker, 'utf8')).endsWith('effect\n')) break; } catch (error) {if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;}
      if (child.exitCode !== null || child.signalCode !== null) throw Error('Worker exited before writing its effect: ' + diagnostic);
      if (Date.now() >= deadline) throw Error('Docker effect deadline exceeded');
      await delay(100);
    }
    const before = new WorkspaceStore(path.join(root, 'state.json')).getTask(taskId)!;
    const receipt = before.executionReceipts?.at(-1);
    assert.equal(receipt?.status, 'started');
    child.kill('SIGKILL');
    await exited;
    const recovered = await runtime(root);
    const survivors = await recovered.worker.inspectExecutionSurvivors(taskId);
    assert.equal(survivors.operationId, receipt!.operationId);
    assert.equal(survivors.containers.length, 1);
    assert.equal(survivors.containers[0].state, 'running');
    assert.equal(survivors.replayed, false);
    assert.equal(survivors.reconciled, false);
    assert.deepEqual(await recovered.docker.listWorkspaceContainers(worktreePath, randomUUID()), []);
    await assert.rejects(recovered.worker.executeTask(taskId), /no replay permitted/);
    assert.throws(() => recovered.worker.reconcileObservedExecution(taskId), /no automatic completion/);
    assert.equal((await fs.readFile(marker, 'utf8')).match(/effect\n/g)?.length, 1);
    assert.equal(recovered.worker.presentTask(recovered.store.getTask(taskId)!).status, 'paused');
    assert.equal(recovered.store.getTask(taskId)!.executionReceipts!.length, 1);
    const frozenTask = JSON.stringify(recovered.store.getTask(taskId));
    await assert.rejects(recovered.worker.recoverJournaledExecution(taskId), /ENOENT/);
    assert.equal(JSON.stringify(recovered.store.getTask(taskId)), frozenTask);
    // Removing the orphan must not convert an unrecorded partial effect into success.
    for (const container of survivors.containers) execFileSync('docker', ['rm', '--force', container.id], {stdio: 'pipe', timeout: 15000});
    assert.equal((await recovered.worker.inspectExecutionSurvivors(taskId)).containers.length, 0);
    await assert.rejects(recovered.worker.recoverJournaledExecution(taskId), /ENOENT/);
    await assert.rejects(recovered.worker.executeTask(taskId), /no replay permitted/);
    assert.equal(JSON.stringify(recovered.store.getTask(taskId)), frozenTask);
    assert.equal((await fs.readFile(marker, 'utf8')).match(/effect\n/g)?.length, 1);
    console.log(JSON.stringify({passed: true, missingResultRecoveryRefusedBeforeAndAfterOrphanRemoval: true, taskUnchangedByFailedRecovery: true, actualWorkerKilled: true, liveDockerSurvivorFound: true,
      operationScoped: true, replayRefused: true, uncertainCompletionRefused: true, effectCount: 1,
      limitation: 'Discovery and replay refusal; does not prove automatic effect reconciliation or end-user recovery UI.'}, null, 2));
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;}
    if (worktreePath) {
      const owned = await new DockerComputeProvider().listWorkspaceContainers(worktreePath);
      for (const container of owned) execFileSync('docker', ['rm', '--force', container.id], {stdio: 'pipe', timeout: 15000});
      assert.deepEqual(await new DockerComputeProvider().listWorkspaceContainers(worktreePath), []);
      await new WorktreeManager(repo).removeWorktree(worktreePath, true);
    }
    const temporaryRoot = await fs.realpath(os.tmpdir());
    if (path.dirname(root) !== temporaryRoot || !path.basename(root).startsWith('agentforge-docker-crash-')) throw Error('Cleanup path mismatch');
    await fs.rm(root, {recursive: true, force: true});
  }
}
