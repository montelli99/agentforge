import { ModelProviderError, isReportedModelId } from '../../core/providers/model.js';
import type { GenerativeModelProvider, ModelRequestOptions, ModelResponse, ModelResponseUsage, StreamChunk } from '../../core/providers/model.js';

const resource = 'https://api.openai.com/v1' as const;
export interface DirectGrant {
  /** Validated by an explicitly authorized OAuth implementation, never by this adapter. */
  accountId: string;
  grantId: string;
  resource: typeof resource;
  scopes: readonly string[];
  expiresAt: number;
}
export interface DirectAuthorization {
  /** Read-only snapshot; must not initiate login, refresh, or load foreign credentials. */
  currentGrant(): DirectGrant | undefined;
}
export interface DirectCatalog {
  accountId: string;
  grantId: string;
  expiresAt: number;
  /** Unmodified JSON from a future explicitly authorized /models request. */
  response: unknown;
}
export interface DirectRequest {
  model: string;
  input: Array<{ role: 'developer' | 'user' | 'assistant'; content: string }>;
  store: false;
  stream: true;
}
export interface AuthorizedResponsesTransport {
  /** Future implementation binds this grant to its own token, sends Bearer auth,
   * decodes bounded SSE JSON, rejects HTTP errors, honors abort, closes on return,
   * and never retries or logs credentials. No network implementation ships here. */
  open(request: { url: 'https://api.openai.com/v1/responses'; body: DirectRequest; grant: DirectGrant; signal: AbortSignal }): AsyncIterable<unknown>;
}
export interface DirectConfiguration { enabled?: boolean; model?: string; deadlineMs?: number; maxOutputBytes?: number }
type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {};
function usageOf(value: unknown): ModelResponseUsage | undefined {
  const u = record(value);
  if (![u.input_tokens, u.output_tokens, u.total_tokens].every(n => Number.isSafeInteger(n) && (n as number) >= 0)) return undefined;
  const result: ModelResponseUsage = { promptTokens: u.input_tokens as number, completionTokens: u.output_tokens as number, totalTokens: u.total_tokens as number };
  const cached = record(u.input_tokens_details).cached_tokens;
  if (Number.isSafeInteger(cached) && (cached as number) >= 0 && (cached as number) <= result.promptTokens) result.cachedInputTokens = cached as number;
  return result;
}

/** Parses only displayable account-catalog slugs and preserves server order.
 * Undefined means the catalog shape was not safe to use. */
export function listedDirectModelSlugs(value: unknown): string[] | undefined {
  const models = record(value).models;
  if (!Array.isArray(models)) return undefined;
  const slugs: string[] = [];
  for (const value of models) {
    const model = record(value);
    if (model.visibility !== 'list') continue;
    if (!isReportedModelId(model.slug) || typeof model.display_name !== 'string') return undefined;
    slugs.push(model.slug);
  }
  return slugs;
}

/** Offline opt-in seam only. No auth, fetch, file access, planner registration or fallback. */
export class ChatGPTDirectModel implements GenerativeModelProvider {
  readonly id = 'chatgpt-direct';
  readonly name = 'ChatGPT direct Responses (offline seam)';
  readonly defaultTier = 2 as const;
  private readonly config: Readonly<DirectConfiguration>;
  constructor(config: DirectConfiguration, private readonly authorization: DirectAuthorization,
    private readonly catalog: () => DirectCatalog | undefined, private readonly transport: AuthorizedResponsesTransport) {
    this.config = Object.freeze({ ...config });
    const timeout = config.deadlineMs ?? 30000;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 120000) throw Error('Invalid direct Responses deadline');
    const maxOutputBytes=config.maxOutputBytes??1048576;
    if(!Number.isSafeInteger(maxOutputBytes)||maxOutputBytes<1||maxOutputBytes>1048576) throw Error('Invalid direct local output byte bound');
  }
  private grant(): DirectGrant {
    const g = this.authorization.currentGrant();
    if (this.config.enabled !== true || !g || !g.accountId || !g.grantId || g.resource !== resource || !Number.isFinite(g.expiresAt) || g.expiresAt <= Date.now()
      || !['resource.invoke', 'chatgpt.tokens.use.direct'].every(s => g.scopes.includes(s))) throw Error('Direct Responses disabled or valid authorized grant missing');
    return { ...g, scopes: [...g.scopes] };
  }
  private models(g: DirectGrant): string[] {
    const c = this.catalog();
    if (!c || c.accountId !== g.accountId || c.grantId !== g.grantId || !Number.isFinite(c.expiresAt) || c.expiresAt <= Date.now()) return [];
    return listedDirectModelSlugs(c.response) ?? [];
  }
  getReadiness(): { ready: boolean; blocker?: string } {
    try {
      const g = this.grant();
      return this.config.model && this.models(g).includes(this.config.model)
        ? { ready: true } : { ready: false, blocker: 'Direct planner requires an exact selected model in the current authorized catalog' };
    } catch { return { ready: false, blocker: 'Direct planner disabled or validated runtime grant missing' }; }
  }
  async isAvailable(): Promise<boolean> { return this.getReadiness().ready; }
  async listModels(): Promise<string[]> { try { return this.models(this.grant()); } catch { return []; } }
  private body(options: ModelRequestOptions): DirectRequest {
    const allowed = new Set(['model', 'messages', 'signal', 'stream', 'responseFormat']);
    if (Object.keys(options).some(k => !allowed.has(k) && (options as unknown as RecordValue)[k] !== undefined)
      || options.stream === true || (options.responseFormat !== undefined && options.responseFormat !== 'json')
      || !this.config.model || options.model !== this.config.model || !Array.isArray(options.messages) || options.messages.length === 0) throw Error('Unsupported direct text planning request');
    const input = options.messages.map(m => {
      if (!['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || Object.keys(m).some(k => !['role', 'content'].includes(k))) throw Error('Only plain text messages supported');
      return { role: (m.role === 'system' ? 'developer' : m.role) as 'developer' | 'user' | 'assistant', content: m.content };
    });
    if (options.responseFormat === 'json') input.unshift({ role: 'developer', content: 'Return only valid JSON for the requested planning draft. Do not execute actions or use tools.' });
    const body: DirectRequest = { model: options.model, input, store: false, stream: true };
    if (Buffer.byteLength(JSON.stringify(body)) > 32768) throw Error('Direct text request exceeds 32KiB');
    return body;
  }
  auditGenerateBody(options: ModelRequestOptions): string { return JSON.stringify(this.body(options)); }
  async generate(options: ModelRequestOptions): Promise<ModelResponse> {
    const body = this.body(options), grant = this.grant();
    if (!this.models(grant).includes(body.model)) throw Error('Selected model is not in current authorized account catalog');
    if (options.signal?.aborted) throw new ModelProviderError('Direct planning cancelled');
    const controller = new AbortController();
    let rejectAbort!: (reason: Error) => void;
    const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
    const cancel = () => { controller.abort(); rejectAbort(new ModelProviderError('Direct planning cancelled or deadline exceeded')); };
    options.signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, this.config.deadlineMs ?? 30000);
    let iterator: AsyncIterator<unknown> | undefined, usage: ModelResponseUsage | undefined;
    try {
      iterator = this.transport.open({ url: `${resource}/responses`, body, grant, signal: controller.signal })[Symbol.asyncIterator]();
      let content = '', events = 0;
      while (true) {
        const next = await Promise.race([iterator.next(), aborted]);
        if (next.done) throw new ModelProviderError('Direct stream ended without response.completed', usage);
        const event = record(next.value), response = record(event.response);
        if (++events > 10000 || typeof event.type !== 'string' || Buffer.byteLength(JSON.stringify(event)) > 2097152) throw new ModelProviderError('Malformed or oversized direct event', usage);
        if (event.type === 'response.failed' || event.type === 'response.incomplete' || event.type === 'error') {
          usage = usageOf(response.usage);
          const code = record(response.error).code ?? event.code;
          throw new ModelProviderError(`Direct ${event.type}: ${isReportedModelId(code) ? code : 'unknown_error'}`, usage);
        }
        if (event.type === 'response.output_item.added' || event.type === 'response.output_item.done') {
          const item = record(event.item);
          if (!['message', 'reasoning'].includes(item.type as string)) throw new ModelProviderError('Forbidden direct output activity', usage);
        }
        if (event.type === 'response.output_text.delta') {
          if (typeof event.delta !== 'string') throw new ModelProviderError('Malformed direct text delta', usage);
          content += event.delta;
          if (Buffer.byteLength(content) > (this.config.maxOutputBytes??1048576)) throw new ModelProviderError('Direct output exceeds local byte bound', usage);
        }
        if (event.type === 'response.completed') {
          usage = usageOf(response.usage);
          if (response.status !== 'completed' || typeof response.id !== 'string' || !Array.isArray(response.output)) throw new ModelProviderError('Malformed direct completion', usage);
          const messages = response.output.map(record);
          if (messages.some(i => !['message', 'reasoning'].includes(i.type as string))) throw new ModelProviderError('Forbidden direct completion activity', usage);
          const parts = messages.filter(i => i.type === 'message').flatMap(i => Array.isArray(i.content) ? i.content.map(record) : [ {} ]);
          if (parts.some(p => p.type !== 'output_text' || typeof p.text !== 'string')) throw new ModelProviderError('Non-text direct completion', usage);
          const finalText = parts.map(p => p.text as string).join('');
          if (Buffer.byteLength(finalText) > (this.config.maxOutputBytes??1048576) || finalText !== content) throw new ModelProviderError('Direct completed text does not match stream', usage);
          if (options.responseFormat === 'json') { try { JSON.parse(finalText); } catch { throw new ModelProviderError('Direct response is not valid JSON', usage); } }
          return { id: response.id, model: body.model, reportedModel: isReportedModelId(response.model) ? response.model : undefined, content: finalText, usage, finishReason: 'stop' };
        }
      }
    } catch (error) {
      if (error instanceof ModelProviderError) throw error;
      throw new ModelProviderError('Direct transport failed; no retry or fallback', usage);
    } finally {
      clearTimeout(timer); options.signal?.removeEventListener('abort', cancel); controller.abort();
      // Do not let a broken injected transport delay cancellation; its contract owns closure.
      try { void iterator?.return?.().catch(() => undefined); } catch { /* bounded cleanup */ }
    }
  }
  async *stream(_options: ModelRequestOptions): AsyncIterable<StreamChunk> { throw Error('Direct adapter exposes completed planning only'); }
}
