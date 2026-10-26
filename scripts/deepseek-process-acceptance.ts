import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {runComparisonProcess} from './comparison-process.js';
const output=process.argv[2];if(!output||!path.isAbsolute(output))throw Error('Supply new absolute evidence output');
const destination=await fs.open(output,'wx',0o600);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-dsh-process-'));
const repository=process.cwd();
const source='scripts/deepseek-measured-runner.mjs';
const sha256=createHash('sha256').update(await fs.readFile(path.join(repository,source))).digest('hex');
let summary:Record<string,unknown>={passed:false,scope:'Synthetic installed DeepSeek process integration; no live scoring'};
try{
 const manifestFile=path.join(root,'protocol.json');
 await fs.writeFile(manifestFile,JSON.stringify({status:'frozen',liveScoringAllowed:true,syntheticAcceptanceOnly:true,tasks:['synthetic'],trialsPerTask:1,files:[{path:source,sha256}]}));
 const attemptRoot=path.join(root,'attempts');const directory=path.join(attemptRoot,'synthetic-1-deepseek');const childProof=path.join(directory,'child-proof.json');
 const env:NodeJS.ProcessEnv={};for(const key of ['SystemRoot','WINDIR','PATH','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA'])if(process.env[key])env[key]=process.env[key];
 const script=path.join(repository,source);
 const code=`process.chdir(${JSON.stringify(repository)});process.argv=[process.execPath,${JSON.stringify(script)},'--evidence-output',${JSON.stringify(childProof)}];await import(${JSON.stringify(pathToFileURL(script).href)});`;
 const read=async()=>JSON.parse(await fs.readFile(childProof,'utf8'));
 const outcome=await runComparisonProcess({reservation:{manifestFile,sourceRoot:repository,attemptRoot,task:'synthetic',arm:'deepseek',trial:1},executable:process.execPath,args:['--input-type=module','-e',code],env,timeoutMs:60000,maxOutputBytes:1048576,stage:async()=>{},score:async()=>{
  const evidence=await read();return {artifactPassed:evidence.result.artifact==='measured-proof',workflowPassed:evidence.result.status===0&&evidence.result.calls===2&&evidence.result.excessStatus===429};
 },accounting:async()=>{
  const evidence=await read();assert.equal(evidence.result.audits.length,2);
  const usage={inputTokens:0,outputTokens:0};for(const audit of evidence.result.audits){assert.equal(audit.status,'response');assert(audit.usage);usage.inputTokens+=audit.usage.inputTokens;usage.outputTokens+=audit.usage.outputTokens;}
  return {requests:evidence.result.calls,usage};
 }});
 assert.equal(outcome.status,'passed');
 const saved=JSON.parse(await fs.readFile(path.join(directory,'outcome.json'),'utf8'));assert.deepEqual(saved,outcome);
 const evidence=await read();
 summary={passed:true,scope:'Synthetic installed DeepSeek process integration; no live scoring or benchmark claim',outcome,image:evidence.image,proxySha256:evidence.proxySha256,runnerSha256:sha256,network:evidence.network,realProvider:evidence.realProvider};
}catch{process.exitCode=1;}
finally{try{await destination.writeFile(JSON.stringify(summary,null,2)+'\n');}finally{await destination.close();await fs.rm(root,{recursive:true,force:true});}console.log(JSON.stringify(summary));}
