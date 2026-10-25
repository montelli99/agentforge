import { describe, expect, it, vi } from 'vitest';
import { DirectTokenStore } from './chatgptDirectTokenStore.js';
import type { DirectCredentials } from './chatgptDirectOAuth.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { WindowsDirectCredentialBackend } from './windowsDirectCredentialBackend.js';
const mockCredentials = (): DirectCredentials => ({ clientId: 'mock-client', subject: 'mock-subject', issuer: 'https://auth.openai.com', resource: 'https://api.openai.com/v1', accessToken: 'mock-access', refreshToken: 'mock-refresh', idToken: 'mock-id', tokenType: 'Bearer', scopes: ['resource.invoke', 'chatgpt.tokens.use.direct'], expiresAt: Date.now() + 60000 });
describe('platform token-store contract and Windows persistence', () => {
  it.skipIf(process.platform !== 'win32')('round-trips synthetic records through real Windows DPAPI and rejects tampering', async () => {
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'af-dpapi-'));
    try {
      const store=new DirectTokenStore(new WindowsDirectCredentialBackend(directory));
      const credentials=mockCredentials();
      await store.replace(credentials);
      const files=await fs.readdir(directory);expect(files).toHaveLength(1);
      const file=path.join(directory,files[0]);
      expect((await fs.readFile(file)).includes(Buffer.from(credentials.accessToken))).toBe(false);
      const reopened=new DirectTokenStore(new WindowsDirectCredentialBackend(directory));
      expect(await reopened.read(credentials.clientId,credentials.subject)).toEqual(credentials);
      await reopened.replace({...credentials,refreshToken:'synthetic-rotated-token'});
      expect((await store.read(credentials.clientId,credentials.subject))?.refreshToken).toBe('synthetic-rotated-token');
      const damaged=await fs.readFile(file);damaged[Math.floor(damaged.length/2)]^=1;await fs.writeFile(file,damaged);
      await expect(store.read(credentials.clientId,credentials.subject)).rejects.toThrow('protection failed');
      await store.remove(credentials.clientId,credentials.subject);
      expect(await store.read(credentials.clientId,credentials.subject)).toBeUndefined();
    } finally {
      if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('af-dpapi-'))throw Error('Unexpected test directory');
      await fs.rm(directory,{recursive:true,force:true});
    }
  },30000);
  it('has no default persistence or credential discovery', async () => {
    const store = new DirectTokenStore(); expect(store.isAvailable()).toBe(false);
    await expect(store.read('mock-client', 'mock-subject')).rejects.toThrow('unavailable');
    await expect(store.replace(mockCredentials())).rejects.toThrow('unavailable');
    await expect(store.remove('mock-client', 'mock-subject')).rejects.toThrow('unavailable');
  });
  it('namespaces exact account/client records and atomically replaces rotating tokens', async () => {
    const records = new Map<string, DirectCredentials>();
    const backend = { protection: 'platform-user-protected' as const, read: vi.fn(async (key: string) => records.get(key)), replace: vi.fn(async (key: string, value: DirectCredentials) => { records.set(key, value); }), remove: vi.fn(async (key: string) => { records.delete(key); }) };
    const store = new DirectTokenStore(backend), credentials = mockCredentials();
    await store.replace(credentials); const key = backend.replace.mock.calls[0]![0];
    expect(key).toMatch(/^AgentForge\/chatgpt-direct\/[a-f0-9]{64}$/); expect(key).not.toContain(credentials.subject);
    await store.replace({ ...credentials, accessToken: 'mock-access-rotated', refreshToken: 'mock-refresh-rotated' });
    expect((await store.read(credentials.clientId, credentials.subject))?.refreshToken).toBe('mock-refresh-rotated');
    expect(await store.read('other-client', credentials.subject)).toBeUndefined();
    await store.remove(credentials.clientId, credentials.subject); expect(await store.read(credentials.clientId, credentials.subject)).toBeUndefined();
    await expect(store.replace({ ...credentials, resource: 'wrong' as never })).rejects.toThrow();
  });
  it('rejects a swapped identity returned by a backend', async () => {
    const store = new DirectTokenStore({ protection: 'platform-user-protected', read: async () => ({ ...mockCredentials(), subject: 'wrong' }), replace: async () => {}, remove: async () => {} });
    await expect(store.read('mock-client', 'mock-subject')).rejects.toThrow('identity');
  });
});
