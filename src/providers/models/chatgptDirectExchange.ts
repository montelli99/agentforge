import type { DirectCredentials, IdentityTokenVerifier, ValidatedCallback } from './chatgptDirectOAuth.js';
import { validateDirectTokenResponse } from './chatgptDirectOAuth.js';
import type { DirectGrant } from './chatgptDirectModel.js';

export interface DirectTokenExchangeTransport {
  /** Implement with POST https://auth.openai.com/api/accounts/oauth/token only
   * after user consent. Tests inject a fake; this module never performs fetch. */
  exchange(request: {
    endpoint: 'https://auth.openai.com/api/accounts/oauth/token';
    form: { grant_type: 'authorization_code'; client_id: string; code: string; code_verifier: string; redirect_uri: string; resource: 'https://api.openai.com/v1' };
  }): Promise<unknown>;
}
export interface SessionCredentials { credentials: DirectCredentials; grant: DirectGrant; discard(): void; }

/** Exchanges one validated callback through an injected transport and validates
 * the returned identity/permissions before exposing a session-only grant. */
export async function exchangeDirectCallback(callback: ValidatedCallback, transport: DirectTokenExchangeTransport,
  verifier: IdentityTokenVerifier, grantId: string, now: () => number = Date.now): Promise<SessionCredentials> {
  try {
    const response = await transport.exchange({ endpoint: 'https://auth.openai.com/api/accounts/oauth/token', form: {
      grant_type: 'authorization_code', client_id: callback.clientId, code: callback.code,
      code_verifier: callback.verifier, redirect_uri: callback.redirectUri, resource: callback.resource,
    } });
    const validated = await validateDirectTokenResponse(callback, response, verifier, grantId, now);
    return { ...validated, discard: () => { validated.credentials.accessToken = ''; validated.credentials.idToken = ''; if (validated.credentials.refreshToken) validated.credentials.refreshToken = ''; validated.grant.scopes = []; } };
  } catch {
    // Injected transports and verifiers may include provider bodies or token
    // values in their errors. Never propagate those across this boundary.
    throw Error('Direct token exchange or validation failed');
  }
}
