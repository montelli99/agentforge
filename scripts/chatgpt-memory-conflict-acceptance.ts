import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {OperationalMemoryProvider} from '../src/providers/memory/operationalMemory.js';
import {TaskWorkerRuntime} from '../src/core/runtime/taskWorkerRuntime.js';
import {runBoundedChild} from '../src/providers/models/boundedCliProcess.js';
import {ChatGPTSetup} from '../src/server/chatgptSetup.js';
import type {ModelResponseUsage} from '../src/core/providers/model.js';
if(process.argv[2]==='--recover'){
 const [file,taskId]=process.argv.slice(3);const store=new WorkspaceStore(file);
 const runtime=new TaskWorkerRuntime(store,undefined,{repoRoot:path.dirname(file),autoStart:false,memoryProvider:new OperationalMemoryProvider(store),memoryNamespace:'acceptance'});
 try{console.log(JSON.stringify(await runtime.getPlanningContext(taskId)));}finally{runtime.stop();}
}else{
 const [profile,actor,model,output,...extra]=process.argv.slice(2);
 if(!profile||!actor||!model||!output||extra.length||!path.isAbsolute(profile)||!path.isAbsolute(output))throw Error('Explicit dedicated profile, actor, model and new absolute output required');
 const destination=await fs.open(output,'wx',0o600),root=await fs.mkdtemp(path.join(os.tmpdir(),'af-live-conflict-'));
 const setup=new ChatGPTSetup(await fs.realpath(profile));
 const evidence:{recordedAt:string;passed:boolean;stage:string;model:string;requests:number;usage:ModelResponseUsage|null;contextSha256?:string;result?:unknown;limits:string[]}={recordedAt:new Date().toISOString(),passed:false,stage:'prepare',model,requests:0,usage:null,limits:['Synthetic built-in memory recovered through TaskWorkerRuntime in a fresh process.','One live model decision, not a browser journey or proof of all conflicting-memory cases.','No execution tools exposed and no task effects performed.']};
 try{
  const file=path.join(root,'state.json');const store=new WorkspaceStore(file);const memory=new OperationalMemoryProvider(store);
  const first=await memory.record({namespace:'acceptance',projectId:'alpha',category:'project_constraint',title:'Launch color',content:'Approved launch color is blue.',tags:['launch']});
  const second=await memory.record({namespace:'acceptance',projectId:'alpha',category:'project_constraint',title:'Launch color',content:'Approved launch color is red.',tags:['launch']});
  await memory.record({namespace:'acceptance',projectId:'other-project',category:'project_constraint',title:'Launch color',content:'Other project color is green.',tags:['launch']});
  const task=store.createTask({title:'Determine approved launch color',description:'Identify the authorized color from project memory.',projectId:'alpha',priority:'medium',status:'ready'});
  const env:NodeJS.ProcessEnv={};for(const key of ['SystemRoot','WINDIR','PATH','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
  evidence.stage='recover-context';
  const recovered=await runBoundedChild(process.execPath,['--import',import.meta.resolve('tsx'),fileURLToPath(import.meta.url),'--recover',file,task.id],{cwd:process.cwd(),env,timeoutMs:30000,maxOutputBytes:65536});
  assert.equal(recovered.code,0);const context=JSON.parse(recovered.stdout);assert.ok(context.content.includes('blue'));assert.ok(context.content.includes('red'));assert.ok(!context.content.includes('green'));
  evidence.contextSha256=createHash('sha256').update(context.content).digest('hex');
  evidence.stage='restore-subscription';const status=await setup.status(actor);assert.equal(status.accounts.length,1);
  const restored=await setup.restore(actor,status.accounts[0].id);const connection=await setup.activate(actor,restored.id,model);
  evidence.stage='live-decision';evidence.requests++;
  const result=await connection.provider.generate({model,signal:AbortSignal.timeout(90000),messages:[{role:'system',content:'Use the supplied project memory as evidence. Do not guess when facts conflict. Return only JSON with keys status (resolved or needs_clarification), selectedColor (string or null), candidateColors (array of strings), sourceIds (array of cited memory record IDs). No other fields.'},{role:'user',content:'Which launch color is authorized?\n\nRecovered task context:\n'+context.content}]});
  evidence.usage=result.usage??null;evidence.stage='independent-check';assert.equal(result.toolCalls?.length??0,0);
  const actual=JSON.parse(result.content);evidence.result=actual;
  assert.equal(actual.status,'needs_clarification');assert.equal(actual.selectedColor,null);assert.deepEqual([...actual.candidateColors].sort(),['blue','red']);assert.deepEqual([...actual.sourceIds].sort(),[first.id,second.id].sort());
  evidence.passed=true;evidence.stage='complete';
 }catch{process.exitCode=1;}
 finally{try{await setup.shutdown();}finally{await destination.writeFile(JSON.stringify(evidence,null,2)+'\n');await destination.close();await fs.rm(root,{recursive:true,force:true});}console.log(JSON.stringify(evidence));}
}
