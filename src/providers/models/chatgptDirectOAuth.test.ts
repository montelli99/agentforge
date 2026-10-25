import { describe, expect, it, vi } from 'vitest';
import { DirectOAuthAttempt, directOAuthScopes, pkceS256, validateDirectTokenResponse } from './chatgptDirectOAuth.js';
import type { OAuthAttemptInput, ValidatedCallback, VerifiedIdentity } from './chatgptDirectOAuth.js';
const timestamp = 1900000000000;
const input = (): OAuthAttemptInput => ({ state: 's'.repeat(43), nonce: 'n'.repeat(43), verifier: 'v'.repeat(43), redirectUri: 'http://127.0.0.1:1455/auth/callback', hostId: 'mock-host', requestedScopes: [...directOAuthScopes], expiresAt: timestamp + 60000 });
const callback = (changes: Record<string, string> = {}) => 'http://127.0.0.1:1455/auth/callback?' + new URLSearchParams({ state: 's'.repeat(43), code: 'mock-code', client_id: 'mock-issued-client', ...changes }).toString();
const validated = (): ValidatedCallback => new DirectOAuthAttempt(input(), () => timestamp).validateCallback(callback());
const identity = (): VerifiedIdentity => ({ iss: 'https://auth.openai.com', sub: 'mock-subject', aud: 'mock-issued-client', exp: timestamp / 1000 + 3600, nonce: 'n'.repeat(43) });
const tokens = () => ({ access_token: 'mock-access', refresh_token: 'mock-refresh', id_token: 'mock-id-token', token_type: 'Bearer', expires_in: 3600, scope: directOAuthScopes.join(' ') });
describe('offline OAuth state/PKCE/callback validation', () => {
  it('matches the RFC7636 S256 test vector without generating entropy', () => {
    expect(pkceS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    expect(() => pkceS256('short')).toThrow();
  });
  it('prepares reviewable parameters without contacting auth and uses issued registration on return', () => {
    const attempt = new DirectOAuthAttempt(input(), () => timestamp);
    expect(attempt.authorizationParameters()).toMatchObject({ client_id: 'dynamic_agent_client', agent_name_hint: 'AgentForge', code_challenge_method: 'S256', resource: 'https://api.openai.com/v1' });
    const returned = new DirectOAuthAttempt({ ...input(), clientId: 'mock-issued-client', selectedSubject: 'mock-subject' }, () => timestamp);
    expect(returned.authorizationParameters()).not.toHaveProperty('agent_name_hint');
    expect(returned.validateCallback(callback()).clientId).toBe('mock-issued-client');
  });
  it('binds exact redirect, state, issued client and single-use callback', () => {
    const a = new DirectOAuthAttempt(input(), () => timestamp);
    expect(a.validateCallback(callback())).toMatchObject({ code: 'mock-code', verifier: 'v'.repeat(43), redirectUri: input().redirectUri });
    expect(() => a.validateCallback(callback())).toThrow('replay');
    for (const uri of [callback({ state: 'wrong' }), callback().replace(':1455', ':1456'), callback().replace('127.0.0.1', 'localhost'), callback().replace('/auth/callback', '/callback'), callback({ client_id: 'dynamic_agent_client' }), callback({ client_id: '' }), callback() + '&state=duplicate']) {
      expect(() => new DirectOAuthAttempt(input(), () => timestamp).validateCallback(uri)).toThrow();
    }
    expect(() => new DirectOAuthAttempt({ ...input(), clientId: 'original' }, () => timestamp).validateCallback(callback())).toThrow('client');
  });
  it('binds returning identity hints to an explicitly selected registration', () => {
    const returning={...input(),clientId:'mock-issued-client',selectedSubject:'mock-subject',idTokenHint:'synthetic-retained-id'};
    const attempt=new DirectOAuthAttempt(returning,()=>timestamp);
    expect(attempt.authorizationParameters()).toMatchObject({client_id:'mock-issued-client',id_token_hint:'synthetic-retained-id'});
    expect(attempt.validateCallback(callback())).toMatchObject({selectedSubject:'mock-subject'});
    for(const changes of [{clientId:undefined},{selectedSubject:undefined},{idTokenHint:'bad\nvalue'}]) {
      expect(()=>new DirectOAuthAttempt({...returning,...changes},()=>timestamp)).toThrow('Invalid pending');
    }
  });
  it('consumes denied, expired and malformed attempts without returning an exchange', () => {
    const a = new DirectOAuthAttempt(input(), () => timestamp);
    expect(() => a.validateCallback(callback({ error: 'access_denied' }))).toThrow('denied');
    expect(() => a.validateCallback(callback())).toThrow('replay');
    let now = timestamp; const expired = new DirectOAuthAttempt(input(), () => now); now += 60001;
    expect(() => expired.validateCallback(callback())).toThrow('binding');
    for (const change of [{ state: 'short' }, { requestedScopes: [...directOAuthScopes, 'extra'] }, { requestedScopes: ['openid'] }, { redirectUri: 'http://localhost:1455/auth/callback' }]) {
      expect(() => new DirectOAuthAttempt({ ...input(), ...change }, () => timestamp)).toThrow();
    }
  });
  it('uses token-response permissions and mandatory verified identity, not callback scope', async () => {
    const verifySignature = vi.fn(async () => identity());
    const result = await validateDirectTokenResponse(validated(), tokens(), { verifySignature }, 'mock-grant', () => timestamp);
    expect(verifySignature).toHaveBeenCalledWith('mock-id-token');
    expect(result.grant).toMatchObject({ accountId: 'mock-subject', grantId: 'mock-grant', scopes: [...directOAuthScopes] });
    expect(result.credentials.accessToken).toBe('mock-access');
    for (const change of [{ scope: 'openid email' }, { scope: directOAuthScopes.join(' ') + ' extra' }, { token_type: 'other' }, { expires_in: 0 }]) {
      await expect(validateDirectTokenResponse(validated(), { ...tokens(), ...change }, { verifySignature }, 'mock-grant', () => timestamp)).rejects.toThrow();
    }
    await expect(validateDirectTokenResponse(validated(), tokens(), { verifySignature: async () => { throw Error('signature rejected'); } }, 'mock-grant', () => timestamp)).rejects.toThrow('signature');
  });
  it.each([{ iss: 'wrong' }, { aud: 'other-client' }, { nonce: 'wrong' }, { exp: timestamp / 1000 }, { sub: 'other-account' }])('rejects verified-claim mismatch %j', async change => {
    await expect(validateDirectTokenResponse({ ...validated(), selectedSubject: 'mock-subject' }, tokens(), { verifySignature: async () => ({ ...identity(), ...change }) }, 'mock-grant', () => timestamp)).rejects.toThrow('identity');
  });
});
