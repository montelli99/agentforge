import { describe, expect, it, vi } from 'vitest';
import { ChatGPTDirectModel } from './chatgptDirectModel.js';
import { DirectResponsesTransport } from './chatgptDirectTransport.js';
import type { AuthorizedResponsesTransport, DirectCatalog, DirectGrant } from './chatgptDirectModel.js';

const options = { model: 'mock-entitled-slug', messages: [{ role: 'system' as const, content: 'Plan only' }, { role: 'user' as const, content: 'Draft' }], responseFormat: 'json' as const };
const terminal = (usage?: unknown) => ({ type: 'response.completed', response: { id: 'mock-response', status: 'completed', model: 'mock-reported', usage, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '{}' }] }] } });
function fixture(events: unknown[] = [{ type: 'response.output_text.delta', delta: '{}' }, terminal()], enabled = true, deadlineMs = 1000, maxOutputBytes?: number) {
  let grant: DirectGrant | undefined = { accountId: 'mock-account', grantId: 'mock-grant', resource: 'https://api.openai.com/v1', scopes: ['resource.invoke', 'chatgpt.tokens.use.direct'], expiresAt: Date.now() + 60000 };
  let catalog: DirectCatalog | undefined = { accountId: 'mock-account', grantId: 'mock-grant', expiresAt: Date.now() + 60000, response: { models: [{ slug: options.model, display_name: 'Mock only', visibility: 'list' }, { slug: 'hidden-mock', display_name: 'Hidden', visibility: 'hide' }] } };
  const open = vi.fn(async function* (_request: Parameters<AuthorizedResponsesTransport['open']>[0]) { yield* events; });
  const provider = new ChatGPTDirectModel({ enabled, model: options.model, deadlineMs, maxOutputBytes }, { currentGrant: () => grant }, () => catalog, { open });
  return { provider, open, setGrant: (value: DirectGrant | undefined) => { grant = value; }, setCatalog: (value: DirectCatalog | undefined) => { catalog = value; } };
}
describe('offline ChatGPT direct planning seam', () => {
  it('uses only a matching session and parses bounded SSE without retry or token-bearing errors', async () => {
    const grant:DirectGrant={accountId:'synthetic',grantId:'grant',resource:'https://api.openai.com/v1',scopes:['resource.invoke','chatgpt.tokens.use.direct'],expiresAt:Date.now()+60000};
    const credentials={clientId:'client',subject:grant.accountId,issuer:'https://auth.openai.com' as const,resource:grant.resource,accessToken:'synthetic-secret',idToken:'synthetic-id',tokenType:'Bearer' as const,scopes:grant.scopes,expiresAt:grant.expiresAt};
    const fetcher=vi.fn(async(_url: string | URL | Request,_init?:RequestInit)=>new Response('data: {"type":"response.completed"}\r\n\r\n',{headers:{'content-type':'text/event-stream'}}));
    const transport=new DirectResponsesTransport(()=>({credentials,grantId:'grant'}),fetcher);
    const input={url:'https://api.openai.com/v1/responses' as const,body:{model:'model',input:[],store:false as const,stream:true as const},grant,signal:new AbortController().signal};
    const collect=async (stream:AsyncIterable<unknown>)=>{const results=[];for await(const event of stream)results.push(event);return results;};
    expect(await collect(transport.open(input))).toEqual([{type:'response.completed'}]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({redirect:'error'});
    await expect(collect(transport.open({...input,grant:{...grant,grantId:'other'}}))).rejects.toThrow('unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const failing=vi.fn(async()=>{throw Error('synthetic-secret');});
    await expect(collect(new DirectResponsesTransport(()=>({credentials,grantId:'grant'}),failing).open(input))).rejects.toThrow('no retry');
    expect(failing).toHaveBeenCalledTimes(1);
    const missingType=async()=>new Response(new TextEncoder().encode('event: response.completed\ndata: {"type":"response.completed"}\n\n'));
    expect(await collect(new DirectResponsesTransport(()=>({credentials,grantId:'grant'}),missingType).open(input))).toEqual([{type:'response.completed'}]);
    const html=async()=>new Response(new TextEncoder().encode('<html>not a stream</html>\n\n'));
    await expect(collect(new DirectResponsesTransport(()=>({credentials,grantId:'grant'}),html).open(input))).rejects.toThrow('framing');
    const partial=async()=>new Response('data: {"type":"response.completed"}',{headers:{'content-type':'text/event-stream'}});
    await expect(collect(new DirectResponsesTransport(()=>({credentials,grantId:'grant'}),partial).open(input))).rejects.toThrow('Incomplete');
  });
  it('is opt-in and never opens transport without a valid grant/catalog', async () => {
    const f = fixture(undefined, false);
    expect(await f.provider.isAvailable()).toBe(false);
    expect(await f.provider.listModels()).toEqual([]);
    await expect(f.provider.generate(options)).rejects.toThrow('disabled');
    expect(f.open).not.toHaveBeenCalled();
    const missing = fixture(); missing.setGrant(undefined);
    await expect(missing.provider.generate(options)).rejects.toThrow('grant');
    expect(missing.open).not.toHaveBeenCalled();
    const insufficient = fixture();
    insufficient.setGrant({ accountId: 'mock-account', grantId: 'mock-grant', resource: 'https://api.openai.com/v1', scopes: ['resource.invoke'], expiresAt: Date.now() + 60000 });
    await expect(insufficient.provider.generate(options)).rejects.toThrow('grant');
    expect(insufficient.open).not.toHaveBeenCalled();
  });
  it('uses exact account catalog slugs and fails closed on account change/expiry', async () => {
    const f = fixture(); expect(await f.provider.listModels()).toEqual([options.model]);
    f.setCatalog({ accountId: 'other', grantId: 'mock-grant', expiresAt: Date.now() + 10000, response: { models: [{ slug: options.model, display_name: 'Mock', visibility: 'list' }] } });
    expect(await f.provider.isAvailable()).toBe(false);
    await expect(f.provider.generate(options)).rejects.toThrow('catalog');
    f.setCatalog(undefined); await expect(f.provider.generate(options)).rejects.toThrow('catalog');
    expect(f.open).not.toHaveBeenCalled();
  });
  it('emits the preview body only, developer instructions, no tools or unsupported fields', async () => {
    const f = fixture(); const result = await f.provider.generate(options);
    expect(result.content).toBe('{}'); expect(result.usage).toBeUndefined();
    const request = f.open.mock.calls[0]![0];
    expect(request.url).toBe('https://api.openai.com/v1/responses');
    expect(Object.keys(request).sort()).toEqual(['body', 'grant', 'signal', 'url']);
    expect(request.grant).not.toHaveProperty('accessToken');
    expect(Object.keys(request.body).sort()).toEqual(['input', 'model', 'store', 'stream']);
    expect(request.body).toMatchObject({ store: false, stream: true, model: options.model });
    expect(request.body.input.every(m => m.role !== ('system' as string))).toBe(true);
    expect(f.provider.auditGenerateBody(options)).toBe(JSON.stringify(request.body));
  });
  it.each([{ temperature: 0 }, { maxTokens: 10 }, { tools: [] }, { toolChoice: 'none' }, { thinking: 'disabled' }, { stop: [] }, { previous_response_id: 'mock' }, { background: false }])('rejects unsupported options %j before transport', async extra => {
    const f = fixture(); await expect(f.provider.generate({ ...options, ...extra } as typeof options)).rejects.toThrow('Unsupported'); expect(f.open).not.toHaveBeenCalled();
  });
  it('preserves valid usage and leaves absent or malformed accounting unknown', async () => {
    const usage = { input_tokens: 8, output_tokens: 2, total_tokens: 10, input_tokens_details: { cached_tokens: 3 } };
    expect((await fixture([{ type: 'response.output_text.delta', delta: '{}' }, terminal(usage)]).provider.generate(options)).usage).toEqual({ promptTokens: 8, completionTokens: 2, totalTokens: 10, cachedInputTokens: 3 });
    expect((await fixture([{ type: 'response.output_text.delta', delta: '{}' }, terminal({ input_tokens: 8 })]).provider.generate(options)).usage).toBeUndefined();
  });
  it.each(['response.failed', 'response.incomplete', 'error'])('does not convert %s into success', async type => {
    const f = fixture([{ type: 'response.output_text.delta', delta: '{}' }, { type, response: { error: { code: 'subscription_sharing_usage_limit_exceeded' }, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } }]);
    await expect(f.provider.generate(options)).rejects.toMatchObject({ usage: { totalTokens: 2 }, message: expect.stringContaining(type) }); expect(f.open).toHaveBeenCalledTimes(1);
  });
  it('rejects interrupted, malformed, non-text and tool-bearing completions', async () => {
    for (const events of [[], [{ type: 'response.output_text.delta', delta: 3 }], [{ type: 'response.output_item.added', item: { type: 'function_call' } }], [{ type: 'response.completed', response: { ...terminal().response, output: [{ type: 'function_call' }] } }], [{ type: 'response.output_text.delta', delta: 'different' }, terminal()]]) {
      await expect(fixture(events).provider.generate(options)).rejects.toThrow();
    }
  });
  it('rejects tool messages and oversized requests locally', async () => {
    const f = fixture();
    await expect(f.provider.generate({ ...options, messages: [{ role: 'tool', content: 'mock' }] })).rejects.toThrow('plain text');
    await expect(f.provider.generate({ ...options, messages: [{ role: 'user', content: 'x'.repeat(32769) }] })).rejects.toThrow('32KiB');
    expect(f.open).not.toHaveBeenCalled();
  });
  it('enforces a local response byte bound without adding a preview request field', async () => {
    const f=fixture([{type:'response.output_text.delta',delta:'12345'}],true,1000,4);
    await expect(f.provider.generate(options)).rejects.toThrow('local byte bound');
    expect(Object.keys(f.open.mock.calls[0]![0].body).sort()).toEqual(['input','model','store','stream']);
    expect(()=>fixture(undefined,true,1000,0)).toThrow('output byte bound');
  });
  it('cancels before opening and bounds a stalled transport by deadline', async () => {
    const f = fixture(); const controller = new AbortController(); controller.abort();
    await expect(f.provider.generate({ ...options, signal: controller.signal })).rejects.toThrow('cancelled'); expect(f.open).not.toHaveBeenCalled();
    const grant = { accountId: 'mock', grantId: 'mock', resource: 'https://api.openai.com/v1' as const, scopes: ['resource.invoke', 'chatgpt.tokens.use.direct'], expiresAt: Date.now() + 60000 };
    let signal: AbortSignal | undefined;
    const stalled = new ChatGPTDirectModel({ enabled: true, model: options.model, deadlineMs: 10 }, { currentGrant: () => grant }, () => ({ accountId: 'mock', grantId: 'mock', expiresAt: grant.expiresAt, response: { models: [{ slug: options.model, display_name: 'Mock', visibility: 'list' }] } }), { open(request) { signal = request.signal; return { [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }) }; } });
    await expect(stalled.generate(options)).rejects.toThrow('deadline'); expect(signal?.aborted).toBe(true);
  });
});

it('uses completed items when terminal output omits their repeated content',async()=>{
 const final=terminal();const item={...final.response.output[0],id:'synthetic-item',status:'completed'};
 const f=fixture([{type:'response.output_text.delta',delta:'{}'},{type:'response.output_item.done',output_index:0,item},{...final,response:{...final.response,output:[]}}]);
 expect((await f.provider.generate(options)).content).toBe('{}');
});
it('rejects mismatched completed-item text and missing item indexes',async()=>{
 for(const [index,text] of [[0,'changed'],[1,'{}']] as const){
 const final=terminal();const item={id:'synthetic-item',type:'message',content:[{type:'output_text',text}]};
 const f=fixture([{type:'response.output_text.delta',delta:'{}'},{type:'response.output_item.done',output_index:index,item},{...final,response:{...final.response,output:[]}}]);
 await expect(f.provider.generate(options)).rejects.toThrow();
 }
});
