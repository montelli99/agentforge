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
} from "../../core/providers/memory.js";

export class OperationalMemoryProvider implements MemoryProvider {
  readonly id = "agentforge_operational";
  readonly name = "AgentForge Operational & Engineering Memory";

  private store = new Map<string, OperationalMemoryRecord[]>();

  async record(memory: Omit<OperationalMemoryRecord, "id" | "createdAt">): Promise<OperationalMemoryRecord> {
    const records = this.store.get(memory.namespace) || [];
    const fullRecord: OperationalMemoryRecord = {
      ...memory,
      id: `mem-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    records.push(fullRecord);
    this.store.set(memory.namespace, records);
    return fullRecord;
  }

  async get(namespace: string, id: string): Promise<OperationalMemoryRecord | null> {
    const records = this.store.get(namespace) || [];
    return records.find(r => r.id === id) || null;
  }

  async query(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const records = this.store.get(query.namespace) || [];
    const results: MemorySearchResult[] = [];

    for (const rec of records) {
      if (query.categories && !query.categories.includes(rec.category)) {
        continue;
      }
      if (query.projectId && rec.projectId && rec.projectId !== query.projectId) {
        continue;
      }
      if (query.tags && query.tags.length > 0) {
        const hasTag = query.tags.some(t => rec.tags.includes(t));
        if (!hasTag) continue;
      }

      let score = 1.0;
      if (query.queryText) {
        const q = query.queryText.toLowerCase();
        const contentMatch = rec.content.toLowerCase().includes(q);
        const titleMatch = rec.title.toLowerCase().includes(q);
        if (!contentMatch && !titleMatch) continue;
        score = titleMatch ? 1.0 : 0.8;
      }

      results.push({ record: rec, score });
    }

    results.sort((a, b) => b.score - a.score);
    return query.limit ? results.slice(0, query.limit) : results;
  }

  async delete(namespace: string, id: string): Promise<boolean> {
    const records = this.store.get(namespace) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return false;
    records.splice(idx, 1);
    return true;
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
