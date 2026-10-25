import {expect, it, vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CompositeMemoryProvider} from './compositeMemory.js';
import {ObsidianMemoryProvider} from './obsidianMemory.js';
import {HindsightMemoryProvider} from './hindsightMemory.js';

it('composes actual selected-file and cloud adapters, preserves provenance, and fails closed during outage', async () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'agentforge-memory-composition-')));
  try {
    fs.writeFileSync(path.join(root, 'selected.md'), 'Synthetic launch color is blue.');
    fs.writeFileSync(path.join(root, 'unselected.md'), 'This synthetic file must never enter recall.');
    let unavailable = false;
    const request = vi.fn<typeof fetch>(async (_url, options) => {
      expect(options?.headers).toMatchObject({Authorization: 'Bearer synthetic-token'});
      if (unavailable) return new Response('unavailable', {status: 503});
      return Response.json({results: [{id: 'cloud-fact', text: 'Synthetic launch date is Monday.', tags: ['chat-context'], mentioned_at: '2026-01-01T00:00:00Z'}]});
    });
    const make = () => new CompositeMemoryProvider('workspace', 'project', [
      {alias: 'notes', provider: new ObsidianMemoryProvider(root, 'workspace', 'project', ['selected.md'])},
      {alias: 'cloud', provider: new HindsightMemoryProvider('synthetic-bank', 'workspace', 'project', 'synthetic-token', request)},
    ]);
    const query = {namespace: 'workspace', projectId: 'project', queryText: 'launch', limit: 8};
    const before = await make().query(query);
    expect(before.map(item => item.record.metadata?.memorySource)).toEqual([
      expect.objectContaining({alias: 'notes', providerId: 'obsidian'}),
      expect.objectContaining({alias: 'cloud', providerId: 'hindsight'}),
    ]);
    expect(JSON.stringify(before)).not.toContain('must never enter recall');
    expect((await make().query(query)).map(item => item.record.id)).toEqual(before.map(item => item.record.id));
    await expect(make().query({...query, projectId: 'other-project'})).resolves.toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
    unavailable = true;
    await expect(make().query(query)).rejects.toThrow('no complete result is available');
    unavailable = false;
    expect((await make().query(query)).map(item => item.record.id)).toEqual(before.map(item => item.record.id));
    expect(fs.readFileSync(path.join(root, 'selected.md'), 'utf8')).toBe('Synthetic launch color is blue.');
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
