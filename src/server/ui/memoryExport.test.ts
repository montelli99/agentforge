import {describe, it, expect} from 'vitest';
import {runInNewContext} from 'node:vm';
import {memoryMarkdown} from './memoryExport.js';
import {memoryClient} from './memoryClient.js';

const record = {id: 'notes:source%2Fone', namespace: 'workspace', projectId: 'synthetic-project',
  version: 3, category: 'general_fact', archived: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
  tags: ['quoted "tag"', 'Unicode 🌍'], title: 'A title\nwith a newline', content: 'Exact body\n---\nUnicode 你好\n',
  metadata: {apiKey: 'synthetic-secret-not-exportable', memorySource: {alias: 'notes', providerId: 'obsidian', recordId: 'source/one', credential: 'synthetic-secret-not-exportable'}}};

describe('portable Markdown memory export', () => {
  it('preserves scope, timestamps, version and whitelisted source attribution without adapter secrets', () => {
    const output = memoryMarkdown(record);
    expect(output).toContain('agentforge_project: "synthetic-project"');
    expect(output).toContain('agentforge_version: 3');
    expect(output).toContain('agentforge_archived: true');
    expect(output).toContain('agentforge_created: "2026-01-01T00:00:00Z"');
    expect(output).toContain('agentforge_updated: "2026-01-02T00:00:00Z"');
    expect(output).toContain('agentforge_source: {"alias":"notes","providerId":"obsidian","recordId":"source/one"}');
    expect(output).toContain('tags: ' + JSON.stringify(record.tags));
    expect(output).toContain('# A title with a newline\n\n' + record.content);
    expect(output).not.toContain('synthetic-secret-not-exportable');
    expect(output).not.toContain('credential');
  });

  it('omits malformed provenance and exports shared scope explicitly', () => {
    const output = memoryMarkdown({...record, projectId: undefined, metadata: {memorySource: {alias: 'bad\nfield', providerId: 'synthetic', recordId: 'one'}}});
    expect(output).toContain('agentforge_project: null');
    expect(output).not.toContain('agentforge_source:');
  });

  it('ships the same standalone serializer in the UI script', () => {
    // Execute the script definitions only; this is not rendered browser acceptance.
    const output = runInNewContext(memoryClient + '\nmemoryMarkdown(record);', {record}, {timeout: 1000});
    expect(output).toBe(memoryMarkdown(record));
    expect(memoryClient).toContain('new Blob([memoryMarkdown(record)]');
  });
});
