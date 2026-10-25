import {describe, it, expect} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {memoryMarkdown} from '../../server/ui/memoryExport.js';
import {readPortableMarkdown} from './portableMarkdown.js';
import {ObsidianMemoryProvider} from './obsidianMemory.js';
import type {OperationalMemoryRecord} from '../../core/providers/memory.js';
const saved: OperationalMemoryRecord = {id: 'original', namespace: 'workspace', projectId: 'selected',
  category: 'do_not_repeat', title: 'Preserve this lesson', content: 'Exact body\n---\nUnicode 🌍\n',
  tags: ['lesson'], archived: true, version: 3, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
  metadata: {memorySource: {alias: 'notes', providerId: 'original-provider', recordId: 'original-source'}}};
describe('versioned Markdown memory portability', () => {
  it('round-trips saved content and provenance with explicit scope', () => {
    const recovered = readPortableMarkdown(memoryMarkdown(saved), 'workspace', 'selected');
    expect(recovered).toMatchObject({title: saved.title, content: saved.content, category: saved.category,
      archived: true, version: 3, tags: saved.tags, createdAt: saved.createdAt, updatedAt: saved.updatedAt,
      metadata: {importedRecordId: saved.id, memorySource: saved.metadata!.memorySource}});
  });
  it('does not reinterpret ordinary or older unversioned Markdown', () => {
    expect(readPortableMarkdown('---\ntitle: ordinary\n---\nHello', 'workspace', 'selected')).toBeUndefined();
    expect(readPortableMarkdown('---\nagentforge_id: "old"\n---\nHello', 'workspace', 'selected')).toBeUndefined();
  });
  it('rejects mismatched scope and unsupported or damaged exports', () => {
    const text = memoryMarkdown(saved);
    expect(() => readPortableMarkdown(text, 'other', 'selected')).toThrow('scope differs');
    expect(() => readPortableMarkdown(text, 'workspace', 'other')).toThrow('scope differs');
    expect(() => readPortableMarkdown(text.replace('agentforge_schema: 1', 'agentforge_schema: 2'), 'workspace', 'selected')).toThrow('version');
    expect(() => readPortableMarkdown(text.replace('tags: ["lesson"]', 'tags: !unsafe'), 'workspace', 'selected')).toThrow('header');
    expect(() => readPortableMarkdown(text.replace('agentforge_archived: true', 'agentforge_archived: "true"'), 'workspace', 'selected')).toThrow('fields');
  });
  it('reads a selected exported note without reactivating archived memory or losing lessons', async () => {
    const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'af-portable-memory-')));
    try {
      const file = path.join(directory, 'selected.md');
      await fs.writeFile(file, memoryMarkdown(saved));
      const provider = new ObsidianMemoryProvider(directory, 'workspace', 'selected', ['selected.md']);
      expect(await provider.query({namespace: 'workspace', projectId: 'selected'})).toEqual([]);
      const archived = await provider.query({namespace: 'workspace', projectId: 'selected', includeArchived: true, categories: ['do_not_repeat'], tags: ['lesson']});
      expect(archived).toHaveLength(1);
      expect(archived[0].record.content).toBe(saved.content);
      expect(await provider.getDoNotRepeatRules('workspace', 'selected')).toEqual([]);
      await fs.writeFile(file, memoryMarkdown({...saved, archived: false}));
      expect(await provider.getDoNotRepeatRules('workspace', 'selected')).toHaveLength(1);
      expect(await provider.query({namespace: 'workspace', projectId: 'selected', tags: ['lesson', 'missing']})).toEqual([]);
      await expect(new ObsidianMemoryProvider(directory, 'workspace', 'other', ['selected.md']).query({namespace: 'workspace', projectId: 'other'})).rejects.toThrow('scope differs');
    } finally {
      if (path.dirname(directory) !== await fs.realpath(os.tmpdir()) || !path.basename(directory).startsWith('af-portable-memory-')) throw Error('Invalid fixture cleanup');
      await fs.rm(directory, {recursive: true, force: true});
    }
  });
});
