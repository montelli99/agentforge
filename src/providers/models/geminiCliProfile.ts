import fs from 'node:fs/promises';
import path from 'node:path';

/** Creates a new dedicated home, never adopts or changes an existing profile.
 * These are user settings, not an OS sandbox or administrator policy.
 */
export async function prepareGeminiCliProfile(home: string) {
  if (typeof home !== 'string' || !path.isAbsolute(home) || path.dirname(home) === home)
    throw Error('Select an absolute path for a new dedicated Gemini home');
  // Non-recursive creation deliberately rejects existing directories and links.
  await fs.mkdir(home, {mode: 0o700});
  const settingsDirectory = path.join(home, '.gemini');
  await fs.mkdir(settingsDirectory, {mode: 0o700});
  await fs.writeFile(path.join(settingsDirectory, 'settings.json'), JSON.stringify({
    security: {auth: {selectedType: 'oauth-personal', enforcedType: 'oauth-personal', useExternal: false}},
    hooksConfig: {enabled: false}, telemetry: {enabled: false},
    admin: {extensions: {enabled: false}, mcp: {enabled: false}, skills: {enabled: false}},
  }, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  return {home, environmentVariable: 'GEMINI_CLI_HOME', authentication: 'google-login',
    authenticated: false, managedPlanningEnabled: false,
    nextStep: 'Use this dedicated home when signing in through the official Gemini client. Account access and managed planning are not yet verified.'};
}
