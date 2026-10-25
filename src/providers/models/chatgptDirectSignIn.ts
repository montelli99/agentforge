import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { DirectOAuthAttempt, directOAuthScopes } from './chatgptDirectOAuth.js';
import type { OAuthAttemptInput, ValidatedCallback } from './chatgptDirectOAuth.js';

const AUTHORIZATION_ENDPOINT = 'https://auth.openai.com/api/accounts/authorize';
const LOOPBACK_HOST = '127.0.0.1';
const CALLBACK_PATH = '/auth/callback';

export interface DirectSignInSession {
  readonly attempt: DirectOAuthAttempt;
  readonly authorizationUrl: string;
  readonly redirectUri: string;
  cancel(): Promise<void>;
  waitForCallback(): Promise<ValidatedCallback>;
}

function entropy(bytes: number): string { return randomBytes(bytes).toString('base64url'); }
function callbackUri(port: number): string { return `http://${LOOPBACK_HOST}:${port}${CALLBACK_PATH}`; }

/**
 * Starts a user-operated Sign in with ChatGPT loopback flow. It only prepares
 * authorization and validates the returned callback. Code exchange, token
 * storage, browser launch and account access are deliberately caller actions.
 */
export async function prepareChatGPTSignIn(options: {
  hostId: string;
  clientId?: string;
  selectedSubject?: string;
  agentName?: string;
  port?: number;
  now?: () => number;
}): Promise<DirectSignInSession> {
  const preparedAt = options.now?.() ?? Date.now();
  const prepared = {
    state: entropy(32), nonce: entropy(32), verifier: entropy(32),
    hostId: options.hostId, clientId: options.clientId, selectedSubject: options.selectedSubject,
    requestedScopes: [...directOAuthScopes], expiresAt: preparedAt + 600000,
  };
  // Validate every caller-controlled option before allocating a listener. The
  // final attempt below differs only by its OS-assigned loopback port.
  new DirectOAuthAttempt({ ...prepared, redirectUri: callbackUri(1455) }, options.now);
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, LOOPBACK_HOST, () => resolve());
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  if (!port) { server.close(); throw Error('Loopback callback listener did not receive a port'); }
  const input: OAuthAttemptInput = {
    ...prepared, redirectUri: callbackUri(port),
  };
  const attempt = new DirectOAuthAttempt(input, options.now);
  const params = new URLSearchParams(attempt.authorizationParameters());
  if (!options.clientId) params.set('agent_name_hint', options.agentName ?? 'AgentForge');
  const authorizationUrl = `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
  let settled = false;
  let resolveCallback!: (value: ValidatedCallback) => void;
  let rejectCallback!: (reason: Error) => void;
  const callback = new Promise<ValidatedCallback>((resolve, reject) => { resolveCallback = resolve; rejectCallback = reject; });
  // Keep cancellation/rejection from becoming an unhandled rejection before the
  // caller awaits waitForCallback(); the original rejection is still rethrown there.
  void callback.catch(() => undefined);
  const close = async () => { if (!settled) { settled = true; await new Promise<void>(resolve => server.close(() => resolve())); } };
  server.on('request', (request, response) => {
    if (settled || request.method !== 'GET' || !request.url) { response.writeHead(404); response.end(); return; }
    try {
      const url = new URL(request.url, `http://${LOOPBACK_HOST}:${port}`);
      if (url.pathname !== CALLBACK_PATH) { response.writeHead(404); response.end(); return; }
      const validated = attempt.validateCallback(`${url.origin}${url.pathname}${url.search}`);
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Sign in response received. You may close this window.');
      settled = true; resolveCallback(validated); void server.close();
    } catch (error) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Sign in response rejected. You may close this window.');
      settled = true; rejectCallback(error instanceof Error ? error : Error('Invalid sign-in callback')); void server.close();
    }
  });
  return {
    attempt, authorizationUrl, redirectUri: input.redirectUri,
    cancel: async () => { if (!settled) { settled = true; rejectCallback(Error('Sign in cancelled')); await new Promise<void>(resolve => server.close(() => resolve())); } },
    waitForCallback: async () => { try { return await callback; } finally { await close(); } },
  };
}

export const chatgptDirectSignInEndpoint = AUTHORIZATION_ENDPOINT;
