import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {runComparisonProcess} from './comparison-process.js';
const output=process.argv[2];if(!output||!path.isAbsolute(output))throw Error('Supply new absolute evidence output');
const destination=await fs.open(output,'wx',0o600);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-process-acceptance-'));
const repository=process.cwd();const source='scripts/conversation-execution-e2e.ts';
const sha256=createHash('sha256').update(await fs.readFile(path.join(repository,source))).digest('hex');
let summary:Record<string,unknown>={passed:false,scope:'Synthetic AgentForge process integration; no live scoring'};
try{
 const manifestFile=path.join(root,'protocol.json');
 await fs.writeFile(manifestFile,JSON.stringify({status:'frozen',liveScoringAllowed:true,syntheticAcceptanceOnly:true,tasks:['synthetic'],trialsPerTask:1,files:[{path:source,sha256}]}));
 const attemptRoot=path.join(root,'attempts');const directory=path.join(attemptRoot,'synthetic-1-agentforge');const childProof=path.join(directory,'child-proof.json');
 const env:NodeJS.ProcessEnv={AGENTFORGE_PROOF_OUTPUT:childProof};
 for(const key of ['SystemRoot','WINDIR','PATH','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA'])if(process.env[key])env[key]=process.env[key];
 const read=async()=>JSON.parse(await fs.readFile(childProof,'utf8'));
 const outcome=await runComparisonProcess({reservation:{manifestFile,sourceRoot:repository,attemptRoot,task:'synthetic',arm:'agentforge',trial:1},executable:process.execPath,args:['--import',import.meta.resolve('tsx'),path.join(repository,source)],env,timeoutMs:60000,maxOutputBytes:1048576,stage:async()=>{},score:async()=>{
  const evidence=await read();return {artifactPassed:evidence.artifactSha256==='008cd021750ace7907b152862d866177e05d8d0f976cfe038cac8e0d8bc146e9',workflowPassed:evidence.status==='passed'&&evidence.disconnected&&evidence.toolCalls.includes('execute_task')};
 },accounting:async()=>{
  const evidence=await read();assert.equal(evidence.live,false);assert.equal(evidence.requests,0);return {requests:0,usage:null};
 }});
 assert.equal(outcome.status,'passed');
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,'outcome.json'),'utf8')),outcome);
 summary={passed:true,scope:'Synthetic AgentForge chat, worker and Docker process integration; pre-approved command and scripted model. No live comparison score.',outcome,runnerSha256:sha256,realProvider:false};
}catch{process.exitCode=1;}
finally{try{await destination.writeFile(JSON.stringify(summary,null,2)+'\n');}finally{await destination.close();await fs.rm(root,{recursive:true,force:true});}console.log(JSON.stringify(summary));}
