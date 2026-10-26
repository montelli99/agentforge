import type {OperationalMemoryRecord} from '../../core/providers/memory.js';

/** Parse only AgentForge's explicitly versioned, JSON-valued Markdown header.
 * Ordinary Markdown remains ordinary text. No YAML tags, evaluation or links.
 */
export function readPortableMarkdown(text: string, namespace: string, projectId: string): Partial<OperationalMemoryRecord> | undefined {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return undefined;
  const end = text.indexOf('\n---', 4);
  if (end < 0) {
    if (/^agentforge_format: "agentforge-memory"\r?$/m.test(text)) throw Error('Incomplete AgentForge memory export');
    return undefined;
  }
  const header = text.slice(text.indexOf('\n') + 1, end).replace(/\r$/, '');
  if (!/^agentforge_format: "agentforge-memory"\r?$/m.test(header)) return undefined;
  const fields: Record<string, unknown> = Object.create(null);
  for (const line of header.split(/\r?\n/)) {
    const match = line.match(/^([a-z_]+): (.*)$/);
    if (!match || Object.hasOwn(fields, match[1])) throw Error('Invalid AgentForge memory header');
    try {fields[match[1]] = JSON.parse(match[2]);} catch {throw Error('Invalid AgentForge memory header');}
  }
  if (fields.agentforge_schema !== 1) throw Error('Unsupported AgentForge memory export version');
  if (fields.agentforge_namespace !== namespace || fields.agentforge_project !== projectId)
    throw Error('Exported memory scope differs from the selected project or collection');
  const categories = ['task_history','repo_history','worktree_history','commit','test_failure','deployment','approval','artifact','do_not_repeat','project_constraint','general_fact'];
  const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
  if (typeof fields.agentforge_id !== 'string' || !fields.agentforge_id || fields.agentforge_id.length > 4096
    || !Number.isSafeInteger(fields.agentforge_version) || (fields.agentforge_version as number) < 1
    || typeof fields.agentforge_category !== 'string' || !categories.includes(fields.agentforge_category)
    || typeof fields.agentforge_archived !== 'boolean' || !date(fields.agentforge_created) || !date(fields.agentforge_updated)
    || !Array.isArray(fields.tags) || fields.tags.length > 100 || fields.tags.some(tag => typeof tag !== 'string' || tag.length > 256))
    throw Error('Invalid AgentForge memory fields');
  const remainder = text.slice(end + 1);
  const body = remainder.match(/^---\r?\n\r?\n# ([^\r\n]*)\r?\n\r?\n([\s\S]*)$/);
  if (!body || body[1].length > 4096) throw Error('Invalid AgentForge memory body');
  // The serializer adds one terminal newline; retain the original body exactly.
  const content = text.startsWith('---\r\n') && body[2].endsWith('\r\n') ? body[2].slice(0, -2) : body[2].endsWith('\n') ? body[2].slice(0, -1) : body[2];
  if (fields.agentforge_title !== undefined && (typeof fields.agentforge_title !== 'string' || fields.agentforge_title.length > 4096))
    throw Error('Invalid AgentForge memory title');
  const source = fields.agentforge_source as Record<string, unknown> | undefined;
  if (source !== undefined && (!source || typeof source !== 'object' || Array.isArray(source)
    || typeof source.alias !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(source.alias)
    || typeof source.providerId !== 'string' || source.providerId.length > 128
    || typeof source.recordId !== 'string' || source.recordId.length > 1024)) throw Error('Invalid AgentForge memory provenance');
  return {title: fields.agentforge_title === undefined ? body[1] : fields.agentforge_title as string, content, category: fields.agentforge_category as OperationalMemoryRecord['category'],
    tags: fields.tags as string[], archived: fields.agentforge_archived, version: fields.agentforge_version as number,
    createdAt: fields.agentforge_created, updatedAt: fields.agentforge_updated,
    metadata: {importedRecordId: fields.agentforge_id, ...(source ? {memorySource: {alias: source.alias, providerId: source.providerId, recordId: source.recordId}} : {})}};
}
