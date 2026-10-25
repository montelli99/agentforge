import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runBoundedChild} from './boundedCliProcess.js';

const requiredControls = ['--model', '--prompt', '--approval-mode', '--policy',
  '--admin-policy', '--allowed-mcp-server-names', '--extensions', '--output-format'] as const;

export interface GeminiCliCapabilities {
  version: string;
  controlsAvailable: boolean;
  missingControls: string[];
  authenticationVerified: false;
  isolationVerified: false;
  inferencePerformed: false;
}

/** Inspect an explicitly selected trusted official bundle with the host Node runtime.
 * Advertised flags do not prove policy enforcement, login or executable authenticity.
 */
export async function inspectGeminiCliCapabilities(bundle: string, signal?: AbortSignal): Promise<GeminiCliCapabilities> {
  if (typeof bundle !== 'string' || !path.isAbsolute(bundle)) throw Error('Select an absolute official Gemini client bundle');
  const stat = await fs.lstat(bundle);
  if (!stat.isFile() || stat.isSymbolicLink() || !bundle.endsWith('.js')) throw Error('Select a regular official Gemini JavaScript bundle');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-gemini-capabilities-'));
  const env: NodeJS.ProcessEnv = {HOME: directory, USERPROFILE: directory, TEMP: directory, TMP: directory,
    GEMINI_CLI_HOME: directory, GEMINI_CLI_SURFACE: 'agentforge-capability-inspection'};
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path']) if (process.env[key]) env[key] = process.env[key];
  const options = {cwd: directory, env, signal, timeoutMs: 10000, maxOutputBytes: 131072};
  try {
    const version = await runBoundedChild(process.execPath, [bundle, '--version'], options);
    const match = version.stdout.trim().match(/^(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)$/);
    if (version.code !== 0 || !match) throw Error('Unrecognized client version');
    const help = await runBoundedChild(process.execPath, [bundle, '--help'], options);
    if (help.code !== 0) throw Error('Client help failed');
    const missingControls = requiredControls.filter(flag => !new RegExp('(?:^|[\\s,])' + flag + '(?=[\\s,]|$)', 'm').test(help.stdout));
    return {version: match[1], controlsAvailable: missingControls.length === 0, missingControls,
      authenticationVerified: false, isolationVerified: false, inferencePerformed: false};
  } catch {
    throw Error('Gemini client capability check failed or was cancelled; no model request was made');
  } finally { await fs.rm(directory, {recursive: true, force: true}); }
}
