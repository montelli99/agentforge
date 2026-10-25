import { describe, expect, it, vi } from 'vitest';
import { DirectOAuthAttempt, directOAuthScopes } from './chatgptDirectOAuth.js';
import { exchangeDirectCallback } from './chatgptDirectExchange.js';
const now = 1900000000000;
const input = { state: 's'.repeat(43), nonce: 'n'.repeat(43), verifier: 'v'.repeat(43), redirectUri: 'http://127.0.0.1:1455/auth/callback', hostId: 'mock', requestedScopes: [...directOAuthScopes], expiresAt: now + 60000 } as const;
const callback = new DirectOAuthAttempt(input, () => now).validateCallback('http://127.0.0.1:1455/auth/callback?state=' + input.state + '&code=mock-code&client_id=mock-client');
const identity = { iss: 'https://auth.openai.com', sub: 'mock-subject', aud: 'mock-client', exp: now / 1000 + 3600, nonce: input.nonce };
describe('offline direct token exchange seam', () => {
  it('sends the exact official form through fake transport and exposes session-only credentials after validation', async () => {
    const exchange = vi.fn(async () => ({ access_token: 'mock-access', refresh_token: 'mock-refresh', id_token: 'mock-id', token_type: 'Bearer', expires_in: 3600, scope: directOAuthScopes.join(' ') }));
    const session = await exchangeDirectCallback(callback, { exchange }, { verifySignature: async () => identity }, 'mock-grant', () => now);
    expect(exchange).toHaveBeenCalledWith({ endpoint: 'https://auth.openai.com/api/accounts/oauth/token', form: expect.objectContaining({ grant_type: 'authorization_code', code: 'mock-code', resource: 'https://api.openai.com/v1' }) });
    expect(session.credentials.accessToken).toBe('mock-access'); session.discard(); expect(session.credentials.accessToken).toBe(''); expect(session.grant.scopes).toEqual([]);
  });
  it('does not expose invalid or unverified token responses', async () => {
    const exchange = vi.fn(async () => ({ access_token: 'mock-access', id_token: 'mock-id', token_type: 'Bearer', expires_in: 3600, scope: directOAuthScopes.join(' ') }));
    await expect(exchangeDirectCallback(callback, { exchange }, { verifySignature: async () => { throw Error('signature rejected'); } }, 'mock-grant', () => now)).rejects.toThrow();
  });
  it('redacts injected transport and verifier errors containing token-shaped secrets', async () => {
    const access = 'fake-access-token-value', refresh = 'fake-refresh-token-value';
    await expect(exchangeDirectCallback(callback, { exchange: async () => { throw Error(`provider failed ${access} ${refresh}`); } }, { verifySignature: async () => identity }, 'mock-grant', () => now))
      .rejects.toMatchObject({ message: 'Direct token exchange or validation failed' });
    try {
      await exchangeDirectCallback(callback, { exchange: async () => ({ access_token: access, refresh_token: refresh, id_token: 'mock-id', token_type: 'Bearer', expires_in: 3600, scope: directOAuthScopes.join(' ') }) }, { verifySignature: async () => { throw Error(`bad signature ${access} ${refresh}`); } }, 'mock-grant', () => now);
    } catch (error) {
      expect(String(error)).not.toContain(access); expect(String(error)).not.toContain(refresh);
    }
  });
});
