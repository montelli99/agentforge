import type { MemoryProvider } from '../../core/providers/memory.js';

export class MemoryConnectionUnavailable extends Error {
  constructor() { super('The saved memory provider is missing or its setup version changed. Ask the host administrator to restore the matching provider, or reconnect it using the current setup. Your saved selection has not been changed.'); }
}

export interface MemoryConnectionDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  fields: Array<{ key: string; label: string; type: 'text' | 'secret'; required: boolean }>;
  /** Trusted host code only. Network validation happens in the bounded query. */
  create(input: { namespace: string; projectId: string; config: Record<string, string> }): MemoryProvider;
}

export class MemoryConnectionRegistry {
  private definitions = new Map<string, MemoryConnectionDefinition>();
  constructor(definitions: MemoryConnectionDefinition[] = []) {
    for (const definition of definitions) {
      if (!/^[a-z][a-z0-9-]{0,63}$/.test(definition.id)
        || ['obsidian','hindsight','combined','restore','forget','disconnect','custom'].includes(definition.id)
        || this.definitions.has(definition.id) || !definition.version || definition.version.length > 64
        || !definition.name || definition.name.length > 120 || definition.description.length > 2000
        || definition.fields.length > 20 || typeof definition.create !== 'function') throw Error('Invalid memory connection definition');
      const keys = new Set<string>();
      for (const field of definition.fields) {
        if (!/^[a-z][a-zA-Z0-9_]{0,63}$/.test(field.key) || keys.has(field.key)
          || !field.label || field.label.length > 120 || !['text','secret'].includes(field.type)
          || typeof field.required !== 'boolean') throw Error('Invalid memory connection field');
        keys.add(field.key);
      }
      this.definitions.set(definition.id, { ...definition, fields: definition.fields.map(field => ({ ...field })) });
    }
  }
  list() {
    return [...this.definitions.values()].map(({ create: _, ...description }) => structuredClone(description));
  }
  connect(id: string, version: unknown, config: unknown, namespace: string, projectId: string) {
    const definition = this.definitions.get(id);
    if (!definition || definition.version !== version) throw new MemoryConnectionUnavailable();
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw Error('Invalid memory connection configuration');
    const values = config as Record<string, unknown>;
    if (Object.keys(values).some(key => !definition.fields.some(field => field.key === key))) throw Error('Unknown memory connection field');
    const validated: Record<string, string> = {};
    for (const field of definition.fields) {
      const value = values[field.key] ?? '';
      if (typeof value !== 'string' || value.length > 8192 || (field.required && !value.trim())) throw Error('Invalid memory connection value');
      validated[field.key] = value;
    }
    const provider = definition.create({ namespace, projectId, config: { ...validated } });
    return { provider, config: validated, version: definition.version };
  }
}
