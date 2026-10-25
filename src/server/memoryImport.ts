import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {OperationalMemoryRecord} from '../core/providers/memory.js';
import type {WorkspaceStore} from '../core/store/workspaceStore.js';

const categories = new Set(['task_history','repo_history','worktree_history','commit','test_failure','deployment','approval','artifact','do_not_repeat','project_constraint','general_fact']);
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number) => typeof value === 'string' && Boolean(value.trim()) && value.length <= max;
const date = (value: unknown) => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const tags = (value: unknown) => Array.isArray(value) && value.length <= 100 && value.every(tag => typeof tag === 'string' && tag.length <= 200);
const version = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
const optional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value);
function fields(record: Record<string, unknown>) {
  return text(record.title, 200) && text(record.content, 40000) && typeof record.category === 'string' && categories.has(record.category) && tags(record.tags);
}

/** Validate an exported collection without remapping its identities or dropping history. */
export function reviewMemoryImport(input: unknown, namespace: string, store: WorkspaceStore) {
  if (!object(input) || Buffer.byteLength(JSON.stringify(input)) > 1024 * 1024
    || input.format !== 'agentforge-memory' || input.schemaVersion !== 1 || input.namespace !== namespace
    || !text(namespace, 120) || !date(input.exportedAt) || !Array.isArray(input.records)
    || !input.records.length || input.records.length > 100) throw Error('Use a version 1 AgentForge collection export with 1–100 records, at most 1 MiB, matching this collection.');
  const records = structuredClone(input.records) as OperationalMemoryRecord[];
  const allowed = new Set(['id','namespace','category','title','content','tags','projectId','taskId','commitSha','metadata','createdAt','version','updatedAt','updatedBy','archived','revisions']);
  for (const value of records) {
    if (!object(value) || Object.keys(value).some(key => !allowed.has(key)) || !text(value.id, 4096)
      || value.namespace !== namespace || !fields(value) || !date(value.createdAt)
      || !optional(value.updatedAt, date) || !optional(value.version, version)
      || !optional(value.archived, v => typeof v === 'boolean') || !optional(value.metadata, object)
      || ['projectId','taskId','commitSha','updatedBy'].some(key => !optional(value[key], v => text(v, 4096)))) throw Error('The archive contains an invalid or unsupported memory record. Nothing was imported.');
    if (value.projectId && (!store.getSpace(String(value.projectId)) || store.getSpace(String(value.projectId))?.archived)) throw Error('An archive project is missing or archived. Project identities are never silently remapped.');
    if (value.revisions !== undefined && (!Array.isArray(value.revisions) || value.revisions.length > 1000
      || value.revisions.some(revision => !object(revision) || !fields(revision) || !version(revision.version)
        || !date(revision.savedAt) || typeof revision.archived !== 'boolean'
        || !optional(revision.actorId, v => text(v, 4096))))) throw Error('The archive contains invalid revision history. Nothing was imported.');
  }
  if (new Set(records.map(record => record.id)).size !== records.length) throw Error('Duplicate identities in the archive must be resolved before import.');
  const existing = store.listOperationalMemories(namespace);
  const items = records.map(record => {
    const previous = existing.find(item => item.id === record.id);
    if (previous && !isDeepStrictEqual(previous, record)) throw Error('An imported identity conflicts with a saved memory. No records will be overwritten.');
    return {id: record.id, title: record.title, projectId: record.projectId ?? null, archived: Boolean(record.archived), action: previous ? 'unchanged' : 'add'};
  });
  const digest = createHash('sha256').update(JSON.stringify({namespace, records, items})).digest('hex');
  return {records, digest, items, imported: items.filter(item => item.action === 'add').length, unchanged: items.filter(item => item.action === 'unchanged').length};
}
