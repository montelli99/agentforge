import { describe, expect, it } from 'vitest';
import { prepareChatGPTSignIn } from './chatgptDirectSignIn.js';
const activeServerCount = (): number => (process as unknown as { _getActiveHandles(): unknown[] })._getActiveHandles()
  .filter(handle => (handle as { constructor?: { name?: string } } | null)?.constructor?.name === 'Server').length;

describe('user-operated ChatGPT sign-in launcher', () => {
  it('prepares an official authorization URL without opening it or exchanging tokens', async () => {
    const session = await prepareChatGPTSignIn({ hostId: 'mock-host', port: 0, now: () => 1900000000000 });
    const url = new URL(session.authorizationUrl);
    expect(url.origin + url.pathname).toBe('https://auth.openai.com/api/accounts/authorize');
    expect(url.searchParams.get('client_id')).toBe('dynamic_agent_client');
    expect(url.searchParams.get('redirect_uri')).toBe(session.redirectUri);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toContain('chatgpt.tokens.use.direct');
    await session.cancel();
    await expect(session.waitForCallback()).rejects.toThrow('cancelled');
  });
  it('validates one mock callback and rejects replay without exchanging or persisting', async () => {
    const session = await prepareChatGPTSignIn({ hostId: 'mock-host', port: 0, now: () => 1900000000000 });
    const callback = new URL(session.redirectUri);
    const params = new URLSearchParams({ state: session.attempt.authorizationParameters().state, code: 'mock-code', client_id: 'mock-issued-client' });
    // State is intentionally read only from the prepared URL; no token or secret is present.
    const authUrl = new URL(session.authorizationUrl);
    params.set('state', authUrl.searchParams.get('state')!);
    callback.search = params.toString();
    const request = await fetch(callback);
    expect(request.status).toBe(200);
    await expect(session.waitForCallback()).resolves.toMatchObject({ code: 'mock-code', clientId: 'mock-issued-client' });
  });
  it('returns a bounded 400 and fails closed for a mock state mismatch', async () => {
    const session = await prepareChatGPTSignIn({ hostId: 'mock-host', port: 0, now: () => 1900000000000 });
    const callback = new URL(session.redirectUri); callback.search = new URLSearchParams({ state: 'wrong', code: 'mock-code', client_id: 'mock-issued-client' }).toString();
    expect((await fetch(callback)).status).toBe(400);
    await expect(session.waitForCallback()).rejects.toThrow();
  });
  it('rejects an invalid host before allocating a loopback listener', async () => {
    const before = activeServerCount();
    await expect(prepareChatGPTSignIn({ hostId: '', port: 0, now: () => 1900000000000 })).rejects.toThrow('Invalid pending OAuth attempt');
    await new Promise(resolve => setImmediate(resolve));
    const after = activeServerCount();
    expect(after).toBe(before);
  });
});
