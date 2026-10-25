import { createHash } from 'node:crypto';
import type { DirectCredentials } from './chatgptDirectOAuth.js';

function validateStoredRecord(credentials: DirectCredentials): void {
  if (credentials.issuer !== 'https://auth.openai.com' || credentials.resource !== 'https://api.openai.com/v1'
    || credentials.tokenType !== 'Bearer' || typeof credentials.accessToken !== 'string' || !credentials.accessToken
    || typeof credentials.idToken !== 'string' || !credentials.idToken || !Number.isFinite(credentials.expiresAt)
    || !Array.isArray(credentials.scopes) || credentials.scopes.some(scope => typeof scope !== 'string')
    || !['resource.invoke', 'chatgpt.tokens.use.direct'].every(scope => credentials.scopes.includes(scope)))
    throw Error('Invalid credential record');
}

export interface LockedCredentialRecord {
  read(): Promise<DirectCredentials | undefined>;
  replace(credentials: DirectCredentials): Promise<void>;
  remove(): Promise<void>;
}

export interface PlatformProtectedCredentialBackend {
  /** Implement only with a vetted platform credential API under the current user.
   * This declaration is not proof of protection; deployment must vet the backend. */
  readonly protection: 'platform-user-protected';
  read(key: string): Promise<DirectCredentials | undefined>;
  /** Atomically replace the complete rotating token record. Never log plaintext. */
  replace(key: string, credentials: DirectCredentials): Promise<void>;
  remove(key: string): Promise<void>;
  transaction?<T>(key: string, operation: (record: LockedCredentialRecord) => Promise<T>): Promise<T>;
}
/** An explicit platform backend is required; Windows DPAPI is implemented separately.
 * No plaintext file, environment discovery, custom crypto or foreign-token fallback. */
export class DirectTokenStore {
  constructor(private readonly backend?: PlatformProtectedCredentialBackend) {}
  isAvailable(): boolean { return this.backend?.protection === 'platform-user-protected'; }
  private target(clientId: string, subject: string): { backend: PlatformProtectedCredentialBackend; key: string } {
    if (!this.isAvailable()) throw Error('Platform-protected AgentForge token storage unavailable');
    if (!clientId || clientId === 'dynamic_agent_client' || !subject || clientId.length > 256 || subject.length > 256 || /[\x00-\x20\x7f]/.test(clientId + subject)) throw Error('Invalid credential record identity');
    return { backend: this.backend!, key: 'AgentForge/chatgpt-direct/' + createHash('sha256').update(JSON.stringify([clientId, subject])).digest('hex') };
  }
  async read(clientId: string, subject: string): Promise<DirectCredentials | undefined> {
    const { backend, key } = this.target(clientId, subject), record = await backend.read(key);
    if (record && (record.clientId !== clientId || record.subject !== subject || record.issuer !== 'https://auth.openai.com' || record.resource !== 'https://api.openai.com/v1')) throw Error('Credential-store identity mismatch');
    // Retrieval is not grant validation: identity, expiry and scopes must be revalidated.
    return record;
  }
  async replace(credentials: DirectCredentials): Promise<void> {
    const { backend, key } = this.target(credentials.clientId, credentials.subject);
    validateStoredRecord(credentials);
    if (credentials.expiresAt <= Date.now()) throw Error('Invalid credential record');
    await backend.replace(key, { ...credentials, scopes: [...credentials.scopes] });
  }
  async remove(clientId: string, subject: string): Promise<void> { const { backend, key } = this.target(clientId, subject); await backend.remove(key); }
  async transaction<T>(clientId:string,subject:string,operation:(record:LockedCredentialRecord)=>Promise<T>):Promise<T> {
    const {backend,key}=this.target(clientId,subject);
    if(!backend.transaction)throw Error('Exclusive credential transactions unavailable');
    return backend.transaction(key,record=>operation({
      read:async()=>{const value=await record.read();if(value&&(value.clientId!==clientId||value.subject!==subject||value.issuer!=='https://auth.openai.com'||value.resource!=='https://api.openai.com/v1'))throw Error('Credential-store identity mismatch');return value;},
      // Expired access tokens may be retained with renewal intent; that is not a usable grant.
      replace:async value=>{if(value.clientId!==clientId||value.subject!==subject)throw Error('Credential-store identity mismatch');validateStoredRecord(value);await record.replace({...value,scopes:[...value.scopes]});},
      remove:()=>record.remove(),
    }));
  }
}
