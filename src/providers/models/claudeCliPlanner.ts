import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {runBoundedChild} from './boundedCliProcess.js';
import {inspectClaudeCliAuthentication} from './claudeCliCapabilities.js';
import {validateCliPlan} from './subscriptionCliModel.js';
import {ModelProviderError, type GenerativeModelProvider, type ModelRequestOptions, type ModelResponse, type StreamChunk} from '../../core/providers/model.js';

export interface ClaudeCliPlannerConfiguration {
  executablePath: string;
  configurationDirectory: string;
  model: string;
}

/** Opt-in draft generation through the official client. No command execution route.
 * Requested client controls are not an OS sandbox or proof of managed-policy isolation.
 */
export class ClaudeCliPlanner implements GenerativeModelProvider {
  readonly id = 'claude-subscription-cli';
  readonly name = 'Claude subscription CLI planner';
  readonly defaultTier = 1 as const;
  private readonly config: Readonly<ClaudeCliPlannerConfiguration>;

  constructor(config: ClaudeCliPlannerConfiguration) {
    if (!config || ![config.executablePath, config.configurationDirectory].every(value => typeof value === 'string' && path.isAbsolute(value))
      || typeof config.model !== 'string' || !/^claude-[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(config.model))
      throw Error('Explicit Claude executable, profile and model required');
    this.config = Object.freeze({...config});
  }
  async isAvailable() {
    try { return (await inspectClaudeCliAuthentication(this.config.executablePath, this.config.configurationDirectory)).connectionKind === 'subscription'; }
    catch { return false; }
  }
  async listModels() { return [this.config.model]; }
  auditGenerateBody(options: ModelRequestOptions) {
    return JSON.stringify({model: options.model, messages: options.messages, route: this.id,
      requestedControls: {tools: [], mcp: [], restricted: true, safeMode: true, sessionPersistence: false},
      isolationVerified: false, automaticRetry: false, apiFallback: false});
  }
  async generate(options: ModelRequestOptions): Promise<ModelResponse> {
    if (options.signal?.aborted) throw Error('Claude planning cancelled before launch');
    if (options.model !== this.config.model || options.tools?.length || options.stream || options.responseFormat !== 'json'
      || options.maxTokens !== undefined) throw Error('Unsupported Claude planner request; no hard token-cap claim');
    const input = 'Return only a JSON object with commands, an array of one or two objects with checkName, command and timeoutMs (at most 10000). Draft only; do not execute. Use only supplied data.\n' + JSON.stringify(options.messages);
    if (Buffer.byteLength(input) > 32768) throw Error('Claude planner input exceeds 32KiB');
    const auth = await inspectClaudeCliAuthentication(this.config.executablePath, this.config.configurationDirectory, options.signal);
    if (options.signal?.aborted) throw Error('Claude planning cancelled during account check');
    if (auth.connectionKind !== 'subscription') throw Error('Official Claude subscription login required; no API fallback');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-claude-plan-'));
    const env: NodeJS.ProcessEnv = {HOME: directory, USERPROFILE: directory, TEMP: directory, TMP: directory,
      CLAUDE_CONFIG_DIR: this.config.configurationDirectory, DISABLE_UPDATES: '1'};
    for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path']) if (process.env[key]) env[key] = process.env[key];
    try {
      const result = await runBoundedChild(this.config.executablePath,
        ['--print', '--restricted', '--safe-mode', '--tools', '', '--disallowedTools', '*',
          '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', '',
          '--no-session-persistence', '--output-format', 'json', '--model', this.config.model, '--max-turns', '1'],
        {cwd: directory, env, input, signal: options.signal, timeoutMs: 120000, maxOutputBytes: 2097152});
      if (result.code !== 0) throw Error('Client failed');
      const response = JSON.parse(result.stdout);
      if (response.type !== 'result' || response.subtype !== 'success' || response.is_error !== false || typeof response.result !== 'string')
        throw Error('Invalid client result');
      validateCliPlan(response.result);
      // Usage is intentionally absent until the official result accounting is validated.
      // The governed planner requires reported usage and will not accept unaccounted drafts.
      return {id: crypto.randomUUID(), model: this.config.model, content: response.result, finishReason: 'stop'};
    } catch { throw new ModelProviderError('Claude planning failed or was cancelled; no automatic retry'); }
    finally { await fs.rm(directory, {recursive: true, force: true}); }
  }
  async *stream(_options: ModelRequestOptions): AsyncIterable<StreamChunk> {
    throw Error('Claude CLI route supports planning drafts only');
  }
}
