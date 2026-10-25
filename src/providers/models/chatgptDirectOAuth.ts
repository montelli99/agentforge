import { createHash, timingSafeEqual } from 'node:crypto';
import type { DirectGrant } from './chatgptDirectModel.js';

const resource = 'https://api.openai.com/v1' as const;
const issuer = 'https://auth.openai.com';
export const directOAuthScopes = Object.freeze(['openid', 'profile', 'email', 'offline_access', 'resource.invoke', 'chatgpt.tokens.use.direct']);
const text = (v: unknown, max = 16384): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\x00-\x20\x7f]/.test(v);
const equal = (a: string, b: string): boolean => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export interface OAuthAttemptInput {
  /** Must be supplied only after user approval; no entropy is generated here. */
  state: string; nonce: string; verifier: string; redirectUri: string;
  hostId: string; clientId?: string; selectedSubject?: string;
  /** Retained identity hint for the selected registration; never log authorization URLs. */
  idTokenHint?: string;
  requestedScopes: readonly string[]; expiresAt: number;
}
export interface ValidatedCallback {
  clientId: string; code: string; verifier: string; redirectUri: string;
  resource: typeof resource; nonce: string; selectedSubject?: string;
  requestedScopes: readonly string[];
}
/** Pure PKCE computation only; caller must generate fresh CSPRNG entropy after consent. */
export function pkceS256(verifier: string): string {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw Error('Invalid PKCE verifier');
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}
function callbackUri(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.pathname !== '/auth/callback' || url.username || url.password || url.search || url.hash || url.href !== value) throw Error('Exact loopback OAuth callback required');
  return url;
}
/** Single-use offline validator. It opens no listener/browser and makes no request. */
export class DirectOAuthAttempt {
  private readonly input: Readonly<OAuthAttemptInput>;
  private consumed = false;
  constructor(input: OAuthAttemptInput, private readonly now: () => number = Date.now) {
    callbackUri(input.redirectUri); pkceS256(input.verifier);
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(input.state) || !/^[A-Za-z0-9_-]{43,128}$/.test(input.nonce) || input.state === input.nonce || !text(input.hostId, 256)
      || !Number.isFinite(input.expiresAt) || input.expiresAt <= now() || input.expiresAt > now() + 600000
      || (input.clientId !== undefined && (!text(input.clientId, 256) || input.clientId === 'dynamic_agent_client'))
      || (input.selectedSubject !== undefined && (!input.clientId || !text(input.selectedSubject, 256)))
      || (input.idTokenHint !== undefined && (!input.clientId || !input.selectedSubject || !text(input.idTokenHint)))) throw Error('Invalid pending OAuth attempt');
    if (
      new Set(input.requestedScopes).size !== input.requestedScopes.length || input.requestedScopes.some(s => !directOAuthScopes.includes(s))
      || !directOAuthScopes.every(s => input.requestedScopes.includes(s))) throw Error('Invalid pending OAuth attempt');
    this.input = Object.freeze({ ...input, requestedScopes: Object.freeze([...input.requestedScopes]) });
  }
  /** Authorization parameters may contain an ID-token hint. Never log this object. */
  authorizationParameters(): Readonly<Record<string, string>> {
    if (this.consumed || this.now() >= this.input.expiresAt) throw Error('OAuth attempt expired or consumed');
    return Object.freeze({ client_id: this.input.clientId ?? 'dynamic_agent_client',
      ...(this.input.clientId ? {} : { agent_name_hint: 'AgentForge' }), ext_agent_host_id: this.input.hostId,
      ...(this.input.idTokenHint ? { id_token_hint: this.input.idTokenHint } : {}),
      response_type: 'code', redirect_uri: this.input.redirectUri, scope: this.input.requestedScopes.join(' '), resource,
      state: this.input.state, nonce: this.input.nonce, code_challenge_method: 'S256', code_challenge: pkceS256(this.input.verifier) });
  }
  validateCallback(value: string): ValidatedCallback {
    if (this.consumed) throw Error('OAuth callback replay rejected');
    // Consume on every validation attempt, including malformed/error callbacks.
    this.consumed = true;
    const url = new URL(value), expected = callbackUri(this.input.redirectUri);
    if (this.now() >= this.input.expiresAt || value.length > 32768 || url.origin !== expected.origin || url.pathname !== expected.pathname || url.username || url.password || url.hash) throw Error('OAuth callback binding invalid');
    for (const key of url.searchParams.keys()) if (url.searchParams.getAll(key).length !== 1) throw Error('Duplicate OAuth callback parameter');
    const state = url.searchParams.get('state');
    if (!state || !equal(state, this.input.state)) throw Error('OAuth callback state mismatch');
    if (url.searchParams.has('error')) throw Error('OAuth authorization denied or failed');
    const clientId = url.searchParams.get('client_id') ?? this.input.clientId;
    if (!text(clientId, 256) || clientId === 'dynamic_agent_client' || (this.input.clientId && clientId !== this.input.clientId)) throw Error('Issued OAuth client mismatch or missing');
    const code = url.searchParams.get('code');
    if (!text(code, 8192)) throw Error('OAuth authorization code missing or malformed');
    // Callback scope is advisory. Only token-response scopes can authorize plan use.
    return { clientId, code, verifier: this.input.verifier, redirectUri: this.input.redirectUri, resource,
      nonce: this.input.nonce, selectedSubject: this.input.selectedSubject, requestedScopes: [...this.input.requestedScopes] };
  }
}
export interface VerifiedIdentity { iss: string; sub: string; aud: string | readonly string[]; exp: number; nonce: string }
export interface IdentityTokenVerifier {
  /** Mandatory cryptographic JWT signature verification against trusted OpenAI
   * JWKS, allowed algorithms and issuer. Never merely decode a JWT. No fetch here. */
  verifySignature(idToken: string): Promise<VerifiedIdentity>;
}
export interface DirectCredentials {
  clientId: string; subject: string; issuer: typeof issuer; resource: typeof resource;
  accessToken: string; refreshToken?: string; idToken: string; tokenType: 'Bearer';
  scopes: readonly string[]; expiresAt: number;
}
/** Validates an injected token response without exchange, storage or auth calls. */
export async function validateDirectTokenResponse(callback: ValidatedCallback, response: unknown, verifier: IdentityTokenVerifier,
  grantId: string, now: () => number = Date.now): Promise<{ credentials: DirectCredentials; grant: DirectGrant }> {
  const r = response as Record<string, unknown> | null;
  if (!r || !text(r.access_token) || !text(r.id_token) || (r.refresh_token !== undefined && !text(r.refresh_token)) || r.token_type !== 'Bearer'
    || !Number.isSafeInteger(r.expires_in) || (r.expires_in as number) <= 0 || (r.expires_in as number) > 86400 || typeof r.scope !== 'string'
    || callback.resource !== resource || !text(grantId, 256)) throw Error('Invalid OAuth token response');
  const scopes = r.scope.split(/\s+/).filter(Boolean);
  if (!['resource.invoke', 'chatgpt.tokens.use.direct'].every(s => scopes.includes(s)) || scopes.some(s => !callback.requestedScopes.includes(s))
    || new Set(scopes).size !== scopes.length) throw Error('OAuth plan permission missing or expanded');
  const claims = await verifier.verifySignature(r.id_token);
  const audiences = typeof claims.aud === 'string' ? [claims.aud] : claims.aud;
  if (claims.iss !== issuer || !text(claims.sub, 256) || !Array.isArray(audiences) || audiences.length !== 1 || audiences[0] !== callback.clientId
    || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now() || !text(claims.nonce, 128) || !equal(claims.nonce, callback.nonce)
    || (callback.selectedSubject !== undefined && claims.sub !== callback.selectedSubject)) throw Error('OAuth validated identity mismatch');
  const expiresAt = Math.min(now() + (r.expires_in as number) * 1000, claims.exp * 1000);
  const credentials: DirectCredentials = { clientId: callback.clientId, subject: claims.sub, issuer, resource,
    accessToken: r.access_token, refreshToken: r.refresh_token as string | undefined, idToken: r.id_token,
    tokenType: 'Bearer', scopes: Object.freeze(scopes), expiresAt };
  return { credentials, grant: { accountId: claims.sub, grantId, resource, scopes: [...scopes], expiresAt } };
}
