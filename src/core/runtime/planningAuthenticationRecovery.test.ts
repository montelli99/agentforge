import {it,expect} from 'vitest';import http from 'node:http';
import {OpenAIModelProvider} from '../../providers/models/openaiModel.js';
import {ModelPlanDraftProvider} from './modelPlanDraftProvider.js';
import {planningAuditUnresolved,type PlanningAudit} from './executionReceipt.js';
import type {Task} from '../types/task.js';
it.each([401,403])('retains explicit authentication rejection %s without automatic retry or invented usage',async status=>{
 let requests=0;const server=http.createServer(async(req,res)=>{for await(const _ of req){}requests++;if(req.headers.authorization==='Bearer expired'){res.writeHead(status);res.end('{"error":"synthetic expired credential"}');return;}res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({id:'synthetic',choices:[{message:{content:'{"commands":[{"checkName":"unit_tests","command":"node -v"}]}'}}],usage:{prompt_tokens:3,completion_tokens:2,total_tokens:5}}));});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port;const audits:PlanningAudit[]=[];const accounting={requireReportedUsage:true,persist:async(a:PlanningAudit)=>{if(a.status==='started'&&audits.some(planningAuditUnresolved))throw Error('Unresolved earlier attempt');const i=audits.findIndex(x=>x.id===a.id);if(i<0)audits.push(a);else audits[i]=a;}};
 const task={id:'auth-recovery',contract:{requiredChecks:[]}} as unknown as Task;
 try{await expect(new ModelPlanDraftProvider(new OpenAIModelProvider('expired',base),'fixture',[],undefined,accounting).draft(task)).rejects.toThrow('Reconnect');expect(requests).toBe(1);expect(audits[0]).toMatchObject({status:'rejected',rejectionStatus:status});expect(audits[0].inputTokens).toBeUndefined();expect(audits[0].outputTokens).toBeUndefined();
 const draft=await new ModelPlanDraftProvider(new OpenAIModelProvider('fresh',base),'fixture',[],undefined,accounting).draft(task);expect(requests).toBe(2);expect(draft.source).toBe('model');expect(audits.map(a=>a.status)).toEqual(['rejected','completed']);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
it('unknown and malformed rejected audits remain unresolved',()=>{
 const base={id:'a',taskId:'t',model:'m',requestDigest:'d'};
 expect(planningAuditUnresolved({...base,status:'unknown'})).toBe(true);
 expect(planningAuditUnresolved({...base,status:'rejected'})).toBe(true);
 expect(planningAuditUnresolved({...base,status:'started'})).toBe(true);
});
it.each([401,403])('stream authentication rejection %s is typed and never retried',async status=>{
 const {ModelAuthenticationRejectedError}=await import('../providers/model.js');
 let requests=0;const server=http.createServer(async(req,res)=>{for await(const _ of req){}requests++;res.writeHead(status);res.end('synthetic refusal');});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const provider=new OpenAIModelProvider('synthetic','http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port);
  const consume=async()=>{for await(const _ of provider.stream({model:'fixture',messages:[]})){};};
  await expect(consume()).rejects.toBeInstanceOf(ModelAuthenticationRejectedError);
  expect(requests).toBe(1);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

it.each([401,403])('explicit reconnection after stream rejection %s yields only the fresh response',async status=>{
 const authorizations:string[]=[];
 const server=http.createServer(async(req,res)=>{
  for await(const _ of req){}authorizations.push(req.headers.authorization??'');
  if(req.headers.authorization!=='Bearer replacement'){res.writeHead(status);res.end('expired response must not enter chat');return;}
  res.writeHead(200,{'Content-Type':'text/event-stream'});
  res.end('data: '+JSON.stringify({choices:[{delta:{content:'Recovered response'},finish_reason:'stop'}],usage:{prompt_tokens:4,completion_tokens:2,total_tokens:6}})+'\n\ndata: [DONE]\n\n');
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port;
 const consume=async(key:string)=>{const chunks=[];for await(const chunk of new OpenAIModelProvider(key,base).stream({model:'fixture',messages:[]}))chunks.push(chunk);return chunks;};
 try{
  await expect(consume('expired')).rejects.toThrow();
  expect(authorizations).toEqual(['Bearer expired']);
  const chunks=await consume('replacement');
  expect(authorizations).toEqual(['Bearer expired','Bearer replacement']);
  expect(chunks.map(c=>c.deltaText??'').join('')).toBe('Recovered response');
  expect(chunks.at(-1)?.usage).toMatchObject({promptTokens:4,completionTokens:2,totalTokens:6});
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
