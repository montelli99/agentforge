/**
 * StorageProvider and SecretProvider Interfaces
 */

export interface StorageProvider {
  readonly id: string;

  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  saveArtifact(name: string, data: Buffer | string, mimeType: string): Promise<{ url: string; sha256: string }>;
}

export interface SecretProvider {
  readonly id: string;

  getSecret(key: string, context?: { agentId?: string; taskId?: string }): Promise<string | null>;
  hasSecret(key: string): Promise<boolean>;
}
