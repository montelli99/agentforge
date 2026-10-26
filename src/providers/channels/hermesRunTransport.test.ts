import {it,expect,vi} from 'vitest';
import {HermesRunTransport} from './hermesRunTransport.js';
import http from 'node:http';
import {once} from 'node:events';
const client=()=>new HermesRunTransport('http://127.0.0.1:8642','synthetic-secret');
it('requires authenticated run controls and discloses server-side execution without submitting work',async()=>{
 const capabilities={object:'hermes.api_server.capabilities',platform:'hermes-agent',auth:{type:'bearer',required:true},runtime:{tool_execution:'server'},features:{run_submission:true,run_status:true,run_stop:true}};
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json(capabilities));vi.stubGlobal('fetch',fetcher);
 expect(await client().verifyCapabilities()).toEqual({authenticated:true,toolExecution:'server'});
 expect(fetcher.mock.calls[0][0]).toBe('http://127.0.0.1:8642/v1/capabilities');
 expect(fetcher.mock.calls[0][1].method).toBe('GET');
 for(const invalid of [{...capabilities,auth:{type:'bearer',required:false}},{...capabilities,features:{run_submission:true}},{...capabilities,runtime:{tool_execution:'client'}},{}]){
  fetcher.mockResolvedValueOnce(Response.json(invalid));
  await expect(client().verifyCapabilities()).rejects.toThrow('required authenticated run controls');
 }
 fetcher.mockResolvedValueOnce(new Response('{}',{status:401}));
 await expect(client().verifyCapabilities()).rejects.toThrow('401');
 expect(fetcher.mock.calls.every(call=>call[1].method==='GET')).toBe(true);
});
it('uses real HTTP without following a credential-bearing redirect or replaying a lost response',async()=>{
 vi.unstubAllGlobals();
 const requests:Array<{path:string;key?:string;body:string}>=[];
 let redirected=0;
 const target=http.createServer((_req,res)=>{redirected++;res.end('{}');});
 target.listen(0,'127.0.0.1');await once(target,'listening');
 const targetPort=(target.address() as {port:number}).port;
 const server=http.createServer(async(req,res)=>{
  let body='';for await(const part of req)body+=part;
  requests.push({path:req.url!,key:req.headers['idempotency-key'] as string|undefined,body});
  if(req.url==='/v1/runs/redirect'){res.writeHead(307,{Location:'http://127.0.0.1:'+targetPort});res.end();return;}
  if(req.url==='/v1/runs'&&JSON.parse(body).input==='lose response'){req.socket.destroy();return;}
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(req.method==='POST'?{run_id:'run-http',status:'started'}:{run_id:'run-http',status:'unknown'}));
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const adapter=new HermesRunTransport('http://127.0.0.1:'+(server.address() as {port:number}).port,'synthetic-secret');
  expect(await adapter.submitSessionTurn('chosen','test','request-http')).toEqual({runId:'run-http'});
  expect(requests[0]).toEqual({path:'/v1/runs',key:'request-http',body:JSON.stringify({input:'test',session_id:'chosen'})});
  expect(await adapter.inspectRun('run-http')).toEqual({runId:'run-http',status:'unknown'});
  await expect(adapter.inspectRun('redirect')).rejects.toThrow('interrupted');expect(redirected).toBe(0);
  await expect(adapter.submitSessionTurn('chosen','lose response','request-lost')).rejects.toThrow('interrupted');
  expect(requests.filter(r=>r.key==='request-lost')).toHaveLength(1);
 }finally{server.closeAllConnections();target.closeAllConnections();await Promise.all([new Promise<void>(resolve=>server.close(()=>resolve())),new Promise<void>(resolve=>target.close(()=>resolve()))]);}
});
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
it('rejects dot-segment receipts and never observes or stops a normalized parent route',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 for(const runId of ['.','..']){
  await expect(client().inspectRun(runId)).rejects.toThrow('Invalid Hermes identifier');
  await expect(client().requestRunStop('session',runId)).rejects.toThrow('Invalid Hermes identifier');
 }
 expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValueOnce(Response.json({run_id:'..',status:'started'}));
 await expect(client().submitSessionTurn('session','task','request-123')).rejects.toThrow('Invalid Hermes identifier');
 expect(fetcher).toHaveBeenCalledTimes(1);
});
it('discovers only API-owned session metadata with bounded pagination',async()=>{
 const page={object:'list',limit:1,offset:0,has_more:true,data:[{id:'api-one',source:'api_server',title:'Synthetic session',preview:'not copied'},{id:'api-pin',source:'api_server',pinned:true}]};
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json(page));vi.stubGlobal('fetch',fetcher);
 expect(await client().listSessions(1,0)).toEqual({sessions:[{key:'api-one',name:'Synthetic session'},{key:'api-pin',name:'api-pin'}],nextOffset:1});
 expect(fetcher.mock.calls[0][0]).toBe('http://127.0.0.1:8642/api/sessions?source=api_server&limit=1&offset=0');
 for(const data of [[{id:'cli-one',source:'cli'}],[{id:'..',source:'api_server'}],[{id:'same',source:'api_server'},{id:'same',source:'api_server'}]]){
  fetcher.mockResolvedValueOnce(Response.json({...page,data}));
  await expect(client().listSessions(1,0)).rejects.toThrow();
 }
 const count=fetcher.mock.calls.length;
 await expect(client().listSessions(0,0)).rejects.toThrow();
 await expect(client().listSessions(25,1000001)).rejects.toThrow();
 expect(fetcher).toHaveBeenCalledTimes(count);
});

it('reads only bounded completed output for the exact saved run',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 fetcher.mockResolvedValueOnce(Response.json({run_id:'run-output',status:'completed',output:'Synthetic result'}));
 expect(await client().readRunOutput('run-output')).toEqual({runId:'run-output',content:'Synthetic result'});
 for(const invalid of [{run_id:'other',status:'completed',output:'wrong'},{run_id:'run-output',status:'running',output:'partial'},{run_id:'run-output',status:'completed',output:{private:'metadata'}},{run_id:'run-output',status:'completed',output:'x'.repeat(60001)}]){fetcher.mockResolvedValueOnce(Response.json(invalid));await expect(client().readRunOutput('run-output')).rejects.toThrow('unavailable');}
 expect(fetcher.mock.calls.every(call=>call[1].method==='GET')).toBe(true);
 vi.unstubAllGlobals();
});

it('rejects partial completion and oversized chunked metadata without retrying',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 try{
  for(const flags of [{partial:true},{interrupted:true},{completed:false}]){
   fetcher.mockResolvedValueOnce(Response.json({run_id:'saved',status:'completed',output:'1250',...flags}));
   await expect(client().readRunOutput('saved')).rejects.toThrow('unavailable');
  }
  let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(262144));},cancel(){cancelled=true;}});
  fetcher.mockResolvedValueOnce(new Response(stream));
  await expect(client().inspectRun('saved')).rejects.toThrow('Invalid Hermes response');
  expect(cancelled).toBe(true);expect(fetcher).toHaveBeenCalledTimes(4);
 }finally{vi.unstubAllGlobals();}
});
