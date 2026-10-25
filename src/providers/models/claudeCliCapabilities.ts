import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runBoundedChild} from './boundedCliProcess.js';

const requiredControls = ['--restricted', '--safe-mode', '--tools', '--disallowedTools',
  '--strict-mcp-config', '--mcp-config', '--setting-sources', '--json-schema',
  '--output-format', '--no-session-persistence'] as const;

export interface ClaudeCliCapabilities {
  version: string;
  controlsAvailable: boolean;
  missingControls: string[];
  authenticationVerified: false;
  isolationVerified: false;
  inferencePerformed: false;
}

/** Ask the official client about an explicitly selected profile; never read its token files.
 * Authentication status alone does not prove model entitlement or safe execution.
 */
export async function inspectClaudeCliAuthentication(executable: string, configurationDirectory: string, signal?: AbortSignal): Promise<{loggedIn: boolean; inferenceVerified: false}> {
  if (!path.isAbsolute(configurationDirectory)) throw Error('Select an absolute Claude configuration directory');
  const configuration = await fs.lstat(configurationDirectory);
  if (!configuration.isDirectory() || configuration.isSymbolicLink()) throw Error('Select a regular Claude configuration directory');
  const capabilities = await inspectClaudeCliCapabilities(executable, signal);
  if (!capabilities.controlsAvailable) throw Error('Required Claude client controls are unavailable');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-claude-status-'));
  const env: NodeJS.ProcessEnv = { USERPROFILE: directory, HOME: directory, TEMP: directory, TMP: directory,
    CLAUDE_CONFIG_DIR: configurationDirectory, DISABLE_UPDATES: '1' };
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path']) if (process.env[key]) env[key] = process.env[key];
  try {
    const result = await runBoundedChild(executable, ['auth', 'status', '--json'],
      {cwd: directory, env, signal, timeoutMs: 10000, maxOutputBytes: 32768});
    const status = JSON.parse(result.stdout) as {loggedIn?: unknown};
    if (typeof status?.loggedIn !== 'boolean' || (status.loggedIn ? result.code !== 0 : result.code !== 1 && result.code !== 0))
      throw Error('Invalid authentication status');
    // Drop account identifiers, paths and any additional provider fields.
    return {loggedIn: status.loggedIn, inferenceVerified: false};
  } catch {
    throw Error('Claude account status unavailable; reconnect through the official client');
  } finally { await fs.rm(directory, {recursive: true, force: true}); }
}

/** Inspect an explicitly selected trusted executable, never PATH-discovered account state.
 * Help output establishes advertised capabilities only, not executable authenticity or enforcement.
 */
export async function inspectClaudeCliCapabilities(executable: string, signal?: AbortSignal): Promise<ClaudeCliCapabilities> {
  if (!path.isAbsolute(executable)) throw Error('Select an absolute official Claude client path');
  const stat = await fs.lstat(executable);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Select a regular official Claude executable');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-claude-capabilities-'));
  const env: NodeJS.ProcessEnv = { HOME: directory, USERPROFILE: directory, TEMP: directory, TMP: directory,
    CLAUDE_CONFIG_DIR: path.join(directory, 'config'), DISABLE_UPDATES: '1' };
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path']) if (process.env[key]) env[key] = process.env[key];
  const options = { cwd: directory, env, timeoutMs: 10000, maxOutputBytes: 131072, signal };
  try {
    const versionResult = await runBoundedChild(executable, ['--version'], options);
    const match = versionResult.stdout.trim().match(/^(\d+\.\d+\.\d+) \(Claude Code\)$/);
    if (versionResult.code !== 0 || !match) throw Error('Unrecognized client version');
    const help = await runBoundedChild(executable, ['--help'], options);
    if (help.code !== 0) throw Error('Client capability lookup failed');
    const missingControls = requiredControls.filter(flag => !new RegExp('(?:^|[\\s,])' + flag + '(?=[\\s,]|$)', 'm').test(help.stdout));
    return { version: match[1], controlsAvailable: missingControls.length === 0, missingControls,
      authenticationVerified: false, isolationVerified: false, inferencePerformed: false };
  } catch {
    // A client error may include private local details. Do not expose its output.
    throw Error('Claude client capability check failed or was cancelled; no model request was made');
  } finally {
    await fs.rm(directory, {recursive: true, force: true});
  }
}
