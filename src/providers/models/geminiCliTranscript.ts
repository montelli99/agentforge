import type {ModelResponseUsage} from '../../core/providers/model.js';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/** The CLI's total includes tokens beyond visible candidates; do not replace it
 * with input + output, or count cached prompt tokens twice. */
export function decodeGeminiCliUsage(value: unknown): ModelResponseUsage | undefined {
  if (!record(value)) return undefined;
  const {input_tokens: input, output_tokens: output, total_tokens: total, cached} = value;
  if (!count(input) || !count(output) || !count(total) || !count(cached)
    || !Number.isSafeInteger(input + output) || total < input + output || cached > input) return undefined;
  return {promptTokens: input, completionTokens: output, totalTokens: total, cachedInputTokens: cached};
}

/** Inspect the official 0.65 stream-json protocol for a single planning turn.
 * This detects unwanted activity; it neither prevents nor reverses effects.
 * A valid transcript does not prove authentication, isolation or a valid plan.
 */
export function inspectGeminiCliTranscript(stdout: string, expectedModel: string, expectedPrompt: string) {
  const events: RecordValue[] = [];
  let malformed = Buffer.byteLength(stdout) > 2 * 1024 * 1024;
  if (!malformed) for (const line of stdout.split(/\r?\n/).filter(line => line.trim())) {
    try { const event: unknown = JSON.parse(line); if (record(event)) events.push(event); else malformed = true; }
    catch { malformed = true; }
  }
  const results = events.filter(event => event.type === 'result');
  const result = results.length === 1 ? results[0] : undefined;
  // Preserve trustworthy accounting even if activity or the outcome is rejected.
  const usage = result ? decodeGeminiCliUsage(result.stats) : undefined;
  const init = events[0], user = events[1];
  const messages = events.slice(2, -1);
  const valid = !malformed && !!expectedModel && result !== undefined && events.at(-1) === result
    && init?.type === 'init' && init.model === expectedModel && typeof init.session_id === 'string' && !!init.session_id
    && user?.type === 'message' && user.role === 'user' && user.content === expectedPrompt
    && messages.length > 0 && messages.every(event => event.type === 'message' && event.role === 'assistant'
      && event.delta === true && typeof event.content === 'string')
    && result.status === 'success' && result.error == null && record(result.stats) && result.stats.tool_calls === 0;
  return {valid, content: valid ? messages.map(event => event.content as string).join('') : undefined, usage};
}
