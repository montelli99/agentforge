import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, expect, it} from 'vitest';
import {prepareGeminiCliProfile} from './geminiCliProfile.js';
const roots: string[] = [];
afterEach(async () => {await Promise.all(roots.splice(0).map(root => fs.rm(root, {recursive: true, force: true})));});
async function root() {const value = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-profile-test-')); roots.push(value); return value;}
it('prepares a new profile requiring Google login without claiming a working connection', async () => {
  const home = path.join(await root(), 'new-home');
  expect(await prepareGeminiCliProfile(home)).toMatchObject({authenticated: false, managedPlanningEnabled: false});
  const settings = JSON.parse(await fs.readFile(path.join(home, '.gemini/settings.json'), 'utf8'));
  expect(settings.security.auth).toEqual({selectedType: 'oauth-personal', enforcedType: 'oauth-personal', useExternal: false});
  expect(settings.hooksConfig.enabled).toBe(false);
  expect(await fs.readdir(path.join(home, '.gemini'))).toEqual(['settings.json']);
});
it('preserves an existing profile and refuses to reuse it', async () => {
  const home = await root();
  await fs.writeFile(path.join(home, 'sentinel'), 'synthetic existing profile');
  await expect(prepareGeminiCliProfile(home)).rejects.toMatchObject({code: 'EEXIST'});
  expect(await fs.readdir(home)).toEqual(['sentinel']);
  expect(await fs.readFile(path.join(home, 'sentinel'), 'utf8')).toBe('synthetic existing profile');
});
it('rejects relative paths before creating anything', async () => {
  await expect(prepareGeminiCliProfile('relative-home')).rejects.toThrow('absolute path');
});
it('returns the physical profile location when its parent uses a filesystem alias', async () => {
  const directory = await root();
  const physical = path.join(directory, 'physical');
  const alias = path.join(directory, 'alias');
  await fs.mkdir(physical);
  await fs.symlink(physical, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const result = await prepareGeminiCliProfile(path.join(alias, 'new-home'));
  expect(result.home).toBe(await fs.realpath(path.join(physical, 'new-home')));
  expect(result.home).not.toBe(path.join(alias, 'new-home'));
});
