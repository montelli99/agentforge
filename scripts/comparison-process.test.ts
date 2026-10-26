import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {runComparisonProcess} from './comparison-process.js';
for(const timeout of [false,true])test('records actual process completion or timeout without replay: '+timeout,{timeout:15000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-comparison-process-'));
 try{
  await fs.writeFile(path.join(root,'fixture.json'),'{}');
  const manifestFile=path.join(root,'protocol.json');
  await fs.writeFile(manifestFile,JSON.stringify({status:'frozen',liveScoringAllowed:true,tasks:['synthetic'],trialsPerTask:1,files:[{path:'fixture.json',sha256:createHash('sha256').update('{}').digest('hex')}]}));
  const env:NodeJS.ProcessEnv={};for(const key of ['SystemRoot','WINDIR','PATH','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
  const options={reservation:{manifestFile,sourceRoot:root,attemptRoot:path.join(root,'attempts'),task:'synthetic',arm:'agentforge' as const,trial:1},executable:process.execPath,args:['-e',"require('node:fs').writeFileSync('effect.txt','one');"+(timeout?'setInterval(()=>{},1000)':'')],env,timeoutMs:timeout?2000:10000,maxOutputBytes:1024,stage:async()=>{},score:async(directory:string)=>({artifactPassed:await fs.readFile(path.join(directory,'effect.txt'),'utf8')==='one',workflowPassed:true}),accounting:async()=>({requests:0,usage:null})};
  const result=await runComparisonProcess(options);
  assert.equal(result.status,timeout?'timed_out':'passed');assert.equal(result.artifactPassed,true);assert.equal(result.workflowPassed,!timeout);
  await assert.rejects(runComparisonProcess(options),/EEXIST/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
