import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {comparisonCase} from './comparison-case.mjs';
import {startComparisonGateway,dockerRun,containerLimits} from './comparison-container-gateway.mjs';
const output=process.argv[2];
if(!output||!process.env.MIMO_API_KEY)throw Error('New evidence path and dedicated provider credential required');
const file=await fs.open(output,'wx');
const image=JSON.parse(await fs.readFile('docs/evidence/p09-deepseek-container-startup.json','utf8')).imageId;
const overlay=JSON.parse(await fs.readFile('docs/evidence/p09-deepseek-comparison-config.json','utf8')).overlay.replace('http://127.0.0.1:19999/v1','http://accounting:19999/v1');
const name=`af-live-dsh-${randomUUID()}`;
const record={recordedAt:new Date().toISOString(),status:'started',image,model:'mimo-v2.6-flash',maxRequests:3,maxOutputTokens:1000,syntheticTask:true,scoredComparison:false,providerCredentialInClient:false};
let gateway,staging;
try{
 const item=process.argv[3]?await comparisonCase(process.argv[3]):null;
 let input=null;
 if(item){staging=await fs.mkdtemp(path.join(os.tmpdir(),'af-live-comparison-'));await item.stage(staging);input=await fs.readFile(path.join(staging,'input.json'),'utf8');record.caseId=item.id;record.inputSha256=item.inputSha256;}
 gateway=await startComparisonGateway({image,apiKey:process.env.MIMO_API_KEY,endpoint:'https://token-plan-sgp.xiaomimimo.com/v1/chat/completions',model:record.model,maxRequests:3,maxOutputTokens:1000});
 record.proxySha256=gateway.proxySha256;
 const program=`import fs from 'node:fs/promises';import {spawn} from 'node:child_process';
await fs.mkdir('/tmp/home',{recursive:true});await fs.writeFile('/tmp/config.yml',${JSON.stringify(overlay)});
if(${input!==null})await fs.writeFile('/tmp/input.json',${JSON.stringify(input)});
const child=spawn(process.execPath,['/opt/baseline/node_modules/@deepseek-ai/dsh/lib/bin.js','headless','--patch','/tmp/config.yml','--json',${JSON.stringify(item?.prompt??'Write exactly gateway-live-proof to /tmp/artifacts/proof.txt using the write tool, then reply DONE.')}],{cwd:'/tmp',env:{PATH:process.env.PATH,HOME:'/tmp/home',AF_EVALUATION_PROXY_KEY:${JSON.stringify(gateway.token)}}});
let bytes=0;for(const stream of [child.stdout,child.stderr])stream.on('data',c=>{bytes+=c.length;if(bytes>1048576)child.kill('SIGKILL');});
const timer=setTimeout(()=>child.kill('SIGKILL'),90000);const status=await new Promise((r,j)=>{child.on('error',j);child.on('close',r);});clearTimeout(timer);
let artifact=null,inputAfter=null;try{
const target=${JSON.stringify(item?'/tmp/artifacts/result.json':'/tmp/artifacts/proof.txt')};
const dir=await fs.lstat('/tmp/artifacts'),stat=await fs.lstat(target);
if(!dir.isDirectory()||dir.isSymbolicLink()||!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw Error('Invalid artifact');
artifact=await fs.readFile(target,'utf8');
if(${input!==null}){const s=await fs.lstat('/tmp/input.json');if(!s.isFile()||s.isSymbolicLink()||s.size>65536)throw Error('Invalid input');inputAfter=await fs.readFile('/tmp/input.json','utf8');}
}catch{}
console.log(JSON.stringify({status,artifact,inputAfter}));`;
 const started=performance.now();
 const result=JSON.parse(dockerRun(['run','--rm','--name',name,'--network',gateway.network,...containerLimits,'--tmpfs','/tmp/node-addon-native-custom-loader-1000:rw,exec,nosuid,nodev,size=33554432,uid=1000,gid=1000,mode=0700','-i','--entrypoint','node',image,'--input-type=module'],program,100000));
 record.elapsedMs=performance.now()-started;record.exitCode=result.status;
 record.artifactMatches=result.artifact==='gateway-live-proof';
 if(item){
  record.inputUnchanged=result.inputAfter===input;
  await fs.mkdir(path.join(staging,'artifacts'));
  await fs.writeFile(path.join(staging,'artifacts/result.json'),result.artifact??'');
  record.score=await item.score(staging);record.artifactMatches=record.score.passed&&record.inputUnchanged;
 }
 record.artifactSha256=result.artifact===null?null:createHash('sha256').update(result.artifact).digest('hex');
 record.audits=await gateway.audit();
 assert.equal(result.status,0);assert.equal(record.artifactMatches,true);assert.ok(record.audits.length>0&&record.audits.length<=3);
 assert.ok(record.audits.every(a=>a.status==='response'&&a.httpStatus===200&&a.usage!==null));
 record.status='passed';
}catch(error){record.status='failed';record.error=error instanceof assert.AssertionError?'Acceptance assertion failed':'Runner or provider failed';process.exitCode=1;
}finally{
 if(gateway){
  try{record.audits=await gateway.audit();}catch{record.status='failed';record.auditReadFailed=true;process.exitCode=1;}
  try{await gateway.close();}catch{record.status='failed';record.cleanupFailed=true;process.exitCode=1;}
 }
 // Remove only this generated client if the outer Docker deadline interrupted it.
 try{dockerRun(['rm','-f',name]);}catch{}
 if(staging)await fs.rm(staging,{recursive:true,force:true});
 await file.writeFile(JSON.stringify(record,null,2)+'\n');await file.close();
}
console.log(JSON.stringify(record));
