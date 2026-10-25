import { generateKeyPairSync, sign } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedCatalogTransport, createIsolatedIdentityVerifier, createIsolatedTokenTransport, createIsolatedRefreshTransport, loadVerifiedSignInRuntime, openOfficialSignInBrowser } from './chatgptDirectSignInRuntime.js';
import type { ValidatedCallback } from './chatgptDirectOAuth.js';

const callback: ValidatedCallback = { clientId: 'mock-client', code: 'mock-code', verifier: 'v'.repeat(43), redirectUri: 'http://127.0.0.1:1455/auth/callback', resource: 'https://api.openai.com/v1', nonce: 'n'.repeat(43), requestedScopes: [] };
const form = { grant_type: 'authorization_code' as const, client_id: callback.clientId, code: callback.code, code_verifier: callback.verifier, redirect_uri: callback.redirectUri, resource: callback.resource };
const endpoint = 'https://auth.openai.com/api/accounts/oauth/token' as const;
const bundlePath = fileURLToPath(new URL('./assets/offline-id-token-verifier.mjs', import.meta.url));
const temporaryPaths: string[] = [];

async function createRuntimeCopy(): Promise<string> {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-signin-runtime-')));
  temporaryPaths.push(directory);
  await fs.copyFile(bundlePath, path.join(directory, 'offline-id-token-verifier.mjs'));
  return directory;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporaryPaths.splice(0).map(target => fs.rm(target, { recursive: true, force: true })));
});

describe('verifier runtime integrity', () => {
  it('executes the pinned self-contained bytes and verifies an RS256 token', async () => {
    const runtime = await createRuntimeCopy();
    const factory = await loadVerifiedSignInRuntime(runtime);
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const publicJwk = { ...publicKey.export({ format: 'jwk' }), kid: 'qa-key', alg: 'RS256' };
    const now = Date.now();
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: publicJwk.kid })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: 'https://auth.openai.com', sub: 'qa-subject', aud: 'qa-client', nonce: 'qa-nonce', exp: Math.floor(now / 1000) + 60 })).toString('base64url');
    const input = `${header}.${payload}`;
    const signature = sign('RSA-SHA256', Buffer.from(input, 'ascii'), privateKey).toString('base64url');
    const verifier = factory({ jwks: { keys: [publicJwk] }, issuer: 'https://auth.openai.com', audience: 'qa-client', nonce: 'qa-nonce' });
    await expect(verifier.verifySignature(`${input}.${signature}`)).resolves.toMatchObject({ sub: 'qa-subject', nonce: 'qa-nonce' });
  });

  it('rejects changed executable verifier code', async () => {
    const runtime = await createRuntimeCopy();
    await fs.appendFile(path.join(runtime, 'offline-id-token-verifier.mjs'), '\n// changed executable bytes\n');
    await expect(loadVerifiedSignInRuntime(runtime)).rejects.toThrow('integrity');
  });

  it('rejects a symlinked or junction-substituted runtime path', async () => {
    const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-signin-link-')));
    temporaryPaths.push(parent);
    const runtime = path.join(parent, 'real');
    const alias = path.join(parent, 'alias');
    await fs.mkdir(runtime);
    await fs.copyFile(bundlePath, path.join(runtime, 'offline-id-token-verifier.mjs'));
    await fs.symlink(runtime, alias, process.platform === 'win32' ? 'junction' : 'dir');
    await expect(loadVerifiedSignInRuntime(alias)).rejects.toThrow('integrity');
  });

  it('executes captured pinned bytes when the source path is swapped after reading', async () => {
    const runtime = await createRuntimeCopy();
    const verifierPath = path.join(runtime, 'offline-id-token-verifier.mjs');
    const readFile = fs.readFile.bind(fs);
    vi.spyOn(fs, 'readFile').mockImplementation(async (...args: Parameters<typeof fs.readFile>) => {
      const content = await readFile(...args as [Parameters<typeof fs.readFile>[0]]);
      if (String(args[0]) === verifierPath) await fs.writeFile(verifierPath, 'export const createOfflineIdTokenVerifier = () => { throw Error("swapped code executed"); };\n');
      return content;
    });
    const factory = await loadVerifiedSignInRuntime(runtime);
    expect(() => factory({ jwks: { keys: [{ kid: 'qa', kty: 'RSA', alg: 'RS256', n: 'AQAB', e: 'AQAB' }] }, issuer: 'issuer', audience: 'audience', nonce: 'nonce' })).not.toThrow();
  });
});

describe('isolated sign-in network boundary', () => {
  it('only exchanges the exact form at the fixed token endpoint with no redirects', async () => {
    const request = vi.fn<typeof fetch>(async () => Response.json({ mock: true }));
    await expect(createIsolatedTokenTransport(new AbortController().signal, request).exchange({ endpoint, form })).resolves.toEqual({ mock: true });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe(endpoint);
    expect(init?.redirect).toBe('error');
    expect(init?.method).toBe('POST');
    expect(new URLSearchParams(String(init?.body)).get('code_verifier')).toBe(callback.verifier);
    expect(init?.headers).not.toHaveProperty('Authorization');
  });

  it('uses public OpenAI JWKS with callback-bound issuer, audience and nonce', async () => {
    const request = vi.fn<typeof fetch>(async () => Response.json({ keys: [{ kid: 'mock' }] }));
    const factory = vi.fn(() => ({ verifySignature: vi.fn() }));
    await createIsolatedIdentityVerifier(factory, callback, new AbortController().signal, request);
    expect(request.mock.calls[0][0]).toBe('https://auth.openai.com/.well-known/jwks.json');
    expect(factory).toHaveBeenCalledWith({ jwks: { keys: [{ kid: 'mock' }] }, issuer: 'https://auth.openai.com', audience: callback.clientId, nonce: callback.nonce });
  });

  it('performs exactly one bounded fixed-endpoint catalog GET with no redirect or retry', async () => {
    const request = vi.fn<typeof fetch>(async () => Response.json({ models: [{ slug: 'mock', display_name: 'Mock', visibility: 'list' }] }));
    const transport = createIsolatedCatalogTransport(new AbortController().signal, request);
    await expect(transport.list('mock-access-token')).resolves.toMatchObject({ models: expect.any(Array) });
    expect(request).toHaveBeenCalledTimes(1);
    const [url, init] = request.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/models');
    expect(init?.method).toBe('GET');
    expect(init?.redirect).toBe('error');
    expect(init?.cache).toBe('no-store');
    expect(init?.body).toBeUndefined();
    expect(init?.headers).toMatchObject({ Accept: 'application/json', Authorization: 'Bearer mock-access-token' });
    await expect(transport.list('mock-access-token')).rejects.toThrow('already used');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('redacts catalog HTTP bodies and bounds catalog JSON', async () => {
    for (const response of [new Response('private-token-body', { status: 403 }), new Response('not-json'), Response.json({ value: 'x'.repeat(128 * 1024) })]) {
      const request = vi.fn<typeof fetch>(async () => response);
      await expect(createIsolatedCatalogTransport(new AbortController().signal, request).list('mock-access-token'))
        .rejects.toThrow('Model catalog request failed');
    }
  });

  it('rejects non-JSON, oversized and unsuccessful responses without exposing their body', async () => {
    for (const response of [new Response('private-token-body', { status: 400 }), new Response('not-json'), Response.json({ value: 'x'.repeat(128 * 1024) })]) {
      const request = vi.fn<typeof fetch>(async () => response);
      await expect(createIsolatedTokenTransport(new AbortController().signal, request).exchange({ endpoint, form })).rejects.toThrow('Sign-in endpoint request failed');
    }
  });

  it('rejects untrusted runtime paths and browser destinations before launching', async () => {
    await expect(loadVerifiedSignInRuntime('relative-runtime')).rejects.toThrow('absolute');
    await expect(openOfficialSignInBrowser('https://example.com/login', new AbortController().signal)).rejects.toThrow('Unexpected');
  });
  it('renews once with the issued client and resource, without scope expansion or retry', async () => {
    const request=vi.fn<typeof fetch>(async()=>Response.json({access_token:'synthetic-new',refresh_token:'synthetic-replacement'}));
    const transport=createIsolatedRefreshTransport(new AbortController().signal,request);
    await expect(transport.refresh('issued-client','synthetic-refresh')).resolves.toMatchObject({refresh_token:'synthetic-replacement'});
    const [url,init]=request.mock.calls[0];
    expect(url).toBe(endpoint);expect(init).toMatchObject({method:'POST',redirect:'error',cache:'no-store'});
    expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({grant_type:'refresh_token',client_id:'issued-client',refresh_token:'synthetic-refresh',resource:'https://api.openai.com/v1'});
    await expect(transport.refresh('issued-client','synthetic-refresh')).rejects.toThrow('already used');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid renewal identities and redacts network failures without retry',async()=>{
    const request=vi.fn<typeof fetch>(async()=>{throw Error('synthetic-private-token');});
    const transport=createIsolatedRefreshTransport(new AbortController().signal,request);
    await expect(transport.refresh('dynamic_agent_client','synthetic-refresh')).rejects.toThrow('unavailable');
    expect(request).not.toHaveBeenCalled();
    await expect(transport.refresh('issued-client','synthetic-refresh')).rejects.toThrow(/^Token renewal failed; session recovery required$/);
    await expect(transport.refresh('issued-client','synthetic-refresh')).rejects.toThrow('already used');
    expect(request).toHaveBeenCalledTimes(1);
    await expect(createIsolatedCatalogTransport(new AbortController().signal,request).list('synthetic-access')).rejects.toThrow(/^Model catalog request failed\.$/);
  });
});
