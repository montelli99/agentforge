import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const image=JSON.parse(await fs.readFile('docs/evidence/p09-deepseek-container-startup.json','utf8')).imageId;
const overlay=JSON.parse(await fs.readFile('docs/evidence/p09-deepseek-comparison-config.json','utf8')).overlay;
const artifact=process.argv.includes('--artifact');
const inventory=process.argv.includes('--tool-inventory');
const synthetic=artifact||inventory||process.argv.includes('--synthetic-provider');
const name='af-dsh-load-'+randomUUID();
const offlineProgram=`const fs=require('fs'),cp=require('child_process');fs.mkdirSync('/tmp/home',{recursive:true});fs.writeFileSync('/tmp/overlay.yml',${JSON.stringify(overlay)});const r=cp.spawnSync(process.execPath,['/opt/baseline/node_modules/@deepseek-ai/dsh/lib/bin.js','headless','--patch','/tmp/overlay.yml','--json','Reply with the word READY. Do not use tools.'],{encoding:'utf8',timeout:20000,maxBuffer:1024*1024,env:{...process.env,AF_EVALUATION_PROXY_KEY:'synthetic-placeholder'}});console.log(JSON.stringify({status:r.status,error:r.error?.code??null,stdout:r.stdout,stderr:r.stderr}));`;
const syntheticProgram=`const fs=require('fs'),cp=require('child_process'),http=require('http');fs.mkdirSync('/tmp/home',{recursive:true});fs.writeFileSync('/tmp/overlay.yml',${JSON.stringify(overlay)});let requests=0,tools=[];const server=http.createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{requests++;const b=JSON.parse(body);tools=b.tools??[];if(!b.stream){res.writeHead(400);res.end('stream expected');return;}res.writeHead(200,{'Content-Type':'text/event-stream'});for(const c of (${artifact}&&requests===1?[{delta:{role:'assistant',tool_calls:[{index:0,id:'write-proof',type:'function',function:{name:'write',arguments:JSON.stringify({file_path:'/tmp/artifacts/proof.txt',content:'synthetic-proof'})}}]},finish_reason:null},{delta:{},finish_reason:'tool_calls'}]:[{delta:{role:'assistant',content:'READY'},finish_reason:null},{delta:{},finish_reason:'stop'}]))res.write('data: '+JSON.stringify({id:'synthetic',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,...c}]})+'\\n\\n');res.end('data: [DONE]\\n\\n');});});server.listen(19999,'127.0.0.1',()=>{const child=cp.spawn(process.execPath,['/opt/baseline/node_modules/@deepseek-ai/dsh/lib/bin.js','headless','--patch','/tmp/overlay.yml','--json','Reply with the word READY. Do not use tools.'],{env:{...process.env,AF_EVALUATION_PROXY_KEY:'synthetic-placeholder'}});let stdout='',stderr='';child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);const timer=setTimeout(()=>child.kill(),20000);child.on('close',status=>{clearTimeout(timer);server.close();console.log(JSON.stringify({status,requests,tools,stdout,stderr,artifact:fs.existsSync('/tmp/artifacts/proof.txt')?fs.readFileSync('/tmp/artifacts/proof.txt','utf8'):null}));});});`;
const program=synthetic?syntheticProgram:offlineProgram;
const args=['run','--rm','--name',name,'-i','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','128','--memory','768m','--cpus','1','--tmpfs','/tmp:rw,nosuid,nodev,size=134217728,mode=1777','--tmpfs','/tmp/node-addon-native-custom-loader-1000:rw,exec,nosuid,nodev,size=33554432,uid=1000,gid=1000,mode=0700','--entrypoint','node',image,'-'];
let attempt;
try{attempt=spawnSync('docker',args,{input:program,encoding:'utf8',timeout:35000,maxBuffer:2*1024*1024});}finally{spawnSync('docker',['rm','-f',name],{encoding:'utf8',timeout:10000});}
assert.equal(attempt.status,0,attempt.stderr);
const result=JSON.parse(attempt.stdout.trim());
const evidence={recordedAt:new Date().toISOString(),image,network:'none',hostMounts:[],realCredentials:false,syntheticTask:true,result,acceptance:false,syntheticProvider:synthetic,scope:synthetic?'Synthetic streaming transport acceptance only; no live-model or artifact benchmark claim':'Offline configuration loading diagnostic; expected unavailable model endpoint, not task acceptance'};
await fs.writeFile(artifact?'docs/evidence/p09-deepseek-synthetic-artifact.json':inventory?'docs/evidence/p09-deepseek-tool-inventory.json':synthetic?'docs/evidence/p09-deepseek-synthetic-provider.json':'docs/evidence/p09-deepseek-offline-load.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));

if(synthetic){assert.equal(result.status,0);assert.equal(result.requests,artifact?2:1);assert.match(result.stdout,/READY/);}

if(artifact)assert.equal(result.artifact,'synthetic-proof');
