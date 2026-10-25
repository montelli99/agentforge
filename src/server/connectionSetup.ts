import fs from 'node:fs/promises';
import { EncryptedConnectionStore } from '../core/secret/encryptedConnectionStore.js';
import { configureModelConnections, type ModelConnectionProfile } from '../providers/models/modelConnections.js';

const metadataKey = 'AGENTFORGE_KEY_CONFIGURATION';
/** Credentials and profiles live in one encrypted, atomic record outside the repository. */
export class ConnectionSetup {
  private vault: EncryptedConnectionStore;
  private nextAttempt = 0;
  constructor(private file: string) { this.vault = new EncryptedConnectionStore(file); }
  async exists() { try { await fs.lstat(this.file); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; } }
  private throttle() {
    if (Date.now() < this.nextAttempt) throw Error('Wait a few seconds before trying again.');
    this.nextAttempt = Date.now() + 3000;
  }
  private decode(values: Record<string, string>) {
    const profiles = JSON.parse(values[metadataKey] || 'null');
    if (!Array.isArray(profiles) || !profiles.length || profiles.length > 20) throw Error('Invalid saved connections.');
    return profiles as ModelConnectionProfile[];
  }
  async unlock(passphrase: string) {
    this.throttle();
    const values = await this.vault.unlock(passphrase);
    return configureModelConnections(this.decode(values), values);
  }
  async save(profile: ModelConnectionProfile, apiKey: string, passphrase: string) {
    this.throttle();
    const values = await this.exists() ? await this.vault.unlock(passphrase) : {};
    const profiles = values[metadataKey] ? this.decode(values) : [];
    // Never accept a caller-controlled secret reference or arbitrary profile properties.
    const reference = 'AGENTFORGE_KEY_' + String(profile.id).replace(/-/g, '_').toUpperCase();
    if (reference === metadataKey) throw Error('Choose a different connection name.');
    if (typeof apiKey !== 'string' || apiKey.length > 16384) throw Error('Invalid API key.');
    const clean: ModelConnectionProfile = { id: profile.id, provider: profile.provider, models: profile.models,
      ...(profile.baseUrl ? { baseUrl: profile.baseUrl } : {}), ...(profile.provider === 'local' ? {} : { apiKeyEnv: reference }) };
    // Replacing one connection must not overwrite another connection's credential.
    if (profiles.some(p => p.id !== clean.id && p.apiKeyEnv === reference)) throw Error('Connection name conflicts with an existing credential.');
    delete values[reference];
    if (apiKey) values[reference] = apiKey;
    const next = [...profiles.filter(p => p.id !== clean.id), clean];
    if (next.length > 20) throw Error('A maximum of 20 connections is supported.');
    const configuration = configureModelConnections(next, values);
    values[metadataKey] = JSON.stringify(next);
    await this.vault.save(values, passphrase);
    return configuration;
  }
}
