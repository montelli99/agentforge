/** Official-client negative acceptance. Uses an empty synthetic profile, never an account. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runBoundedChild} from '../src/providers/models/boundedCliProcess.js';
import {inspectGeminiCliCapabilities} from '../src/providers/models/geminiCliCapabilities.js';

const bundle = process.argv[2];
const settingsScope = process.argv[3] ?? 'system';
assert.ok(settingsScope === 'system' || settingsScope === 'user', 'Select system or user settings scope');
if (!bundle || !path.isAbsolute(bundle)) throw Error('Provide an absolute trusted official Gemini bundle path');
const capabilities = await inspectGeminiCliCapabilities(bundle);
assert.equal(capabilities.controlsAvailable, true);
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-gemini-auth-boundary-'));
try {
  await fs.mkdir(path.join(directory, '.gemini'));
  const settings = settingsScope === 'system' ? path.join(directory, 'system.json')
    : path.join(directory, '.gemini', 'settings.json');
  const defaults = path.join(directory, 'defaults.json');
  await fs.writeFile(defaults, '{}');
  await fs.writeFile(settings, JSON.stringify({
    security: {auth: {selectedType: 'gemini-api-key', enforcedType: 'oauth-personal', useExternal: false}},
    hooksConfig: {enabled: false}, telemetry: {enabled: false},
  }));
  const env: NodeJS.ProcessEnv = {HOME: directory, USERPROFILE: directory,
    TEMP: directory, TMP: directory, GEMINI_CLI_HOME: directory,
    GEMINI_CLI_SYSTEM_SETTINGS_PATH: settingsScope === 'system' ? settings : path.join(directory, 'absent-system.json'),
    GEMINI_CLI_SYSTEM_DEFAULTS_PATH: settingsScope === 'system' ? defaults : path.join(directory, 'absent-defaults.json')};
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path']) if (process.env[key]) env[key] = process.env[key];
  const result = await runBoundedChild(process.execPath,
    [bundle, '--prompt', 'Synthetic negative authentication check.', '--output-format', 'json'],
    {cwd: directory, env, timeoutMs: 30000, maxOutputBytes: 131072});
  assert.notEqual(result.code, 0, 'Wrong authentication type must not succeed');
  const diagnostics = result.stdout + result.stderr;
  if (/Skipping system (settings|defaults) file/.test(diagnostics)) {
    throw Error('Official client rejected the temporary system configuration ownership; authentication enforcement was not tested. No account was supplied.');
  }
  assert.ok(/enforced authentication type is 'oauth-personal'/.test(diagnostics), 'Missing enforced-account rejection');
  assert.ok(/current type is 'gemini-api-key'/.test(diagnostics), 'Missing selected-account mismatch');
  console.log(JSON.stringify({passed: true, version: capabilities.version, settingsScope,
    rejectedAuthenticationMismatch: true, syntheticProfile: true,
    liveAccountVerified: false, successfulInferenceVerified: false}));
} finally {
  await fs.rm(directory, {recursive: true, force: true});
}
