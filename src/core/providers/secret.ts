/**
 * Secret Provider Contract
 * Section 37: Secret Storage Separation
 * 
 * CORE INVARIANT: Provider secrets are NEVER serialized into WorkspaceStore JSON,
 * package manifests, or migration export files.
 */

export interface SecretMetadata {
  keyName: string;
  provider: string;
  configured: boolean;
  lastUpdated?: string;
  source: "env" | "local_secure" | "manual";
}

export interface SecretProvider {
  readonly id: string;
  readonly name: string;

  getSecret(keyName: string): Promise<string | undefined>;
  setSecret(keyName: string, value: string, provider?: string): Promise<void>;
  hasSecret(keyName: string): Promise<boolean>;
  deleteSecret(keyName: string): Promise<boolean>;
  listSecrets(): Promise<SecretMetadata[]>;
  sanitizeData<T>(data: T): T;
}
