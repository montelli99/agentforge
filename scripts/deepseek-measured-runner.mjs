import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const image=JSON.parse(await fs.readFile('docs/evidence/p09-deepseek-container-startup.json','utf8')).imageId;
const overlay=JSON.parse(await fs.readFile('docs/evidence/p09-deepseek-comparison-config.json','utf8')).overlay;
const proxySource=await fs.readFile('scripts/comparison-proxy.mjs','utf8');
const usageSource=await fs.readFile('scripts/reported-provider-usage.mjs','utf8');
const program=`(async()=>{
const fs=require('fs'),cp=require('child_process');
fs.mkdirSync('/tmp/home',{recursive:true});
fs.writeFileSync('/tmp/overlay.yml',${JSON.stringify(overlay)});
fs.writeFileSync('/tmp/comparison-proxy.mjs',${JSON.stringify(proxySource)});
fs.writeFileSync('/tmp/reported-provider-usage.mjs',${JSON.stringify(usageSource)});
const {comparisonProxy}=await import('file:///tmp/comparison-proxy.mjs');
let calls=0;const settings=[];
const proxy=comparisonProxy({token:'synthetic',apiKey:'synthetic-upstream',endpoint:'https://unused.invalid',model:'mimo-v2.6-flash',maxRequests:2,maxOutputTokens:2000,
record:async audits=>fs.writeFileSync('/tmp/accounting.json',JSON.stringify(audits)),
fetchImpl:async(_url,init)=>{
 const b=JSON.parse(init.body);settings.push({model:b.model,max_tokens:b.max_tokens,thinking:b.thinking});calls++;
 const delta=calls===1?{role:'assistant',tool_calls:[{index:0,id:'write-1',type:'function',function:{name:'write',arguments:JSON.stringify({file_path:'/tmp/artifacts/proof.txt',content:'measured-proof'})}}]}:{role:'assistant',content:'READY'};
 const frames=[{choices:[{index:0,delta,finish_reason:null}]},{choices:[{index:0,delta:{},finish_reason:calls===1?'tool_calls':'stop'}],usage:{prompt_tokens:10,completion_tokens:5}}];
 return new Response(frames.map(f=>'data: '+JSON.stringify({id:'fixture',model:b.model,created:1,object:'chat.completion.chunk',...f})).join('\\n\\n')+'\\n\\ndata: [DONE]\\n\\n',{headers:{'Content-Type':'text/event-stream'}});
}});
await new Promise(r=>proxy.server.listen(19999,'127.0.0.1',r));
const child=cp.spawn(process.execPath,['/opt/baseline/node_modules/@deepseek-ai/dsh/lib/bin.js','headless','--patch','/tmp/overlay.yml','--json','Write measured-proof to artifacts/proof.txt then reply READY.'],{env:{...process.env,AF_EVALUATION_PROXY_KEY:'synthetic'}});
let stdout='',stderr='';child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);
const timer=setTimeout(()=>child.kill(),20000);const status=await new Promise(r=>child.on('close',r));clearTimeout(timer);
const excess=await fetch('http://127.0.0.1:19999/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify({messages:[]})});
proxy.server.closeAllConnections();await new Promise(r=>proxy.server.close(r));
console.log(JSON.stringify({status,stdout,stderr,calls,settings,excessStatus:excess.status,audits:JSON.parse(fs.readFileSync('/tmp/accounting.json','utf8')),artifact:fs.existsSync('/tmp/artifacts/proof.txt')?fs.readFileSync('/tmp/artifacts/proof.txt','utf8'):null}));
})().catch(e=>{console.error(e);process.exitCode=1;});`;
const name='af-dsh-measured-'+randomUUID();
const args=['run','--rm','--name',name,'-i','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','128','--memory','768m','--cpus','1','--tmpfs','/tmp:rw,nosuid,nodev,size=134217728,mode=1777','--tmpfs','/tmp/node-addon-native-custom-loader-1000:rw,exec,nosuid,nodev,size=33554432,uid=1000,gid=1000,mode=0700','--entrypoint','node',image,'-'];
let attempt;try{attempt=spawnSync('docker',args,{input:program,encoding:'utf8',timeout:35000,maxBuffer:2*1024*1024});}finally{spawnSync('docker',['rm','-f',name],{encoding:'utf8',timeout:10000});}
assert.equal(attempt.status,0,attempt.stderr);const result=JSON.parse(attempt.stdout);
const evidence={recordedAt:new Date().toISOString(),image,proxySha256:createHash('sha256').update(proxySource).digest('hex'),network:'none',hostMounts:[],realProvider:false,result,scope:'Synthetic integrated provider-budget, accounting and file-tool proof; not a live benchmark'};
await fs.writeFile('docs/evidence/p09-deepseek-measured-runner.json',JSON.stringify(evidence,null,2)+'\n');
assert.equal(result.status,0);assert.equal(result.calls,2);assert.equal(result.excessStatus,429);assert.equal(result.artifact,'measured-proof');
assert.equal(result.audits.length,2);for(const audit of result.audits)assert.deepEqual(audit.usage,{inputTokens:10,outputTokens:5});
for(const settings of result.settings)assert.deepEqual(settings,{model:'mimo-v2.6-flash',max_tokens:2000,thinking:{type:'disabled'}});
console.log('PASS: isolated tool execution, exact file, pinned model limits, persisted usage and excess request rejection');
