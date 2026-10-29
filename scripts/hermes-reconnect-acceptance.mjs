import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {builtModule} from './built-package-under-test.mjs';
const {WorkspaceStore}=await builtModule('core/store/workspaceStore.js');
const {observeExternalTurn,readExternalTurnOutput}=await builtModule('core/runtime/externalTurnDispatch.js');
const {configureHermesRunConnection}=await builtModule('providers/channels/hermesRunConnection.js');

// Read-only reconnection to an explicitly selected disposable proof container.
const [name,runId,evidencePath]=process.argv.slice(2);
assert.match(name??'',/^af-hermes-live-[a-f0-9]{8}$/);
assert.match(runId??'',/^run_[a-f0-9]+$/);
assert.ok(evidencePath);
const docker=(args)=>{
 const result=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:60000});
 if(result.status!==0)throw Error('Disposable container operation failed');
 return result.stdout.trim();
};
const state=JSON.parse(docker(['inspect',name]))[0];
assert.equal(state.HostConfig.Binds?.length??0,0);
assert.equal(state.HostConfig.Mounts?.length??0,0);
assert.ok(state.Mounts.every(mount=>mount.Type==='volume'&&mount.Destination==='/opt/data'&&/^[a-f0-9]{64}$/.test(mount.Name)),'Only the image-created anonymous volume is allowed');
assert.equal(state.Config.User,'hermes');
assert.equal(state.State.Running,false,'Do not interfere with an active proof');
const token=state.Config.Env.find(value=>value.startsWith('API_SERVER_KEY='))?.slice(15);
assert.ok(token);
const rotate=process.env.AGENTFORGE_HERMES_ROTATION_PROOF==='1';
let backup,rotationDirectory,receiptDirectory,receiptStore,receiptTask,originalReceipt,serverCredentialRotated=false,governedRotationRefused=false;
try{
 docker(['start',name]);
 const url='http://'+docker(['port',name,'8642/tcp']);
 const env={AGENTFORGE_HERMES_URL:url,AGENTFORGE_HERMES_API_KEY:token};
 const connection=configureHermesRunConnection(env);
 let observation;let lastError;
 for(let i=0;i<60;i++){
  try{observation=await connection.inspectRun(runId);break;}catch(error){lastError=error.message;if(lastError.includes('(404)')||lastError.includes('(401)'))break;await new Promise(resolve=>setTimeout(resolve,1000));}
 }
 if(!observation)await fs.writeFile(evidencePath,JSON.stringify({requirement:'P05',runId,outcome:'failed',error:lastError,submissionCalls:0,recordedAt:new Date().toISOString()},null,2)+'\n');
 assert.equal(observation?.status,'completed');
 if(process.env.AGENTFORGE_HERMES_RECEIPT_FILE){
  const source=await fs.realpath(process.env.AGENTFORGE_HERMES_RECEIPT_FILE);
  assert.equal(path.basename(source),'browser-state.json');assert.ok(path.basename(path.dirname(source)).startsWith('af-hermes-live-'));assert.equal(path.dirname(path.dirname(source)),await fs.realpath(os.tmpdir()));
  receiptDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'af-hermes-receipt-'));const copy=path.join(receiptDirectory,'state.json');await fs.copyFile(source,copy);receiptStore=new WorkspaceStore(copy);
  receiptTask=receiptStore.listTasks().find(task=>task.externalTurnReceipts?.[0]?.sessionKey===runId&&task.externalTurnReceipts?.[0]?.connectionId===connection.id);
  assert.ok(receiptTask,'Existing real browser receipt must match this server identity');originalReceipt=receiptTask.externalTurnReceipts[0];
  assert.equal((await observeExternalTurn(receiptStore,receiptTask.id,connection)).observation.remoteStatus,'completed');
 }
 const output=await connection.readRunOutput(runId);
 assert.match(output.content,/\b1250\b/);
 const reconnected=configureHermesRunConnection(env);
 assert.equal(reconnected.id,connection.id);
 assert.deepEqual(await reconnected.readRunOutput(runId),output);
 const wrongCredential=configureHermesRunConnection({...env,AGENTFORGE_HERMES_API_KEY:'disposable-rotated-token'});
 assert.notEqual(wrongCredential.id,connection.id);
 await assert.rejects(()=>wrongCredential.inspectRun(runId),/401/);
 assert.deepEqual(await connection.readRunOutput(runId),output);
 if(rotate){
  rotationDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'af-hermes-rotation-'));
  backup=path.join(rotationDirectory,'original-start.py');
  docker(['stop','--time','5',name]);docker(['cp',name+':/tmp/start.py',backup]);
  const replacement=path.join(rotationDirectory,'rotated-start.py'),rotatedToken=randomUUID();
  await fs.writeFile(replacement,'import os\nos.environ["API_SERVER_KEY"] = '+JSON.stringify(rotatedToken)+'\n'+await fs.readFile(backup,'utf8'));
  docker(['cp',replacement,name+':/tmp/start.py']);docker(['start',name]);
  const rotated=configureHermesRunConnection({...env,AGENTFORGE_HERMES_API_KEY:rotatedToken});
  let ready=false;
  for(let i=0;i<60;i++){try{const response=await fetch(url+'/v1/capabilities',{headers:{Authorization:'Bearer '+rotatedToken},signal:AbortSignal.timeout(3000)});if(response.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
  assert.equal(ready,true,'New key must authenticate to the actual server');
  // Pinned Hermes scopes durable runs by profile AND API key; rotation must not
  // silently transfer ownership of an old run to a new credential identity.
  await assert.rejects(()=>rotated.readRunOutput(runId),/404/);
  await assert.rejects(()=>connection.inspectRun(runId),/401/);
  assert.notEqual(rotated.id,connection.id);serverCredentialRotated=true;
  if(receiptStore){let calls=0;await assert.rejects(()=>observeExternalTurn(receiptStore,receiptTask.id,{id:rotated.id,inspectRun:async id=>{calls++;return rotated.inspectRun(id);}}),/Saved external connection/);await assert.rejects(()=>readExternalTurnOutput(receiptStore,receiptTask.id,rotated),/Matching saved run/);assert.equal(calls,0);assert.equal(receiptStore.getTask(receiptTask.id).externalTurnReceipts[0].runId,originalReceipt.runId);governedRotationRefused=true;}

  docker(['stop','--time','5',name]);docker(['cp',backup,name+':/tmp/start.py']);docker(['start',name]);
  let restored;for(let i=0;i<60;i++){try{restored=await connection.readRunOutput(runId);break;}catch{await new Promise(r=>setTimeout(r,1000));}}
  assert.deepEqual(restored,output,'Restoring the original key must retain the exact output');
  await assert.rejects(()=>rotated.inspectRun(runId),/401/);
 }
 if(receiptStore){assert.equal((await observeExternalTurn(receiptStore,receiptTask.id,connection)).observation.remoteStatus,'completed');const saved=await readExternalTurnOutput(receiptStore,receiptTask.id,connection);assert.equal(saved.runId,originalReceipt.runId);assert.equal(saved.content,originalReceipt.output.content);}
 const sessions=await connection.listSessions(25,0);
 assert.ok(sessions.sessions.some(session=>session.key===runId));
 await fs.writeFile(evidencePath,JSON.stringify({requirement:'P05',runId,status:observation.status,output:output.content,checks:{governedRotationRefused,serverCredentialRotated,rotatedKeyCannotReadOldScope:serverCredentialRotated,originalKeyRestoredExactOutput:serverCredentialRotated,containerRestart:true,registeredConnectorOutput:true,newConnectorSameOutput:true,apiSessionListed:true,rotatedCredentialChangesBinding:true,serverRejectsWrongCredential:true,originalCredentialStillReadsSameOutput:true},submissionCalls:0,limits:['No new submission, approval or cancellation is exercised; optional receipt proof reuses a previously approved synthetic browser run.',...(rotate?['Server rotation changes the run namespace: new key authenticates but cannot read old runs; restoring the original key recovers the exact output. Governed receipt refusal has separate regression evidence.']:['Binding change is not proof of server-side credential rotation or receipt refusal.'])],recordedAt:new Date().toISOString()},null,2)+'\n');
 console.log('Hermes connector reconnect proof passed; no submission made.');
}finally{docker(['stop','--time','5',name]);if(backup)docker(['cp',backup,name+':/tmp/start.py']);if(rotationDirectory)await fs.rm(rotationDirectory,{recursive:true,force:true});if(receiptDirectory)await fs.rm(receiptDirectory,{recursive:true,force:true});}
