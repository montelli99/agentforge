import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {comparisonProxy} from './comparison-proxy.mjs';
import {MiMoModelProvider} from '../src/providers/models/mimoModel.ts';
const settings=[];
const proxy=comparisonProxy({token:'synthetic',apiKey:'synthetic-upstream',endpoint:'https://unused.invalid',model:'mimo-v2.6-flash',maxRequests:2,maxOutputTokens:2000,fetchImpl:async(_url,init)=>{
 const b=JSON.parse(init.body);settings.push({model:b.model,max_tokens:b.max_tokens,thinking:b.thinking});
 const usage={prompt_tokens:10,completion_tokens:5,total_tokens:15};
 if(!b.stream)return new Response(JSON.stringify({id:'fixture-plan',model:b.model,choices:[{message:{content:'{"commands":[]}'},finish_reason:'stop'}],usage}),{headers:{'Content-Type':'application/json'}});
 return new Response('data: '+JSON.stringify({id:'fixture-chat',model:b.model,choices:[{delta:{content:'READY'},finish_reason:'stop'}],usage})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
}});
await new Promise(r=>proxy.server.listen(0,'127.0.0.1',r));
let result;
try{
 const model=new MiMoModelProvider('synthetic',`http://127.0.0.1:${proxy.server.address().port}/v1`);
 const options={model:'ignored-model',maxTokens:9999,messages:[{role:'user',content:'Synthetic transport check'}]};
 const generated=await model.generate(options);assert.equal(generated.content,'{"commands":[]}');assert.deepEqual(generated.usage,{promptTokens:10,completionTokens:5,totalTokens:15});
 const chunks=[];for await(const chunk of model.stream(options))chunks.push(chunk);
 assert.equal(chunks.map(c=>c.deltaText??'').join(''),'READY');assert.deepEqual(chunks.find(c=>c.usage)?.usage,generated.usage);
 await assert.rejects(()=>model.generate(options),/429/);assert.equal(proxy.dispatched,2);
 for(const s of settings)assert.deepEqual(s,{model:'mimo-v2.6-flash',max_tokens:2000,thinking:{type:'disabled'}});
 for(const a of proxy.audits)assert.deepEqual(a.usage,{inputTokens:10,outputTokens:5});
 result={passed:true,requests:proxy.dispatched,settings,audits:proxy.audits,generateUsage:generated.usage,streamUsage:chunks.find(c=>c.usage).usage,excessRejected:true};
}finally{proxy.server.closeAllConnections();await new Promise(r=>proxy.server.close(r));}
const files=['scripts/comparison-proxy.mjs','src/providers/models/mimoModel.ts'];
const evidence={recordedAt:new Date().toISOString(),files:await Promise.all(files.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')}))),realProvider:false,scope:'Source adapter transport integration only; not installed application or live task acceptance',result};
await fs.writeFile('docs/evidence/p09-agentforge-measured-adapter.json',JSON.stringify(evidence,null,2)+'\n');console.log('PASS: AgentForge generation and streaming share fixed settings, reported usage and request cap');
