import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import type { IdentityTokenVerifier, ValidatedCallback } from './chatgptDirectOAuth.js';
import type { DirectTokenExchangeTransport } from './chatgptDirectExchange.js';

const TOKEN_ENDPOINT = 'https://auth.openai.com/api/accounts/oauth/token';
const JWKS_ENDPOINT = 'https://auth.openai.com/.well-known/jwks.json';
const MODELS_ENDPOINT = 'https://api.openai.com/v1/models';
const VERIFIER_FILE = 'offline-id-token-verifier.mjs';
const VERIFIER_SHA256 = 'f766f18cef364d6565b790adbb566197562866b9bca09fd25208e165ee47bc72';

type VerifierFactory = (options: { jwks: unknown; issuer: string; audience: string; nonce: string }) => IdentityTokenVerifier;
type Request = typeof fetch;

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const result = path.normalize(value);
    return process.platform === 'win32' ? result.toLowerCase() : result;
  };
  return normalize(left) === normalize(right);
}

/** Load the exact pinned verifier bytes without executing code by filesystem
 * path. The bundle imports only node:crypto; package manifests and node_modules
 * are deliberately outside the executable trust boundary. */
export async function loadVerifiedSignInRuntime(directory: string): Promise<VerifierFactory> {
  if (!path.isAbsolute(directory)) throw Error('Verifier runtime must be an absolute directory.');
  const resolvedDirectory = path.resolve(directory);
  const directoryStat = await fs.lstat(resolvedDirectory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()
    || !samePath(await fs.realpath(resolvedDirectory), resolvedDirectory)) throw Error('Verifier runtime integrity check failed.');
  const verifierPath = path.join(resolvedDirectory, VERIFIER_FILE);
  const verifierStat = await fs.lstat(verifierPath);
  const realVerifierPath = await fs.realpath(verifierPath);
  if (!verifierStat.isFile() || verifierStat.isSymbolicLink() || !samePath(realVerifierPath, verifierPath)
    || !samePath(path.dirname(realVerifierPath), resolvedDirectory)) throw Error('Verifier runtime integrity check failed.');
  const content = await fs.readFile(verifierPath);
  const digest = createHash('sha256').update(content).digest('hex');
  if (digest !== VERIFIER_SHA256) throw Error('Verifier runtime integrity check failed.');
  // The captured, hashed bytes are the executed bytes. Later filesystem swaps
  // cannot affect this data URL or introduce an unpinned package dependency.
  const module: unknown = await import(`data:text/javascript;base64,${content.toString('base64')}#sha256=${digest}`);
  const factory = (module as { createOfflineIdTokenVerifier?: unknown }).createOfflineIdTokenVerifier;
  if (typeof factory !== 'function') throw Error('Verifier runtime is unavailable.');
  return factory as VerifierFactory;
}

async function boundedJson(url: string, init: RequestInit, signal: AbortSignal, request: Request,
  failureMessage = 'Sign-in endpoint request failed.'): Promise<unknown> {
  let response: Response;
  try {
    signal.throwIfAborted();
    response = await request(url, { ...init, redirect: 'error', signal });
  } catch { throw Error(failureMessage); }
  try {
    if (!response.ok || !response.body || !/\bapplication\/(?:json|[a-z0-9.+-]+\+json)\b/i.test(response.headers.get('content-type') ?? '')) {
      throw Error('Sign-in endpoint response rejected.');
    }
    const limit = 128 * 1024;
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) throw Error('Sign-in endpoint response too large.');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    await response.body?.cancel().catch(() => undefined);
    throw Error(failureMessage);
  }
}

/** One refresh attempt only. The caller must hold its session's cross-process
 * lock, validate the returned identity/grant and persist the rotating token set
 * before exposing it. A network failure must not trigger automatic token reuse. */
export function createIsolatedRefreshTransport(signal: AbortSignal, request: Request = fetch) {
  let used = false;
  return { refresh: async (clientId: string, refreshToken: string): Promise<unknown> => {
    if (used) throw Error('Token renewal attempt already used');
    if (!clientId || clientId === 'dynamic_agent_client' || clientId.length > 256
      || !refreshToken || refreshToken.length > 16384 || /[\x00-\x20\x7f]/.test(clientId + refreshToken)) {
      throw Error('Token renewal credentials unavailable');
    }
    used = true;
    return boundedJson(TOKEN_ENDPOINT, { method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId,
        refresh_token: refreshToken, resource: 'https://api.openai.com/v1' }).toString(),
    }, signal, request, 'Token renewal failed; session recovery required');
  } };
}

export function createIsolatedTokenTransport(signal: AbortSignal, request: Request = fetch): DirectTokenExchangeTransport {
  return { exchange: async input => {
    if (input.endpoint !== TOKEN_ENDPOINT) throw Error('Unexpected sign-in endpoint.');
    return boundedJson(TOKEN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(input.form).toString() }, signal, request);
  } };
}

export async function createIsolatedIdentityVerifier(factory: VerifierFactory, callback: ValidatedCallback,
  signal: AbortSignal, request: Request = fetch): Promise<IdentityTokenVerifier> {
  const jwks = await boundedJson(JWKS_ENDPOINT, { method: 'GET', headers: { Accept: 'application/json' } }, signal, request);
  return factory({ jwks, issuer: 'https://auth.openai.com', audience: callback.clientId, nonce: callback.nonce });
}

export interface DirectCatalogInspectionTransport {
  list(accessToken: string): Promise<unknown>;
}

/** Exactly one bounded account-catalog request. No retry, refresh, persistence,
 * inference, redirects, or alternate endpoint. */
export function createIsolatedCatalogTransport(signal: AbortSignal, request: Request = fetch): DirectCatalogInspectionTransport {
  let used = false;
  return { list: async accessToken => {
    if (used) throw Error('Model catalog request already used.');
    used = true;
    if (!accessToken || accessToken.length > 16384 || /[\x00-\x20\x7f]/.test(accessToken)) {
      throw Error('Model catalog credential unavailable.');
    }
    return boundedJson(MODELS_ENDPOINT, { method: 'GET', cache: 'no-store', headers: {
      Accept: 'application/json', Authorization: `Bearer ${accessToken}`,
    } }, signal, request, 'Model catalog request failed.');
  } };
}

export async function openOfficialSignInBrowser(url: string, signal: AbortSignal): Promise<void> {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://auth.openai.com' || parsed.pathname !== '/api/accounts/authorize' || parsed.username || parsed.password || parsed.hash) throw Error('Unexpected authorization URL.');
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  await new Promise<void>((resolve, reject) => {
    execFile(command, args, { windowsHide: true, signal, timeout: 10000, maxBuffer: 4096 }, error => {
      if (error) reject(Error('Could not open the official sign-in page.')); else resolve();
    });
  });
}
