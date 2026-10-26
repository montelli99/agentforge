import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonProxy} from './comparison-proxy.mjs';
async function fixture(t,options={}){
 const calls=[];const proxy=comparisonProxy({token:'test',apiKey:'secret-test',endpoint:'https://provider.invalid/v1/chat/completions',model:'fixed-model',maxRequests:2,maxOutputTokens:100,fetchImpl:async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify({usage:{prompt_tokens:3,completion_tokens:2}}),{headers:{'Content-Type':'application/json'}});},...options});
 await new Promise(r=>proxy.server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>{proxy.server.closeAllConnections();proxy.server.close(r);}));
 const send=(body={messages:[]},token='test')=>fetch(`http://127.0.0.1:${proxy.server.address().port}/v1/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
 return {proxy,calls,send};
}
test('concurrent dispatch respects budget and pins provider settings',async t=>{
 const {proxy,calls,send}=await fixture(t);const responses=await Promise.all([send({messages:[],model:'wrong',max_tokens:999,max_completion_tokens:999}),send(),send()]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,200,429]);assert.equal(calls.length,2);
 const b=JSON.parse(calls[0].init.body);assert.equal(b.model,'fixed-model');assert.equal(b.max_tokens,100);assert.equal(b.max_completion_tokens,undefined);assert.deepEqual(b.thinking,{type:'disabled'});
 assert.deepEqual(proxy.audits[0].usage,{inputTokens:3,outputTokens:2});assert(!JSON.stringify(proxy.audits).includes('secret-test'));
});
test('unauthorized and malformed calls never consume provider budget',async t=>{
 const {proxy,send,calls}=await fixture(t);assert.equal((await send({},'bad')).status,401);assert.equal((await send({})).status,400);assert.equal(calls.length,0);assert.equal(proxy.dispatched,0);
});
test('failure is recorded and consumes its reserved request',async t=>{
 const {proxy,send}=await fixture(t,{maxRequests:1,fetchImpl:async()=>{throw Error('sensitive upstream detail');}});assert.equal((await send()).status,502);assert.equal((await send()).status,429);assert.equal(proxy.audits[0].status,'failed');assert.equal(proxy.audits[0].usage,null);assert(!JSON.stringify(proxy.audits).includes('sensitive'));
});
test('audit persistence failure prevents provider dispatch',async t=>{
 const {send,calls}=await fixture(t,{record:async()=>{throw Error('disk');}});assert.equal((await send()).status,502);assert.equal(calls.length,0);
});
test('streams the first frame before completion and records final usage',async t=>{
 let finish;const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"choices":[]}\n\n'));finish=()=>{c.enqueue(new TextEncoder().encode('data: {"usage":{"prompt_tokens":7,"completion_tokens":4}}\n\ndata: [DONE]\n\n'));c.close();};}});
 const {send,proxy}=await fixture(t,{fetchImpl:async()=>new Response(body,{headers:{'Content-Type':'text/event-stream'}})});
 const response=await send({messages:[],stream:true});const reader=response.body.getReader();const first=await reader.read();assert.match(new TextDecoder().decode(first.value),/choices/);finish();while(!(await reader.read()).done){}
 assert.deepEqual(proxy.audits[0].usage,{inputTokens:7,outputTokens:4});
});
test('provider timeout aborts request and retains unknown usage',async t=>{
 const {send,proxy}=await fixture(t,{timeoutMs:20,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}))});
 assert.equal((await send()).status,502);assert.equal(proxy.audits[0].status,'failed');assert.equal(proxy.audits[0].usage,null);
});
