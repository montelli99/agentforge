import {describe, expect, it, vi} from 'vitest';
import {CompositeMemoryProvider} from './compositeMemory.js';
import {OperationalMemoryProvider} from './operationalMemory.js';
import type {MemoryQuery, MemorySearchResult, OperationalMemoryRecord} from '../../core/providers/memory.js';

const record = (id: string, changes: Partial<OperationalMemoryRecord> = {}): OperationalMemoryRecord => ({
  id, namespace: 'workspace', projectId: 'selected', category: 'general_fact', title: id, content: 'Synthetic fact', tags: ['selected-tag'], createdAt: '2026-01-01T00:00:00Z', ...changes,
});
function source(id: string, results: MemorySearchResult[]) {
  const provider = new OperationalMemoryProvider();
  Object.defineProperty(provider, 'id', {value: id});
  provider.query = vi.fn(async () => results);
  return provider;
}
const item = (value: OperationalMemoryRecord, score = 1) => ({record: value, score});

describe('combined project memory', () => {
  it('keeps source identity and rank order while excluding other projects and shared records', async () => {
    const first = source('first', [item(record('same'), 0.01), item(record('other', {projectId: 'other'})), item(record('shared', {projectId: undefined})), item(record('next'), 0.001)]);
    const second = source('second', [item(record('same'), 100000)]);
    const combined = new CompositeMemoryProvider('workspace', 'selected', [{alias: 'one', provider: first}, {alias: 'two', provider: second}]);
    const results = await combined.query({namespace: 'workspace', projectId: 'selected', limit: 4});
    expect(results.map(result => result.record.id)).toEqual(['one:same', 'two:same', 'one:next']);
    expect(results[1].record.metadata?.memorySource).toEqual({alias: 'two', providerId: 'second', recordId: 'same'});
    await expect(combined.query({namespace: 'workspace', projectId: 'other'})).resolves.toEqual([]);
    expect(first.query).toHaveBeenCalledTimes(1);
  });

  it('snapshots caller selection before awaiting adapters', async () => {
    let release!: (results: MemorySearchResult[]) => void;
    const provider = source('delayed', []);
    provider.query = vi.fn(() => new Promise<MemorySearchResult[]>(resolve => {release = resolve;}));
    const combined = new CompositeMemoryProvider('workspace', 'selected', [{alias: 'one', provider}]);
    const query: MemoryQuery = {namespace: 'workspace', projectId: 'selected', tags: ['selected-tag'], categories: ['general_fact']};
    const pending = combined.query(query);
    await Promise.resolve();
    query.tags![0] = 'changed-tag';
    query.categories![0] = 'deployment';
    release([item(record('kept'))]);
    expect((await pending).map(result => result.record.id)).toEqual(['one:kept']);
  });

  it('cancels sibling work and exposes no partial recall or provider error on failure', async () => {
    let siblingSignal: AbortSignal | undefined;
    const hanging = source('hanging', []);
    hanging.query = vi.fn(async query => {siblingSignal = query.signal; return await new Promise<MemorySearchResult[]>(() => {});});
    const failed = source('failed', []);
    failed.query = vi.fn(async () => {throw Error('synthetic-private-provider-detail');});
    const combined = new CompositeMemoryProvider('workspace', 'selected', [{alias: 'hang', provider: hanging}, {alias: 'fail', provider: failed}]);
    await expect(combined.query({namespace: 'workspace', projectId: 'selected'})).rejects.toThrow(/^Combined memory lookup failed or stopped; no complete result is available$/);
    expect(siblingSignal?.aborted).toBe(true);
    expect(failed.query).toHaveBeenCalledTimes(1);
  });

  it('honors caller cancellation even if an adapter never settles', async () => {
    const controller = new AbortController(), provider = source('unresponsive', []);
    provider.query = vi.fn(async () => await new Promise<MemorySearchResult[]>(() => {}));
    const combined = new CompositeMemoryProvider('workspace', 'selected', [{alias: 'one', provider}]);
    const pending = combined.query({namespace: 'workspace', projectId: 'selected', signal: controller.signal});
    const rejected = expect(pending).rejects.toThrow('Combined memory lookup failed or stopped');
    await Promise.resolve();
    controller.abort();
    await rejected;
    expect(provider.query).toHaveBeenCalledTimes(1);
  });
});
