import {it,expect,vi} from 'vitest';
import {HermesRunTransport} from './hermesRunTransport.js';
const client=()=>new HermesRunTransport('http://127.0.0.1:8642','synthetic-secret');
it('submits an explicit session once with the durable request key',async()=>{
 const fetcher=vi.fn(async()=>Response.json({run_id:'run-test',status:'started'}));vi.stubGlobal('fetch',fetcher);
 expect(await client().submitSessionTurn('selected-session','Synthetic task','request-123')).toEqual({runId:'run-test'});
 expect(fetcher).toHaveBeenCalledTimes(1);
 const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe('http://127.0.0.1:8642/v1/runs');expect(options.redirect).toBe('error');
 expect(options.headers).toMatchObject({'Idempotency-Key':'request-123'});
 expect(JSON.parse(options.body as string)).toEqual({input:'Synthetic task',session_id:'selected-session'});
});
it('does not retry or expose provider errors after uncertain submission',async()=>{
 const fetcher=vi.fn().mockRejectedValue(Error('synthetic-secret'));vi.stubGlobal('fetch',fetcher);
 await expect(client().submitSessionTurn('session','task','request-123')).rejects.toThrow('do not automatically retry');expect(fetcher).toHaveBeenCalledTimes(1);
 fetcher.mockResolvedValueOnce(new Response('private body',{status:503}));
 await expect(client().submitSessionTurn('session','task','request-456')).rejects.toThrow('503');expect(fetcher).toHaveBeenCalledTimes(2);
 fetcher.mockResolvedValueOnce(new Response('private body',{status:200}));
 await expect(client().inspectRun('run-test')).rejects.toThrow('Invalid Hermes response');
});
it('preserves unknown status and rejects mismatched run observations',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({run_id:'run-test',status:'unknown',output:'not imported'})).mockResolvedValueOnce(Response.json({run_id:'other',status:'completed'}));vi.stubGlobal('fetch',fetcher);
 expect(await client().inspectRun('run-test')).toEqual({runId:'run-test',status:'unknown'});
 await expect(client().inspectRun('run-test')).rejects.toThrow('Mismatched');
});
it('reports stopping only as acknowledgment, with no automatic polling',async()=>{
 const fetcher=vi.fn(async()=>Response.json({status:'stopping'}));vi.stubGlobal('fetch',fetcher);
 expect(await client().requestRunStop('session','run-test')).toEqual({acknowledged:true});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects insecure origins and invalid submissions before network access',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 for(const url of ['http://remote.example','https://user:pass@example.test','https://example.test/path','https://example.test/?key=x'])expect(()=>new HermesRunTransport(url,'secret')).toThrow();
 await expect(client().submitSessionTurn('','task','request-123')).rejects.toThrow();
 await expect(client().submitSessionTurn('session','task','bad')).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
});
