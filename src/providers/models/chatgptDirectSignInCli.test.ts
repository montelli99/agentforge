import { describe, expect, it, vi } from 'vitest';
import { parseSignInCliArguments, runIsolatedSignIn } from './chatgptDirectSignInCli.js';
import type { CatalogInspectionCliOptions, FirstRegistrationCliOptions, ReturningSignInCliOptions, SignInCliDependencies } from './chatgptDirectSignInCli.js';
import type { SessionCredentials } from './chatgptDirectExchange.js';
import type { ChatGPTDirectRegistrationStore } from './chatgptDirectRegistrationStore.js';
import { directOAuthScopes } from './chatgptDirectOAuth.js';

const returningOptions: ReturningSignInCliOptions = {
  mode: 'returning', hostId: 'mock-host', clientId: 'mock-issued-client', verifierRuntime: '/mock/runtime', timeoutMs: 1000,
};
const registrationOptions: FirstRegistrationCliOptions = {
  mode: 'first-registration', registrationDirectory: 'C:\\mock\\agentforge\\chatgpt-direct', verifierRuntime: '/mock/runtime', timeoutMs: 1000,
};
const inspectionOptions: CatalogInspectionCliOptions = {
  mode: 'inspect-models', registrationDirectory: 'C:\\mock\\agentforge\\chatgpt-direct', verifierRuntime: '/mock/runtime', timeoutMs: 1000,
};
const managedHostId = 'urn:uuid:00000000-0000-4000-8000-000000000001';
const issuedClientId = 'mock-issued-client';
const callbackResource = 'https://api.openai.com/v1' as const;

function harness(callbackClientId = issuedClientId) {
  const exchange = vi.fn(async () => ({ access_token: 'mock-access', refresh_token: 'mock-refresh', id_token: 'mock-id',
    token_type: 'Bearer', expires_in: 3600, scope: directOAuthScopes.join(' ') }));
  const write = vi.fn();
  let nonce = '';
  let authorization: URL | undefined;
  const deps: SignInCliDependencies = {
    write,
    openBrowser: async url => {
      authorization = new URL(url);
      nonce = authorization.searchParams.get('nonce')!;
      const callback = new URL(authorization.searchParams.get('redirect_uri')!);
      callback.search = new URLSearchParams({ state: authorization.searchParams.get('state')!, client_id: callbackClientId, code: 'mock-code' }).toString();
      expect((await fetch(callback)).status).toBe(callbackClientId === 'dynamic_agent_client' ? 400 : 200);
    },
    transport: () => ({ exchange }),
    verifier: async () => ({ verifySignature: async () => ({ iss: 'https://auth.openai.com', sub: 'mock-subject',
      aud: issuedClientId, exp: Math.floor(Date.now() / 1000) + 3600, nonce }) }),
  };
  return { deps, write, exchange, authorization: () => authorization };
}

function registrationStore() {
  const saved: Array<Record<string, string>> = [];
  const store: ChatGPTDirectRegistrationStore = {
    load: async () => ({ hostId: managedHostId }),
    prepareFirstRegistration: vi.fn(async () => ({ hostId: managedHostId })),
    saveIssuedClientId: vi.fn(async (hostId, clientId) => { saved.push({ hostId, clientId }); }),
  };
  return { store, saved };
}

describe('isolated owner-run sign-in command', () => {
  it('keeps help/default inert and parses explicit fresh and returning modes only', () => {
    expect(parseSignInCliArguments([])).toBeUndefined();
    expect(parseSignInCliArguments(['--help'])).toBeUndefined();
    expect(() => parseSignInCliArguments(['--host-id', 'host'])).toThrow();
    expect(() => parseSignInCliArguments(['--begin-sign-in', '--host-id', 'host', '--client-id', 'dynamic_agent_client', '--verifier-runtime', '/mock'])).toThrow();
    expect(() => parseSignInCliArguments(['--begin-registration', '--client-id', 'issued', '--verifier-runtime', '/mock'])).toThrow();
    expect(() => parseSignInCliArguments(['--inspect-models', '--client-id', 'issued', '--verifier-runtime', '/mock'])).toThrow();
    expect(() => parseSignInCliArguments(['--begin-sign-in', '--host-id', 'host', '--client-id', 'issued', '--verifier-runtime', '/mock', '--save-tokens', 'yes'])).toThrow();
    expect(parseSignInCliArguments(['--begin-sign-in', '--host-id', 'host', '--client-id', 'issued', '--verifier-runtime', '/mock']))
      .toMatchObject({ mode: 'returning', clientId: 'issued', timeoutMs: 120000 });
    expect(parseSignInCliArguments(['--begin-registration', '--verifier-runtime', '/mock'], 'C:\\mock\\chatgpt-direct'))
      .toEqual({ mode: 'first-registration', registrationDirectory: 'C:\\mock\\chatgpt-direct', verifierRuntime: '/mock', timeoutMs: 120000 });
    expect(parseSignInCliArguments(['--inspect-models', '--verifier-runtime', '/mock'], 'C:\\mock\\chatgpt-direct'))
      .toEqual({ mode: 'inspect-models', registrationDirectory: 'C:\\mock\\chatgpt-direct', verifierRuntime: '/mock', timeoutMs: 120000 });
  });

  it('preserves returning sign-in and discards every token after a mock exchange', async () => {
    const { deps, write, exchange } = harness();
    let captured: SessionCredentials | undefined;
    const { exchangeDirectCallback } = await import('./chatgptDirectExchange.js');
    deps.exchange = async (...args) => { captured = await exchangeDirectCallback(...args); return captured; };
    await runIsolatedSignIn(returningOptions, deps);
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(captured?.credentials.accessToken).toBe('');
    expect(captured?.credentials.refreshToken).toBe('');
    expect(captured?.credentials.idToken).toBe('');
    expect(captured?.grant.scopes).toEqual([]);
    expect(write.mock.calls.at(-1)?.[0]).toContain('credentials discarded');
    expect(JSON.stringify(write.mock.calls)).not.toMatch(/mock-access|mock-refresh|mock-id|mock-subject|mock-code/);
  });

  it('uses dynamic registration only for authorization and the callback-issued client for exchange', async () => {
    const { deps, exchange, authorization } = harness();
    const managed = registrationStore();
    deps.registrationStore = managed.store;
    let captured: SessionCredentials | undefined;
    const { exchangeDirectCallback } = await import('./chatgptDirectExchange.js');
    deps.exchange = async (...args) => { captured = await exchangeDirectCallback(...args); return captured; };
    await runIsolatedSignIn(registrationOptions, deps);
    expect(authorization()?.searchParams.get('client_id')).toBe('dynamic_agent_client');
    expect(authorization()?.searchParams.get('agent_name_hint')).toBe('AgentForge');
    expect(authorization()?.searchParams.get('ext_agent_host_id')).toBe(managedHostId);
    expect(exchange).toHaveBeenCalledWith(expect.objectContaining({ form: expect.objectContaining({ client_id: issuedClientId }) }));
    expect(managed.saved).toEqual([{ hostId: managedHostId, clientId: issuedClientId }]);
    expect(JSON.stringify(managed.saved)).not.toMatch(/mock-access|mock-refresh|mock-id|mock-code|mock-subject/);
    expect(captured?.credentials.accessToken).toBe('');
  });

  it('reauthorizes a stored registration, performs one fake catalog read, prints only listed slugs, and discards tokens', async () => {
    const { deps, write, exchange, authorization } = harness();
    const managed = registrationStore();
    deps.registrationStore = managed.store;
    managed.store.load = vi.fn(async () => ({ hostId: managedHostId, clientId: issuedClientId }));
    const inspectCatalog = vi.fn(async () => ({ models: [
      { slug: 'gpt-mock-economical', display_name: 'Private display label', visibility: 'list' },
      { slug: 'gpt-mock-hidden', display_name: 'Hidden label', visibility: 'hide' },
    ] }));
    deps.inspectCatalog = inspectCatalog;
    let captured: SessionCredentials | undefined;
    const { exchangeDirectCallback } = await import('./chatgptDirectExchange.js');
    deps.exchange = async (...args) => { captured = await exchangeDirectCallback(...args); return captured; };
    await runIsolatedSignIn(inspectionOptions, deps);
    expect(authorization()?.searchParams.get('client_id')).toBe(issuedClientId);
    expect(authorization()?.searchParams.get('ext_agent_host_id')).toBe(managedHostId);
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(inspectCatalog).toHaveBeenCalledTimes(1);
    expect(inspectCatalog).toHaveBeenCalledWith('mock-access', expect.any(AbortSignal));
    const output = write.mock.calls.map(([message]) => String(message)).join('\n');
    expect(output).toContain('gpt-mock-economical');
    expect(output).not.toMatch(/gpt-mock-hidden|Private display label|Hidden label|mock-access|mock-refresh|mock-id|mock-subject|mock-code/);
    expect(captured?.credentials.accessToken).toBe('');
    expect(captured?.credentials.refreshToken).toBe('');
    expect(captured?.credentials.idToken).toBe('');
    expect(managed.store.saveIssuedClientId).not.toHaveBeenCalled();
  });

  it('fails closed on malformed fake catalog data and still discards the session', async () => {
    const { deps } = harness();
    const managed = registrationStore();
    deps.registrationStore = managed.store;
    managed.store.load = vi.fn(async () => ({ hostId: managedHostId, clientId: issuedClientId }));
    deps.inspectCatalog = vi.fn(async () => ({ models: [{ slug: 'bad slug', display_name: 'Bad', visibility: 'list' }] }));
    const discard = vi.fn();
    deps.exchange = vi.fn(async () => ({ discard,
      credentials: { clientId: issuedClientId, subject: 'mock-subject', issuer: 'https://auth.openai.com' as const, resource: callbackResource,
        accessToken: 'mock-access', idToken: 'mock-id', tokenType: 'Bearer' as const, scopes: [...directOAuthScopes], expiresAt: Date.now() + 1000 },
      grant: { accountId: 'mock-subject', grantId: 'mock-grant', resource: callbackResource, scopes: [...directOAuthScopes], expiresAt: Date.now() + 1000 },
    }));
    await expect(runIsolatedSignIn(inspectionOptions, deps)).rejects.toThrow('No credentials saved');
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('treats an abort during synchronous catalog completion as cancellation without model or success output', async () => {
    const controller = new AbortController();
    const { deps, write } = harness();
    const managed = registrationStore();
    deps.registrationStore = managed.store;
    managed.store.load = vi.fn(async () => ({ hostId: managedHostId, clientId: issuedClientId }));
    let captured: SessionCredentials | undefined;
    const { exchangeDirectCallback } = await import('./chatgptDirectExchange.js');
    deps.exchange = async (...args) => { captured = await exchangeDirectCallback(...args); return captured; };
    deps.inspectCatalog = vi.fn(async () => {
      controller.abort();
      return { models: [{ slug: 'must-not-print', display_name: 'Must not print', visibility: 'list' }] };
    });
    await expect(runIsolatedSignIn(inspectionOptions, deps, controller.signal)).rejects.toThrow('cancelled');
    const output = write.mock.calls.map(([message]) => String(message)).join('\n');
    expect(output).not.toMatch(/must-not-print|Current account catalog|Catalog inspection completed|No provider activated/);
    expect(captured?.credentials.accessToken).toBe('');
    expect(captured?.credentials.refreshToken).toBe('');
    expect(captured?.credentials.idToken).toBe('');
  });

  it('rejects a non-issued callback client before exchange or registration persistence', async () => {
    const { deps, exchange } = harness('dynamic_agent_client');
    const managed = registrationStore();
    deps.registrationStore = managed.store;
    await expect(runIsolatedSignIn(registrationOptions, deps)).rejects.toThrow('No credentials saved');
    expect(exchange).not.toHaveBeenCalled();
    expect(managed.store.saveIssuedClientId).not.toHaveBeenCalled();
  });

  it('does not save an issued client when verification fails or registration is cancelled', async () => {
    const failed = harness();
    const failedStore = registrationStore();
    failed.deps.registrationStore = failedStore.store;
    failed.deps.verifier = async () => { throw Error('private-provider-body mock-access'); };
    await expect(runIsolatedSignIn(registrationOptions, failed.deps)).rejects.toThrow('No credentials saved');
    expect(failedStore.store.saveIssuedClientId).not.toHaveBeenCalled();
    expect(JSON.stringify(failed.write.mock.calls)).not.toContain('mock-access');

    const cancelled = harness();
    const cancelledStore = registrationStore();
    const controller = new AbortController();
    cancelled.deps.registrationStore = cancelledStore.store;
    cancelled.deps.openBrowser = async () => { controller.abort(); };
    await expect(runIsolatedSignIn(registrationOptions, cancelled.deps, controller.signal)).rejects.toThrow('cancelled');
    expect(cancelled.exchange).not.toHaveBeenCalled();
    expect(cancelledStore.store.saveIssuedClientId).not.toHaveBeenCalled();
  });

  it('treats an abort during issued-client persistence as cancellation without false success or rollback', async () => {
    const controller = new AbortController();
    const write = vi.fn();
    const discard = vi.fn();
    const cancel = vi.fn(async () => undefined);
    let persisted = false;
    const store: ChatGPTDirectRegistrationStore = {
      prepareFirstRegistration: vi.fn(async () => ({ hostId: managedHostId })),
      saveIssuedClientId: vi.fn(async () => { controller.abort(); persisted = true; }),
      load: vi.fn(async () => ({ hostId: managedHostId, ...(persisted ? { clientId: issuedClientId } : {}) })),
    };
    const callback = { clientId: issuedClientId, code: 'mock-code', verifier: 'v'.repeat(43),
      redirectUri: 'http://127.0.0.1:1455/auth/callback', resource: callbackResource, nonce: 'n'.repeat(43),
      requestedScopes: [...directOAuthScopes] };
    const deps: SignInCliDependencies = {
      registrationStore: store,
      prepare: vi.fn(async () => ({ attempt: undefined as never, authorizationUrl: 'https://auth.openai.com/mock',
        redirectUri: callback.redirectUri, cancel, waitForCallback: async () => callback })),
      openBrowser: async () => undefined,
      transport: () => ({ exchange: async () => { throw Error('unused'); } }),
      verifier: async () => ({ verifySignature: async () => { throw Error('unused'); } }),
      exchange: async () => ({ discard,
        credentials: { clientId: issuedClientId, subject: 'mock-subject', issuer: 'https://auth.openai.com', resource: callbackResource,
          accessToken: 'mock-access', idToken: 'mock-id', tokenType: 'Bearer', scopes: [], expiresAt: Date.now() + 1000 },
        grant: { accountId: 'mock-subject', grantId: 'mock-grant', resource: callbackResource, scopes: [], expiresAt: Date.now() + 1000 },
      }),
      write,
    };
    await expect(runIsolatedSignIn(registrationOptions, deps, controller.signal)).rejects.toThrow('cancelled');
    expect(store.saveIssuedClientId).toHaveBeenCalledTimes(1);
    expect(discard).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(write.mock.calls.some(([message]) => String(message).includes('Sign-in and permissions verified'))).toBe(false);
    expect(write.mock.calls.some(([message]) => String(message).includes('identifiers were saved before cancellation'))).toBe(true);
  });

  it('bounds an unanswered callback and closes the returning listener', async () => {
    const { deps, exchange } = harness();
    let redirect = '';
    deps.openBrowser = async url => { redirect = new URL(url).searchParams.get('redirect_uri')!; };
    await expect(runIsolatedSignIn(returningOptions, deps)).rejects.toThrow('timed out');
    expect(exchange).not.toHaveBeenCalled();
    await expect(fetch(redirect)).rejects.toThrow();
  });

  it('discards a late exchange result after cancellation without saving registration', async () => {
    const { deps } = harness();
    const managed = registrationStore();
    deps.registrationStore = managed.store;
    const controller = new AbortController();
    const discard = vi.fn();
    let resolve!: (value: SessionCredentials) => void;
    deps.exchange = async () => {
      controller.abort();
      return new Promise<SessionCredentials>(done => { resolve = done; });
    };
    await expect(runIsolatedSignIn(registrationOptions, deps, controller.signal)).rejects.toThrow('cancelled');
    resolve({ discard,
      credentials: { clientId: issuedClientId, subject: 'mock-subject', issuer: 'https://auth.openai.com', resource: callbackResource,
        accessToken: 'mock-access', idToken: 'mock-id', tokenType: 'Bearer', scopes: [], expiresAt: Date.now() + 1000 },
      grant: { accountId: 'mock-subject', grantId: 'mock-grant', resource: callbackResource, scopes: [], expiresAt: Date.now() + 1000 },
    });
    await new Promise(done => setImmediate(done));
    expect(discard).toHaveBeenCalledTimes(1);
    expect(managed.store.saveIssuedClientId).not.toHaveBeenCalled();
  });
});
