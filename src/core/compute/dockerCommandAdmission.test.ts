import {beforeEach, describe, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({run: vi.fn(), prepare: vi.fn(), validate: vi.fn()}));
vi.mock('node:child_process', async () => {
  const {promisify} = await import('node:util');
  const execFile = Object.assign(() => {}, {[promisify.custom]: mocks.run});
  return {execFile};
});
vi.mock('./scopedDockerMounts.js', () => ({prepareScopedWritableDirectories: mocks.prepare, checkDockerReadiness: vi.fn()}));
vi.mock('./nonDeletingFileMounts.js', () => ({validateWritableFiles: mocks.validate}));
vi.mock('node:fs/promises', async importOriginal => ({
  ...await importOriginal<typeof import('node:fs/promises')>(),
  realpath: async (directory: string) => directory,
}));
import {DockerComputeProvider} from './dockerComputeProvider.js';

function gate<T>() {
  let release!: (value: T) => void;
  return {promise: new Promise<T>(resolve => {release = resolve;}), release: (value: T) => release(value)};
}
async function environment() {
  const provider = new DockerComputeProvider();
  vi.spyOn(provider, 'isAvailable').mockResolvedValue({available: true});
  const env = await provider.createEnvironment({worktreeDir: process.cwd(), agentId: 'synthetic'});
  return {provider, env};
}

describe('Docker admission after asynchronous preparation', () => {
  beforeEach(() => {
    mocks.run.mockReset().mockResolvedValue({stdout: '', stderr: ''});
    mocks.prepare.mockReset().mockResolvedValue([]);
    mocks.validate.mockReset().mockResolvedValue(undefined);
  });

  it('admits only one of two requests that both entered preparation', async () => {
    const {provider, env} = await environment();
    const preparation = gate<string[]>(), attached = gate<{stdout: string; stderr: string}>(), started = gate<void>();
    mocks.prepare.mockImplementation(() => preparation.promise);
    mocks.run.mockImplementation(async (_exe: string, args: string[]) => {
      if (args[0] === 'start') {started.release(); return attached.promise;}
      return {stdout: '', stderr: ''};
    });
    const first = provider.executeCommand(env.id, 'synthetic first');
    const second = provider.executeCommand(env.id, 'synthetic second');
    const results = Promise.allSettled([first, second]);
    expect(mocks.prepare).toHaveBeenCalledTimes(3); // Environment setup plus both requests.
    preparation.release([]);
    await started.promise;
    // Both filesystem preparations have completed before the admitted command settles.
    await new Promise(resolve => setImmediate(resolve));
    attached.release({stdout: 'synthetic output', stderr: ''});
    const outcomes = await results;
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect(String(rejected.reason)).toContain('already running');
    expect(mocks.run.mock.calls.filter(call => call[1][0] === 'create')).toHaveLength(1);
    expect(mocks.run.mock.calls.filter(call => call[1][0] === 'start')).toHaveLength(1);
    expect(mocks.run.mock.calls.filter(call => call[1][0] === 'rm')).toHaveLength(1);
    await provider.destroyEnvironment(env.id);
  });

  it('does not create a container after cancellation during preparation', async () => {
    const {provider, env} = await environment(), preparation = gate<string[]>(), controller = new AbortController();
    mocks.prepare.mockReturnValue(preparation.promise);
    const pending = provider.executeCommand(env.id, 'synthetic command', {signal: controller.signal});
    const rejected = expect(pending).rejects.toThrow('cancelled during preparation');
    controller.abort(); preparation.release([]);
    await rejected;
    expect(mocks.run).not.toHaveBeenCalled();
    await provider.destroyEnvironment(env.id);
  });

  it('does not resurrect an environment destroyed during preparation', async () => {
    const {provider, env} = await environment(), preparation = gate<string[]>();
    mocks.prepare.mockReturnValue(preparation.promise);
    const pending = provider.executeCommand(env.id, 'synthetic command');
    const rejected = expect(pending).rejects.toThrow('stopped during command preparation');
    await provider.destroyEnvironment(env.id);
    preparation.release([]);
    await rejected;
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
