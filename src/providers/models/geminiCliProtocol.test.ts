import {describe, expect, it} from 'vitest';
import {encodeGeminiPlannerPrompt} from './geminiCliPrompt.js';
import {decodeGeminiCliUsage, inspectGeminiCliTranscript} from './geminiCliTranscript.js';
import type {ModelMessage} from '../../core/providers/model.js';

const stats = {input_tokens: 30, output_tokens: 10, total_tokens: 45, cached: 20, tool_calls: 0};
const events = (): Array<Record<string, unknown>> => [
  {type: 'init', model: 'synthetic-model', session_id: 'synthetic-session'},
  {type: 'message', role: 'user', content: 'synthetic prompt'},
  {type: 'message', role: 'assistant', delta: true, content: '{"commands":'},
  {type: 'message', role: 'assistant', delta: true, content: '[]}'},
  {type: 'result', status: 'success', stats: {...stats}},
];
const encode = (values: unknown[]) => values.map(value => JSON.stringify(value)).join('\n');
const inspect = (values: unknown[]) => inspectGeminiCliTranscript(encode(values), 'synthetic-model', 'synthetic prompt');

describe('Gemini planning transport contract', () => {
  it('round-trips command-like and file-like text without exposing CLI at-reference syntax', () => {
    const messages: ModelMessage[] = [{role: 'user', content: '/shell\n@C:/synthetic/file @../file user@example.invalid \\@file literal \\u0040 你好 🌍'}];
    const encoded = encodeGeminiPlannerPrompt(messages);
    expect(encoded.startsWith('/')).toBe(false);
    expect(encoded).not.toContain('@');
    expect(JSON.parse(encoded.split('\nMessage data:\n')[1])).toEqual(messages);
  });

  it.each([
    [], [{role: 'tool', content: 'text'}], [{role: 'user', content: 12}],
    [{role: 'assistant', content: 'text', toolCalls: []}], [{role: 'user', content: 'text', toolCallId: 'call'}],
  ].map(messages => ({messages})))('rejects invalid or tool-bearing input %#', ({messages}) => {
    expect(() => encodeGeminiPlannerPrompt(messages as ModelMessage[])).toThrow('text messages');
  });

  it('bounds input by UTF-8 bytes rather than JavaScript character count', () => {
    expect(() => encodeGeminiPlannerPrompt([{role: 'user', content: '🌍'.repeat(9000)}])).toThrow('32KiB');
  });

  it('assembles one bound text turn and preserves provider totals without double-counting cache', () => {
    expect(inspect(events())).toEqual({valid: true, content: '{"commands":[]}', usage: {
      promptTokens: 30, completionTokens: 10, totalTokens: 45, cachedInputTokens: 20,
    }});
    // Transcript validity deliberately does not imply that this empty plan is executable.
  });

  const invalid: Array<[string, (values: Array<Record<string, unknown>>) => void]> = [
    ['different model', values => {values[0].model = 'other';}],
    ['different prompt', values => {values[1].content = 'other';}],
    ['missing session', values => {values[0].session_id = '';}],
    ['tool activity', values => {values.splice(2, 0, {type: 'tool_use', name: 'shell'});}],
    ['reported tool call', values => {values.at(-1)!.stats = {...stats, tool_calls: 1};}],
    ['failed result', values => {values.at(-1)!.status = 'error';}],
    ['result error', values => {values.at(-1)!.error = 'synthetic failure';}],
    ['non-delta output', values => {values[2].delta = false;}],
    ['activity after result', values => {values.push({type: 'message', role: 'assistant', delta: true, content: 'late'});}],
  ];
  it.each(invalid)('rejects %s but retains the unique reported usage', (_name, change) => {
    const values = events(); change(values);
    const result = inspect(values);
    expect(result.valid).toBe(false);
    expect(result.content).toBeUndefined();
    expect(result.usage?.totalTokens).toBe(45);
  });

  it('rejects ambiguous or truncated completion without inventing usage', () => {
    const duplicate = events(); duplicate.push(duplicate.at(-1)!);
    expect(inspect(duplicate)).toMatchObject({valid: false, content: undefined, usage: undefined});
    expect(inspect(events().slice(0, -1))).toMatchObject({valid: false, content: undefined, usage: undefined});
    expect(inspectGeminiCliTranscript(encode(events()) + '\n{', 'synthetic-model', 'synthetic prompt')).toMatchObject({valid: false, content: undefined});
  });

  it.each([
    {...stats, input_tokens: -1}, {...stats, output_tokens: 1.5}, {...stats, total_tokens: 39},
    {...stats, cached: 31}, {...stats, cached: undefined}, {...stats, total_tokens: Number.MAX_SAFE_INTEGER + 1},
  ])('rejects invalid accounting %#', value => {expect(decodeGeminiCliUsage(value)).toBeUndefined();});
});
