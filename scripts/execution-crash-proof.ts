/** Actual process-kill/restart at an uncertain effect, using a disposable file backend. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { WorkspaceStore } from '../src/core/store/workspaceStore.js';
import { TaskWorkerRuntime, type TaskExecutionBackend } from '../src/core/runtime/taskWorkerRuntime.js';
import type { Task } from '../src/core/types/task.js';
const ready={ready:true,blockers:[],capabilities:{modelPlanning:true,isolatedCompute:true,realVerification:true,evidenceCollection:true}};
function backend(root:string,hang:boolean):TaskExecutionBackend{return {getReadiness:()=>ready,allowsGovernedProcesses:false,async execute(){fs.appendFileSync(path.join(root,'effects.txt'),'effect\n');if(hang){process.send?.('effect-written');await new Promise(()=>setInterval(()=>{},1000));}throw Error('Unexpected replay');}};}
if(process.argv[2]==='child'){
 const root=process.argv[3];const store=new WorkspaceStore(path.join(root,'state.json'));
 await new TaskWorkerRuntime(store,backend(root,true),{repoRoot:root,requireEffectReceipts:true,workspaceIdentity:'crash-proof'}).executeTask('crash-task');
}else{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-effect-crash-'));
 let child:ReturnType<typeof spawn>|undefined;
 try{
  const store=new WorkspaceStore(path.join(root,'state.json'));const now=new Date().toISOString();
  const task:Task={id:'crash-task',projectId:'synthetic',title:'Disposable crash effect',description:'Write one synthetic marker.',priority:'medium',status:'ready',createdAt:now,updatedAt:now,contract:{id:'crash-contract',taskId:'crash-task',version:1,workspace:{requireIsolatedWorktree:false},scope:{allowedPaths:['effects.txt'],protectedPaths:[],maxFilesChanged:1},authority:{externalMessage:false,productionWrite:false,deployment:false,forcePush:false,deleteFiles:false,networkOutbound:false},requiredChecks:[],completion:{requireEvidencePack:true,requireHumanApproval:true},createdAt:now}};
  store.createTask(task);
  const env:NodeJS.ProcessEnv={};for(const key of ['SystemRoot','WINDIR','PATH','Path','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
  child=spawn(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'child',root],{cwd:process.cwd(),env,windowsHide:true,stdio:['ignore','ignore','pipe','ipc']});
  const killed=once(child,'exit');
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Child effect deadline exceeded')),15000);child!.once('message',message=>{clearTimeout(timer);message==='effect-written'?resolve():reject(Error('Unexpected child message'));});child!.once('error',error=>{clearTimeout(timer);reject(error);});child!.once('exit',()=>{clearTimeout(timer);reject(Error('Child exited before effect'));});});
  const before=new WorkspaceStore(path.join(root,'state.json')).getTask(task.id)!;
  if(before.executionReceipts?.at(-1)?.status!=='started')throw Error('Missing durable receipt before effect');
  child.kill('SIGKILL');await killed;
  const restored=new WorkspaceStore(path.join(root,'state.json'));
  const worker=new TaskWorkerRuntime(restored,backend(root,false),{repoRoot:root,requireEffectReceipts:true,workspaceIdentity:'crash-proof'});
  let refused=false;try{await worker.executeTask(task.id);}catch(error){refused=String(error).includes('no replay permitted');}
  const effects=fs.readFileSync(path.join(root,'effects.txt'),'utf8').trim().split('\n').length;
  const report={status:refused&&effects===1?'passed':'failed',actualChildTerminated:true,receiptBeforeCrash:'started',retryRefused:refused,effectCount:effects,taskStatusAfterRestart:restored.getTask(task.id)?.status,limitation:'Disposable file backend; proves receipt replay protection across process death, not remote-provider or Docker orphan reconciliation.'};
  if(process.env.AGENTFORGE_PROOF_OUTPUT)fs.writeFileSync(process.env.AGENTFORGE_PROOF_OUTPUT,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
 }finally{if(child&&child.exitCode===null&&child.signalCode===null){const exit=once(child,'exit');child.kill('SIGKILL');await exit;}const resolved=path.resolve(root);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('agentforge-effect-crash-'))throw Error('Cleanup path mismatch');fs.rmSync(resolved,{recursive:true,force:true});}
}
