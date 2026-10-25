import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {runBoundedChild} from './boundedCliProcess.js';
import {inspectGeminiCliCapabilities} from './geminiCliCapabilities.js';

vi.mock('./boundedCliProcess.js', () => ({runBoundedChild: vi.fn()}));
const child = vi.mocked(runBoundedChild);
const controls = '--model --prompt --approval-mode --policy --admin-policy --allowed-mcp-server-names --extensions --output-format';
const roots: string[] = [];
async function bundle() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-synthetic-client-'));
  roots.push(root);
  const file = path.join(root, 'client.js');
  await fs.writeFile(file, '// Synthetic fixture; never executed.');
  return file;
}
afterEach(async () => {
  vi.unstubAllEnvs(); child.mockReset();
  await Promise.all(roots.splice(0).map(root => fs.rm(root, {recursive: true, force: true})));
});

describe('Gemini capability inspection boundary', () => {
  it('uses a disposable home without inherited credentials or Node injection, and never claims authentication', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'synthetic-not-a-key');
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', 'synthetic-private-profile');
    vi.stubEnv('NODE_OPTIONS', '--require=synthetic-injection');
    const file = await bundle();
    child.mockResolvedValueOnce({pid: 1, code: 0, stdout: '0.65.0\n', stderr: ''})
      .mockResolvedValueOnce({pid: 2, code: 0, stdout: controls, stderr: ''});
    const result = await inspectGeminiCliCapabilities(file);
    expect(result).toEqual({version: '0.65.0', controlsAvailable: true, missingControls: [],
      authenticationVerified: false, isolationVerified: false, inferencePerformed: false});
    expect(child.mock.calls.map(call => call[1])).toEqual([[file, '--version'], [file, '--help']]);
    const options = child.mock.calls[0][2];
    expect(options.env).not.toHaveProperty('GEMINI_API_KEY');
    expect(options.env).not.toHaveProperty('GOOGLE_APPLICATION_CREDENTIALS');
    expect(options.env).not.toHaveProperty('NODE_OPTIONS');
    expect(options.env?.HOME).toBe(options.cwd);
    expect(options.env?.GEMINI_CLI_HOME).toBe(options.cwd);
    await expect(fs.stat(options.cwd!)).rejects.toMatchObject({code: 'ENOENT'});
  });

  it('does not mistake similarly named flags for required controls', async () => {
    child.mockResolvedValueOnce({pid: 1, code: 0, stdout: '0.65.0', stderr: ''})
      .mockResolvedValueOnce({pid: 2, code: 0, stdout: controls.replace('--admin-policy', '--admin-policy-example'), stderr: ''});
    expect(await inspectGeminiCliCapabilities(await bundle())).toMatchObject({controlsAvailable: false, missingControls: ['--admin-policy']});
  });

  it('cleans up after a child failure without exposing child diagnostics', async () => {
    child.mockRejectedValueOnce(Error('synthetic-secret diagnostic'));
    await expect(inspectGeminiCliCapabilities(await bundle())).rejects.toThrow('capability check failed');
    expect(child).toHaveBeenCalledTimes(1);
    await expect(fs.stat(child.mock.calls[0][2].cwd!)).rejects.toMatchObject({code: 'ENOENT'});
  });
});
