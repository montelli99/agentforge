import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureChatGPTDirectPlanner, installChatGPTDirectRuntime } from './chatgptDirectPlanner.js';
import type { ChatGPTDirectRuntime } from './chatgptDirectPlanner.js';
import type { DirectGrant, DirectRequest } from './chatgptDirectModel.js';
import type { PlanningAudit } from '../../core/runtime/executionReceipt.js';

const task = { id: 'mock-task', title: 'Offline plan', contract: { requiredChecks: [], scope: {}, authority: {} } } as never;
const model = 'mock-entitled-slug';
const env = { AGENTFORGE_PLAN_DIRECT_ENABLED: 'true', AGENTFORGE_PLAN_DIRECT_MODEL: model };
let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); dispose = undefined; });
function runtime() {
  let grant: DirectGrant | undefined = { accountId: 'mock-account', grantId: 'mock-grant', resource: 'https://api.openai.com/v1', scopes: ['resource.invoke', 'chatgpt.tokens.use.direct'], expiresAt: Date.now() + 60000 };
  const content = '{"commands":[{"checkName":"mock-check","command":"node -v","timeoutMs":1000}]}';
  const open = vi.fn(async function* (_request: { body: DirectRequest }) {
    yield { type: 'response.output_text.delta', delta: content };
    yield { type: 'response.completed', response: { id: 'mock-response', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: content }] }], usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 } } };
  });
  const injected: ChatGPTDirectRuntime = { authorization: { currentGrant: () => grant }, catalog: () => ({ accountId: 'mock-account', grantId: 'mock-grant', expiresAt: Date.now() + 60000, response: { models: [{ slug: model, display_name: 'Mock only', visibility: 'list' }] } }), transport: { open } };
  return { injected, open, revoke: () => { grant = undefined; } };
}
describe('direct clean-instance planner configuration (offline)', () => {
  it('defaults disabled even with injected grant and never falls back', async () => {
    const r = runtime(), persist = vi.fn();
    const planner = configureChatGPTDirectPlanner({ AGENTFORGE_PLAN_DIRECT_MODEL: model }, { requireReportedUsage: true, persist }, r.injected);
    expect(planner.getReadiness().ready).toBe(false);
    await expect(planner.draft(task)).rejects.toThrow('disabled');
    expect(r.open).not.toHaveBeenCalled(); expect(persist).not.toHaveBeenCalled();
  });
  it('requires runtime injection and exact selection; blocks without credentials', async () => {
    const persist = vi.fn(); const planner = configureChatGPTDirectPlanner(env, { requireReportedUsage: true, persist });
    expect(planner.getReadiness().ready).toBe(false); await expect(planner.draft(task)).rejects.toThrow('grant');
    const r = runtime();
    const unentitled = configureChatGPTDirectPlanner({ ...env, AGENTFORGE_PLAN_DIRECT_MODEL: 'not-in-catalog' }, { requireReportedUsage: true, persist }, r.injected);
    await expect(unentitled.draft(task)).rejects.toThrow('catalog'); expect(r.open).not.toHaveBeenCalled();
  });
  it('uses launcher bootstrap injection and validates a preview-safe draft without approving it', async () => {
    const r = runtime(); dispose = installChatGPTDirectRuntime(r.injected);
    const persist = vi.fn(async (_audit: PlanningAudit) => {});
    const planner = configureChatGPTDirectPlanner(env, { requireReportedUsage: false, persist });
    expect(planner.getReadiness().ready).toBe(true);
    const draft = await planner.draft(task);
    expect(draft.source).toBe('model'); expect(draft.commands[0]?.command).toBe('node -v');
    expect(r.open).toHaveBeenCalledTimes(1);
    const body = r.open.mock.calls[0]![0].body;
    expect(Object.keys(body).sort()).toEqual(['input', 'model', 'store', 'stream']);
    expect(body.input[0]?.role).toBe('developer'); expect(body).toMatchObject({ store: false, stream: true });
    expect(persist.mock.calls[1]![0]).toMatchObject({ status: 'completed', inputTokens: 1, outputTokens: 2 });
    await expect(planner.getPlan()).rejects.toThrow('not an approved');
    r.revoke(); expect(planner.getReadiness().ready).toBe(false); await expect(planner.draft(task)).rejects.toThrow('grant'); expect(r.open).toHaveBeenCalledTimes(1);
  });
  it('rejects ambiguous opt-in and malformed deadlines', () => {
    for (const flags of [{ AGENTFORGE_PLAN_DIRECT_ENABLED: '1' }, { ...env, AGENTFORGE_PLAN_DIRECT_DEADLINE_MS: 'NaN' }, { ...env, AGENTFORGE_PLAN_DIRECT_DEADLINE_MS: '0' }, { ...env, AGENTFORGE_PLAN_DIRECT_MAX_OUTPUT_BYTES: '0' }]) {
      expect(() => configureChatGPTDirectPlanner(flags, { requireReportedUsage: true, persist: async () => {} })).toThrow();
    }
  });
  it('rejects duplicate runtime installation', () => {
    const r = runtime(); dispose = installChatGPTDirectRuntime(r.injected);
    expect(() => installChatGPTDirectRuntime(r.injected)).toThrow('already installed');
  });
});
