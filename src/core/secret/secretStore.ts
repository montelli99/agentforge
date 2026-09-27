/**
 * Isolated Secret Store
 * Section 37: Secret Storage Separation
 * 
 * Strictly isolates credentials from WorkspaceStore JSON.
 * Secrets are never saved to workspace files, task evidence, or migration bundles.
 */

import type { SecretProvider, SecretMetadata } from "../providers/secret.js";
import { redactRuntimeValue } from "./runtimeRedaction.js";

export class IsolatedSecretStore implements SecretProvider {
  readonly id = "isolated_secret_store";
  readonly name = "Isolated Secret Store";

  private memorySecrets = new Map<string, { value: string; provider: string; updatedAt: string }>();

  async getSecret(keyName: string): Promise<string | undefined> {
    // 1. Check process.env
    if (process.env[keyName]) {
      return process.env[keyName];
    }
    // 2. Check memory/secure map
    return this.memorySecrets.get(keyName)?.value;
  }

  async setSecret(keyName: string, value: string, provider = "custom"): Promise<void> {
    this.memorySecrets.set(keyName, {
      value,
      provider,
      updatedAt: new Date().toISOString(),
    });
  }

  async hasSecret(keyName: string): Promise<boolean> {
    return !!process.env[keyName] || this.memorySecrets.has(keyName);
  }

  async deleteSecret(keyName: string): Promise<boolean> {
    return this.memorySecrets.delete(keyName);
  }

  async listSecrets(): Promise<SecretMetadata[]> {
    const list: SecretMetadata[] = [];
    const knownEnvKeys = [
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
      "TELEGRAM_BOT_TOKEN",
      "DISCORD_BOT_TOKEN",
      "RETELL_API_KEY",
    ];

    for (const key of knownEnvKeys) {
      list.push({
        keyName: key,
        provider: key.split("_")[0].toLowerCase(),
        configured: !!process.env[key],
        source: "env",
      });
    }

    for (const [key, item] of this.memorySecrets.entries()) {
      if (!list.some(s => s.keyName === key)) {
        list.push({
          keyName: key,
          provider: item.provider,
          configured: true,
          lastUpdated: item.updatedAt,
          source: "local_secure",
        });
      }
    }

    return list;
  }

  /**
   * Sanitizes data before it crosses into durable artifacts. This uses both
   * credential-shaped keys and credential-shaped values, including short values.
   */
  sanitizeData<T>(data: T): T {
    return redactRuntimeValue(data) as T;
  }
}
