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
  /** Stop work promptly when possible; callers also bound unresponsive adapters. */
  signal?: AbortSignal;
  categories?: MemoryCategory[];
  queryText?: string;
  tags?: string[];
  projectId?: string;
  /** Limit a projectless worker to explicitly shared records. */
  globalOnly?: boolean;
  limit?: number;
  includeArchived?: boolean;
}

export interface MemorySearchResult {
  record: OperationalMemoryRecord;
  score: number;
}

/** Only public source identifiers cross into model context, never arbitrary adapter metadata. */
export function memorySourceIdentity(provider: MemoryProvider, record: OperationalMemoryRecord): {
  providerId: string; recordId: string; alias?: string;
} {
  const source = record.metadata?.memorySource;
  if (provider.id === 'composite' && source && typeof source === 'object' && !Array.isArray(source)) {
    const value = source as Record<string, unknown>;
    if (typeof value.alias === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value.alias) &&
        typeof value.providerId === 'string' && value.providerId.length <= 128 &&
        typeof value.recordId === 'string' && value.recordId.length <= 1024) {
      return { providerId: value.providerId, recordId: value.recordId, alias: value.alias };
    }
  }
  return { providerId: provider.id, recordId: record.id };
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

/** Bound waiting even when an adapter ignores cancellation. Never retry implicitly. */
export async function queryMemoryBounded(provider:MemoryProvider,query:MemoryQuery):Promise<MemorySearchResult[]>{
  const signal=AbortSignal.any([AbortSignal.timeout(15000),...(query.signal?[query.signal]:[])]);
  signal.throwIfAborted();
  let interrupt:()=>void=()=>{};
  const stopped=new Promise<never>((_,reject)=>{interrupt=()=>reject(Error('Memory lookup stopped or timed out'));signal.addEventListener('abort',interrupt,{once:true});if(signal.aborted)interrupt();});
  try{return await Promise.race([stopped,provider.query({...query,signal})]);}
  finally{signal.removeEventListener('abort',interrupt);}
}
