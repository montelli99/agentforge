import { createPublicKey, verify as verifyBytes } from 'node:crypto';

const DEFAULT_ALGORITHMS = Object.freeze(['RS256', 'ES256']);
const PRIVATE_JWK_FIELDS = Object.freeze(['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth']);
const safeText = (value, max = 512) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);

function decodeJsonPart(value, maxBytes) {
  if (!safeText(value, maxBytes * 2) || !/^[A-Za-z0-9_-]+$/.test(value)) throw Error('malformed');
  const decoded = Buffer.from(value, 'base64url');
  if (!decoded.length || decoded.length > maxBytes) throw Error('malformed');
  const parsed = JSON.parse(decoded.toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('malformed');
  return parsed;
}

function audienceMatches(actual, expected) {
  return actual === expected || (Array.isArray(actual) && actual.length > 0 && actual.every(item => safeText(item, 512)) && actual.includes(expected));
}

/**
 * Creates an offline ID-token verifier backed only by an explicitly supplied,
 * trusted in-memory public JWK set. It has no package or network imports.
 */
export function createOfflineIdTokenVerifier({ jwks, issuer, audience, nonce, purpose = 'sign-in', algorithms = DEFAULT_ALGORITHMS, now = () => Date.now() }) {
  if (purpose !== 'sign-in' && purpose !== 'refresh') throw Error('Invalid verifier purpose');
  if (!jwks || !Array.isArray(jwks.keys) || jwks.keys.length === 0 || !safeText(issuer) || !safeText(audience) || !safeText(nonce, 256)) throw Error('Invalid offline verifier configuration');
  if (!Array.isArray(algorithms) || algorithms.length === 0 || new Set(algorithms).size !== algorithms.length || algorithms.some(alg => !DEFAULT_ALGORITHMS.includes(alg))) throw Error('Invalid offline verifier algorithm policy');
  const seenKids = new Set();
  const trustedKeys = jwks.keys.map(key => {
    if (!key || typeof key !== 'object' || Array.isArray(key) || !safeText(key.kid, 256) || seenKids.has(key.kid)
      || !safeText(key.kty, 32) || !safeText(key.alg, 16) || !algorithms.includes(key.alg)
      || PRIVATE_JWK_FIELDS.some(field => key[field] !== undefined)) throw Error('Invalid trusted public JWK');
    seenKids.add(key.kid);
    if (key.alg === 'RS256' && (key.kty !== 'RSA' || !safeText(key.n, 16384) || !safeText(key.e, 32))) throw Error('Trusted JWK algorithm mismatch');
    if (key.alg === 'ES256' && (key.kty !== 'EC' || key.crv !== 'P-256' || !safeText(key.x, 256) || !safeText(key.y, 256))) throw Error('Trusted JWK algorithm mismatch');
    return Object.freeze({ ...key });
  });
  return Object.freeze({
    async verifySignature(idToken) {
      try {
        if (!safeText(idToken, 32768)) throw Error('malformed');
        const parts = idToken.split('.');
        if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw Error('malformed');
        const header = decodeJsonPart(parts[0], 4096);
        const payload = decodeJsonPart(parts[1], 24576);
        if (!algorithms.includes(header.alg) || !safeText(header.kid, 256)
          || header.jku !== undefined || header.x5u !== undefined || header.x5c !== undefined
          || header.crit !== undefined || header.b64 !== undefined) throw Error('header');
        const jwk = trustedKeys.find(key => key.kid === header.kid && key.alg === header.alg);
        if (!jwk) throw Error('key');
        const signature = Buffer.from(parts[2], 'base64url');
        const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`, 'ascii');
        const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
        const verified = header.alg === 'RS256'
          ? verifyBytes('RSA-SHA256', signingInput, publicKey, signature)
          : signature.length === 64 && verifyBytes('sha256', signingInput, { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
        const currentTime = now();
        if (!verified || !Number.isFinite(currentTime) || payload.iss !== issuer || !audienceMatches(payload.aud, audience)
          || !safeText(payload.sub, 256) || ((purpose === 'sign-in' || payload.nonce !== undefined) && payload.nonce !== nonce) || !Number.isSafeInteger(payload.exp)
          || payload.exp * 1000 <= currentTime) throw Error('claims');
        if (payload.nbf !== undefined && (!Number.isSafeInteger(payload.nbf) || payload.nbf * 1000 > currentTime)) throw Error('not-before');
        return { iss: payload.iss, sub: payload.sub, aud: payload.aud, exp: payload.exp, nonce: payload.nonce };
      } catch {
        throw Error('Offline ID token validation failed');
      }
    },
  });
}

export const offlineIdTokenAlgorithms = DEFAULT_ALGORITHMS;
