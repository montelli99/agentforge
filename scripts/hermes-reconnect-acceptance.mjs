import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {builtModule} from './built-package-under-test.mjs';
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
 const output=await connection.readRunOutput(runId);
 assert.match(output.content,/\b1250\b/);
 const reconnected=configureHermesRunConnection(env);
 assert.equal(reconnected.id,connection.id);
 assert.deepEqual(await reconnected.readRunOutput(runId),output);
 const wrongCredential=configureHermesRunConnection({...env,AGENTFORGE_HERMES_API_KEY:'disposable-rotated-token'});
 assert.notEqual(wrongCredential.id,connection.id);
 await assert.rejects(()=>wrongCredential.inspectRun(runId),/401/);
 assert.deepEqual(await connection.readRunOutput(runId),output);
 const sessions=await connection.listSessions(25,0);
 assert.ok(sessions.sessions.some(session=>session.key===runId));
 await fs.writeFile(evidencePath,JSON.stringify({requirement:'P05',runId,status:observation.status,output:output.content,checks:{containerRestart:true,registeredConnectorOutput:true,newConnectorSameOutput:true,apiSessionListed:true,rotatedCredentialChangesBinding:true,serverRejectsWrongCredential:true,originalCredentialStillReadsSameOutput:true},submissionCalls:0,limits:['No governed AgentForge approval or cancellation is exercised.','Binding change is not proof of server-side credential rotation or receipt refusal.'],recordedAt:new Date().toISOString()},null,2)+'\n');
 console.log('Hermes connector reconnect proof passed; no submission made.');
}finally{docker(['stop','--time','5',name]);}
