/** Standalone so the browser and acceptance tests use the same serializer.
 * Export saved text and public provenance only, never arbitrary adapter metadata.
 */
export function memoryMarkdown(record: {
  id: string; namespace: string; projectId?: string; version?: number; category: string;
  archived?: boolean; updatedAt?: string; createdAt: string; tags: string[];
  title: string; content: string; metadata?: Record<string, unknown>;
}): string {
  const source = record.metadata?.memorySource;
  const provenance = source && typeof source === 'object' && !Array.isArray(source)
    ? source as Record<string, unknown> : undefined;
  const publicSource = provenance && typeof provenance.alias === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(provenance.alias)
    && typeof provenance.providerId === 'string' && provenance.providerId.length <= 128
    && typeof provenance.recordId === 'string' && provenance.recordId.length <= 1024
    ? {alias: provenance.alias, providerId: provenance.providerId, recordId: provenance.recordId} : undefined;
  return ['---',
    'agentforge_id: ' + JSON.stringify(record.id),
    'agentforge_namespace: ' + JSON.stringify(record.namespace),
    'agentforge_project: ' + JSON.stringify(record.projectId || null),
    'agentforge_version: ' + JSON.stringify(record.version || 1),
    'agentforge_category: ' + JSON.stringify(record.category),
    'agentforge_archived: ' + JSON.stringify(Boolean(record.archived)),
    'agentforge_created: ' + JSON.stringify(record.createdAt),
    'agentforge_updated: ' + JSON.stringify(record.updatedAt || record.createdAt),
    ...(publicSource ? ['agentforge_source: ' + JSON.stringify(publicSource)] : []),
    'tags: ' + JSON.stringify(record.tags || []), '---', '',
    '# ' + record.title.replace(/[\r\n]+/g, ' '), '', record.content, '',
  ].join('\n');
}
