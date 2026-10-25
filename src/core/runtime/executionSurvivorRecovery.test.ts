import {describe, it, expect, vi} from 'vitest';
import {WorkspaceStore} from '../store/workspaceStore.js';
import {TaskWorkerRuntime, type TaskExecutionBackend} from './taskWorkerRuntime.js';

function fixture() {
  const store = new WorkspaceStore();
  const task = store.createTask({id: 'survivor-fixture', title: 'Synthetic recovery', priority: 'medium', status: 'ready',
    contract: {id: 'survivor-contract', taskId: 'survivor-fixture', version: 1,
      repository: {baseBranch: 'main', baseSha: 'synthetic'}, workspace: {requireIsolatedWorktree: false},
      scope: {allowedPaths: ['artifacts/**'], protectedPaths: []},
      authority: {externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false},
      requiredChecks: [], completion: {requireEvidencePack: true, requireHumanApproval: true}, createdAt: new Date().toISOString()}});
  let release!: () => void, entered!: () => void;
  const started = new Promise<void>(resolve => {entered = resolve;});
  const held = new Promise<void>(resolve => {release = resolve;});
  const backend: TaskExecutionBackend = {
    allowsGovernedProcesses: false,
    getReadiness: () => ({ready: true, blockers: [], capabilities: {modelPlanning: true, isolatedCompute: true, realVerification: true, evidenceCollection: true}}),
    execute: vi.fn(async () => {entered(); await held; return {commandsExecuted: [], testResults: [], filesChanged: [], artifacts: [], finalSha: 'synthetic'};}),
    inspectSurvivors: vi.fn(async () => [{id: 'a'.repeat(64), state: 'running'}]),
  };
  const runtime = new TaskWorkerRuntime(store, backend, {repoRoot: process.cwd(), requireEffectReceipts: true, workspaceIdentity: 'synthetic-survivor', autoStart: false});
  return {store, task, backend, runtime, started, release: () => release()};
}

describe('operation-bound survivor review', () => {
  it('allows read-only discovery during execution without completing or replaying it', async () => {
    const f = fixture(), execution = f.runtime.executeTask(f.task.id);
    try {
      await f.started;
      const before = structuredClone(f.store.getTask(f.task.id));
      const result = await f.runtime.inspectExecutionSurvivors(f.task.id);
      expect(result).toMatchObject({operationId: before!.executionReceipts![0].operationId, replayed: false, reconciled: false});
      expect(f.backend.inspectSurvivors).toHaveBeenCalledWith({worktreePath: process.cwd(), operationId: result.operationId});
      expect(f.store.getTask(f.task.id)).toEqual(before);
      expect(() => f.runtime.reconcileObservedExecution(f.task.id)).toThrow('Execution still active');
      await expect(f.runtime.executeTask(f.task.id)).rejects.toThrow('already executing');
      expect(f.backend.execute).toHaveBeenCalledTimes(1);
    } finally {f.release(); await execution; f.runtime.stop();}
  });

  it('rejects changed contract binding even when updates share the same clock tick', async () => {
    vi.useFakeTimers({toFake: ['Date']});
    const f = fixture(), execution = f.runtime.executeTask(f.task.id);
    try {
      await f.started;
      let finish!: (value: Array<{id: string; state: string}>) => void;
      f.backend.inspectSurvivors = vi.fn(() => new Promise<Array<{id: string; state: string}>>(resolve => {finish = resolve;}));
      const pending = f.runtime.inspectExecutionSurvivors(f.task.id);
      const rejection = expect(pending).rejects.toThrow();
      const before = f.store.getTask(f.task.id)!;
      f.store.updateTask(f.task.id, {contract: {...before.contract, version: 2}});
      expect(f.store.getTask(f.task.id)!.updatedAt).toBe(before.updatedAt);
      finish([{id: 'a'.repeat(64), state: 'running'}]);
      await rejection;
    } finally {f.release(); await execution; f.runtime.stop(); vi.useRealTimers();}
  });
});
