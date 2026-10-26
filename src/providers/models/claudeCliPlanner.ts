import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {runBoundedChild, BoundedChildFailure} from './boundedCliProcess.js';
import {inspectClaudeCliAuthentication} from './claudeCliCapabilities.js';
import {validateCliPlan} from './subscriptionCliModel.js';
import {ModelProviderError, type GenerativeModelProvider, type ModelRequestOptions, type ModelResponse, type ModelResponseUsage, type StreamChunk} from '../../core/providers/model.js';

/** Independent, non-resumed result totals. Missing fields mean unknown, never zero.
 * Cache reads/writes are separate from Anthropic's uncached input_tokens.
 */
export function decodeClaudePlannerUsage(raw: unknown): ModelResponseUsage | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  const fields = ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'] as const;
  if (fields.some(key => !Number.isSafeInteger(value[key]) || (value[key] as number) < 0)) return undefined;
  const input = value.input_tokens as number, output = value.output_tokens as number;
  const read = value.cache_read_input_tokens as number, write = value.cache_creation_input_tokens as number;
  const promptTokens = input + read + write, totalTokens = promptTokens + output;
  if (!Number.isSafeInteger(promptTokens) || !Number.isSafeInteger(totalTokens)) return undefined;
  return {promptTokens, completionTokens: output, totalTokens, cachedInputTokens: read, cacheWriteInputTokens: write};
}

export interface ClaudeCliPlannerConfiguration {
  executablePath: string;
  configurationDirectory: string;
  model: string;
}

/** Validate the complete non-streaming-input transcript, not just its final text.
 * This detects unexpected activity; it cannot undo activity already performed.
 */
export function inspectClaudePlannerTranscript(stdout: string) {
  const events: Record<string, any>[] = [];
  let malformed = false;
  for (const line of stdout.split(/\r?\n/).filter(line => line.trim())) {
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== 'object' || Array.isArray(event)) malformed = true;
      else events.push(event);
    } catch { malformed = true; }
  }
  const results = events.filter(event => event.type === 'result');
  const response = results.length === 1 ? results[0] : undefined;
  const usage = response ? decodeClaudePlannerUsage(response.usage) : undefined;
  const init = events[0];
  const empty = (value: unknown) => Array.isArray(value) && value.length === 0;
  const valid = !malformed && response !== undefined && events.at(-1) === response
    && init?.type === 'system' && init.subtype === 'init' && empty(init.tools) && empty(init.mcp_servers)
    && events.slice(1, -1).every(event => event.type === 'assistant' && event.parent_tool_use_id == null
      && Array.isArray(event.message?.content) && event.message.content.every((block: any) =>
        block?.type === 'text' && typeof block.text === 'string'));
  return {valid, response, usage};
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
    const input = 'Return only a JSON object with commands, an array of 1 to 100 objects with checkName, command and timeoutMs (at most 3600000). Draft only; do not execute. Use only supplied data.\n' + JSON.stringify(options.messages);
    if (Buffer.byteLength(input) > 32768) throw Error('Claude planner input exceeds 32KiB');
    const auth = await inspectClaudeCliAuthentication(this.config.executablePath, this.config.configurationDirectory, options.signal);
    if (options.signal?.aborted) throw Error('Claude planning cancelled during account check');
    if (auth.connectionKind !== 'subscription') throw Error('Official Claude subscription login required; no API fallback');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-claude-plan-'));
    const env: NodeJS.ProcessEnv = {HOME: directory, USERPROFILE: directory, TEMP: directory, TMP: directory,
      CLAUDE_CONFIG_DIR: this.config.configurationDirectory, DISABLE_UPDATES: '1'};
    for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path']) if (process.env[key]) env[key] = process.env[key];
    let usage: ModelResponseUsage | undefined;
    try {
      const result = await runBoundedChild(this.config.executablePath,
        ['--print', '--restricted', '--safe-mode', '--tools', '', '--disallowedTools', '*',
          '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', '',
          '--no-session-persistence', '--verbose', '--output-format', 'stream-json', '--model', this.config.model, '--max-turns', '1'],
        {cwd: directory, env, input, signal: options.signal, timeoutMs: 120000, maxOutputBytes: 2097152});
      const transcript = inspectClaudePlannerTranscript(result.stdout);
      const response = transcript.response;
      usage = transcript.usage;
      if (result.code !== 0) throw Error('Client failed');
      if (!transcript.valid || !response || response.subtype !== 'success' || response.is_error !== false || typeof response.result !== 'string')
        throw Error('Invalid client result');
      validateCliPlan(response.result);
      return {id: crypto.randomUUID(), model: this.config.model, content: response.result, usage, finishReason: 'stop'};
    } catch (error) {
      if (error instanceof BoundedChildFailure) {
        try {
          usage = inspectClaudePlannerTranscript(error.result.stdout).usage;
        } catch { /* Partial or malformed output leaves accounting unknown. */ }
      }
      throw new ModelProviderError('Claude planning failed or was cancelled; no automatic retry', usage);
    }
    finally { await fs.rm(directory, {recursive: true, force: true}); }
  }
  async *stream(_options: ModelRequestOptions): AsyncIterable<StreamChunk> {
    throw Error('Claude CLI route supports planning drafts only');
  }
}
