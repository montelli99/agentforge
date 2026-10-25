import {expect, it} from 'vitest';
import {assertNoProtectedMountOverlap as check} from './protectedMountPaths.js';
it('accepts UI default protections alongside unrelated output directories', () => {
  expect(() => check(['artifacts', 'reports'], ['.env', '.env.*', '.git/**'])).not.toThrow();
});
it.each(['.env', '.env.local', '.ENV.production', '.env.local/nested', '.git', '.git/config'])('rejects protected writable grant %s', grant => {
  expect(() => check([grant], ['.env', '.env.*', '.git/**'])).toThrow('overlaps');
});
it('rejects ancestor mounts containing a protected wildcard or literal', () => {
  expect(() => check(['config'], ['config/.env.*'])).toThrow('overlaps');
  expect(() => check(['config'], ['config/secret'])).toThrow('overlaps');
});
it.each(['../secret', '**/secret', 'config/*/secret', '/secret', 'config/../secret'])('fails closed on unsupported protection %s', pattern => {
  expect(() => check(['artifacts'], [pattern])).toThrow('Unsupported');
});
