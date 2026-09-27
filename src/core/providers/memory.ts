/**
 * MemoryProvider Interface
 * Section 10: Memory Architecture
 * Emphasizes Engineering & Operational Memory over generic chat facts.
 */

export type MemoryCategory =
  | "task_history"
  | "repo_history"
  | "worktree_history"
  | "commit"
  | "test_failure"
  | "deployment"
  | "approval"
  | "artifact"
  | "do_not_repeat"
  | "project_constraint"
  | "general_fact";

export interface OperationalMemoryRecord {
  id: string;
  namespace: string;
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
  projectId?: string;
  taskId?: string;
  commitSha?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
  archived?: boolean;
  revisions?: Array<{
    version: number; title: string; content: string; category: MemoryCategory;
    tags: string[]; archived: boolean; savedAt: string; actorId?: string;
  }>;
}

export interface MemoryQuery {
  namespace: string;
  categories?: MemoryCategory[];
  queryText?: string;
  tags?: string[];
  projectId?: string;
  limit?: number;
  includeArchived?: boolean;
}

export interface MemorySearchResult {
  record: OperationalMemoryRecord;
  score: number;
}

export interface MemoryProvider {
  readonly id: string;
  readonly name: string;

  record(memory: Omit<OperationalMemoryRecord, "id" | "createdAt">): Promise<OperationalMemoryRecord>;
  get(namespace: string, id: string): Promise<OperationalMemoryRecord | null>;
  query(query: MemoryQuery): Promise<MemorySearchResult[]>;
  delete(namespace: string, id: string): Promise<boolean>;
  getDoNotRepeatRules(namespace: string, projectId?: string): Promise<OperationalMemoryRecord[]>;
}

/** Synchronous repository boundary used by providers backed by the canonical workspace snapshot. */
export interface OperationalMemoryRepository {
  listOperationalMemories(namespace: string): OperationalMemoryRecord[];
  saveOperationalMemory(record: OperationalMemoryRecord): void;
  deleteOperationalMemory(namespace: string, id: string): boolean;
}
