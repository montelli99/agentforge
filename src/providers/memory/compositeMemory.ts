import { queryMemoryBounded, type MemoryProvider, type MemoryQuery, type MemorySearchResult, type OperationalMemoryRecord } from '../../core/providers/memory.js';

/** Explicit, read-only composition. Failure never masquerades as complete recall. */
export class CompositeMemoryProvider implements MemoryProvider {
  readonly id = 'composite';
  readonly name = 'Selected project memory sources';
  private readonly sources: ReadonlyArray<{ alias: string; provider: MemoryProvider }>;

  constructor(private readonly namespace: string, private readonly projectId: string,
    sources: ReadonlyArray<{ alias: string; provider: MemoryProvider }>) {
    if (!namespace.trim() || !projectId.trim() || sources.length < 1 || sources.length > 8)
      throw Error('Select a project, namespace and one to eight memory sources');
    const aliases = new Set<string>();
    for (const source of sources) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(source.alias) || aliases.has(source.alias))
        throw Error('Memory source aliases must be unique simple identifiers');
      aliases.add(source.alias);
    }
    this.sources = sources.map(source => Object.freeze({ ...source }));
  }

  private scoped(record: OperationalMemoryRecord, query: MemoryQuery): boolean {
    return record.namespace === this.namespace && record.projectId === this.projectId &&
      (query.includeArchived === true || !record.archived) &&
      (!query.categories?.length || query.categories.includes(record.category)) &&
      (!query.tags?.length || query.tags.every(tag => record.tags.includes(tag)));
  }

  private qualify(source: { alias: string; provider: MemoryProvider }, record: OperationalMemoryRecord): OperationalMemoryRecord {
    return { ...record, id: `${source.alias}:${encodeURIComponent(record.id)}`,
      metadata: { ...record.metadata, memorySource: { alias: source.alias, providerId: source.provider.id, recordId: record.id } } };
  }

  async query(query: MemoryQuery): Promise<MemorySearchResult[]> {
    // The caller can reuse its query while adapters are pending. Filtering the
    // response must use the same selection that was sent to those adapters.
    query = { ...query, tags: query.tags?.slice(), categories: query.categories?.slice() };
    if (query.namespace !== this.namespace || query.projectId !== this.projectId || query.globalOnly) return [];
    const limit = Number.isFinite(query.limit) ? Math.max(0, Math.min(100, Math.floor(query.limit!))) : 24;
    if (!limit) return [];
    const stop = new AbortController();
    const signal = AbortSignal.any([stop.signal, ...(query.signal ? [query.signal] : [])]);
    try {
      const groups = await Promise.all(this.sources.map(async source => {
        const results = await queryMemoryBounded(source.provider, { ...query, limit, signal });
        const seen = new Set<string>();
        return results.filter(({record}) => {
          if (!this.scoped(record, query) || seen.has(record.id)) return false;
          seen.add(record.id); return true;
        }).slice(0, limit).map(result => this.qualify(source, result.record));
      }));
      const merged: MemorySearchResult[] = [];
      // Scores from different engines are not comparable. Preserve each source's order.
      for (let rank = 0; rank < limit && merged.length < limit; rank++) {
        for (const group of groups) {
          if (group[rank] && merged.length < limit) merged.push({ record: group[rank], score: 1 / (rank + 1) });
        }
      }
      return merged;
    } catch {
      stop.abort();
      throw Error('Combined memory lookup failed or stopped; no complete result is available');
    }
  }

  async get(): Promise<OperationalMemoryRecord | null> { throw Error('Use scoped queries for combined memory'); }
  async record(): Promise<OperationalMemoryRecord> { throw Error('Combined memory is read-only; select a source for writes'); }
  async delete(): Promise<boolean> { throw Error('Combined memory is read-only; select a source for deletion'); }
  async getDoNotRepeatRules(namespace: string, projectId?: string): Promise<OperationalMemoryRecord[]> {
    return (await this.query({ namespace, projectId, categories: ['do_not_repeat'], limit: 100 })).map(item => item.record);
  }
}
