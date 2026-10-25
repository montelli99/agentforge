import { describe, expect, it, vi } from 'vitest';
import { DirectTokenStore } from './chatgptDirectTokenStore.js';
import type { DirectCredentials } from './chatgptDirectOAuth.js';
const mockCredentials = (): DirectCredentials => ({ clientId: 'mock-client', subject: 'mock-subject', issuer: 'https://auth.openai.com', resource: 'https://api.openai.com/v1', accessToken: 'mock-access', refreshToken: 'mock-refresh', idToken: 'mock-id', tokenType: 'Bearer', scopes: ['resource.invoke', 'chatgpt.tokens.use.direct'], expiresAt: Date.now() + 60000 });
describe('platform token-store contract (mock backend only)', () => {
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
