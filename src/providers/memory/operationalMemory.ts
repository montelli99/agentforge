/**
 * Operational Memory Provider
 * Section 10: Engineering and Operational Memory
 * Manages task history, worktree history, tests, failures, do-not-repeat rules, and project constraints.
 */

import crypto from "node:crypto";
import type {
  MemoryProvider,
  OperationalMemoryRecord,
  MemoryQuery,
  MemorySearchResult,
  OperationalMemoryRepository,
} from "../../core/providers/memory.js";

export class OperationalMemoryProvider implements MemoryProvider {
  readonly id = "agentforge_operational";
  readonly name = "AgentForge Operational & Engineering Memory";

  private store = new Map<string, OperationalMemoryRecord[]>();

  constructor(private readonly repository?: OperationalMemoryRepository) {}

  async record(memory: Omit<OperationalMemoryRecord, "id" | "createdAt">): Promise<OperationalMemoryRecord> {
    const fullRecord: OperationalMemoryRecord = {
      ...memory,
      id: `mem-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    if (this.repository) {
      this.repository.saveOperationalMemory(fullRecord);
    } else {
      const records = this.store.get(memory.namespace) || [];
      records.push(fullRecord);
      this.store.set(memory.namespace, records);
    }
    return fullRecord;
  }

  async get(namespace: string, id: string): Promise<OperationalMemoryRecord | null> {
    const records = this.list(namespace);
    return records.find(r => r.id === id) || null;
  }

  async query(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const records = this.list(query.namespace);
    const results: MemorySearchResult[] = [];

    for (const rec of records) {
      if (rec.archived && !query.includeArchived) continue;
      if (query.categories && !query.categories.includes(rec.category)) {
        continue;
      }
      // Keep intentionally shared workspace rules visible while excluding another project's private records.
      if (query.projectId && rec.projectId && rec.projectId !== query.projectId) continue;
      if (query.tags && query.tags.length > 0) {
        const hasTag = query.tags.some(t => rec.tags.includes(t));
        if (!hasTag) continue;
      }

      let score = categoryPriority(rec.category);
      if (query.queryText) {
        const queryTerms = tokenize(query.queryText);
        const titleTerms = tokenize(rec.title);
        const contentTerms = tokenize(rec.content);
        const titleOverlap = overlap(queryTerms, titleTerms);
        const contentOverlap = overlap(queryTerms, contentTerms);
        if (titleOverlap === 0 && contentOverlap === 0) continue;
        score += titleOverlap * 2 + contentOverlap;
      }

      // Recent operational records are more useful when several records match;
      // the bounded boost never outweighs a strong title/content match.
      if (query.queryText) {
        const ageDays = Math.max(0, (Date.now() - Date.parse(rec.updatedAt || rec.createdAt)) / 86_400_000);
        score += 1 / (1 + ageDays / 30);
      }

      results.push({ record: rec, score });
    }

    results.sort((a, b) => b.score - a.score);
    return query.limit ? results.slice(0, query.limit) : results;
  }

  async delete(namespace: string, id: string): Promise<boolean> {
    if (this.repository) return this.repository.deleteOperationalMemory(namespace, id);
    const records = this.store.get(namespace) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return false;
    records.splice(idx, 1);
    return true;
  }

  update(namespace: string, id: string, expectedVersion: number, actorId: string,
    patch: Partial<Pick<OperationalMemoryRecord, "title" | "content" | "category" | "tags" | "archived">>): OperationalMemoryRecord {
    const existing = this.list(namespace).find(record => record.id === id);
    if (!existing) throw new Error("Memory was not found in this collection.");
    if ((existing.version || 1) !== expectedVersion) throw new Error("This memory changed elsewhere. Reload it before saving.");
    const record: OperationalMemoryRecord = {
      ...existing, ...patch, version: expectedVersion + 1, updatedAt: new Date().toISOString(), updatedBy: actorId,
      revisions: [...(existing.revisions || []), {
        version: expectedVersion, title: existing.title, content: existing.content, category: existing.category,
        tags: [...existing.tags], archived: Boolean(existing.archived), savedAt: existing.updatedAt || existing.createdAt,
        actorId: existing.updatedBy,
      }],
    };
    if (this.repository) this.repository.saveOperationalMemory(record);
    else {
      const records = this.store.get(namespace) || [];
      records[records.findIndex(item => item.id === id)] = record;
    }
    return record;
  }

  private list(namespace: string): OperationalMemoryRecord[] {
    return this.repository
      ? this.repository.listOperationalMemories(namespace)
      : [...(this.store.get(namespace) || [])];
  }

  async getDoNotRepeatRules(namespace: string, projectId?: string): Promise<OperationalMemoryRecord[]> {
    const res = await this.query({
      namespace,
      categories: ["do_not_repeat", "project_constraint"],
      projectId,
    });
    return res.map(r => r.record);
  }
}

function tokenize(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length >= 3));
}

function overlap(query: Set<string>, candidate: Set<string>): number {
  let matches = 0;
  for (const term of query) if (candidate.has(term)) matches += 1;
  return matches;
}

function categoryPriority(category: OperationalMemoryRecord["category"]): number {
  return category === "do_not_repeat" || category === "project_constraint" ? 1.5 : category === "test_failure" ? 1.2 : 1;
}
