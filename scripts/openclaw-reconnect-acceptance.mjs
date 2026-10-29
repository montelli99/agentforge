/** Reopen an explicitly named disposable runtime; never submit or replay a turn. */
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import assert from 'node:assert/strict';
const [name,runId]=process.argv.slice(2);
assert.match(name??'',/^af-openclaw-live-[a-f0-9]{8}$/);assert.match(runId??'',/^proof-\d+$/);
const exec=promisify(execFile);const docker=async args=>(await exec('docker',args,{timeout:60000,windowsHide:true,maxBuffer:1048576})).stdout.trim();
const [inspection]=JSON.parse(await docker(['inspect',name]));assert.equal(inspection.State.Running,false);assert.equal(inspection.Mounts.length,0);assert.equal(inspection.Config.User,'node');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-openclaw-reconnect-'));
const probe=`import fs from 'node:fs/promises';import {OpenClawGatewayTransport} from './transport.mjs';const config=JSON.parse(await fs.readFile('/tmp/config.json','utf8'));const c=new OpenClawGatewayTransport({url:'ws://127.0.0.1:18789',token:config.gateway.auth.token,identityPath:'/tmp/proof-identity.json',enableTaskDelegation:true});try{await c.connectWhenReady(30000);const result=await c.inspectRun(${JSON.stringify(runId)});const history=await c.readSessionHistory('agent:main:agentforge-live-synthetic');console.log(JSON.stringify({result,messages:history.messages}));}finally{c.stop();}`;
await fs.writeFile(path.join(root,'probe.mjs'),probe);await docker(['cp',path.join(root,'probe.mjs'),name+':/tmp/reconnect.mjs']);
try{
 await docker(['start',name]);const result=JSON.parse(await docker(['exec',name,'node','/tmp/reconnect.mjs']));
 const replies=result.messages.filter(m=>m.role==='assistant'&&m.__openclaw?.runId===runId);
 assert.equal(replies.length,1);assert.match(JSON.stringify(replies[0].content),/\b1250\b/);
 const proof={runId,observedStatus:result.result.status,matchingReplies:replies.length,correctSavedAnswer:true,restartedContainer:true,submittedTurns:0,scope:'Saved result retrieval after runtime restart; no new model request or replay initiated'};
 await fs.writeFile(path.join(root,'proof.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({...proof,evidenceDirectory:root}));
}finally{await docker(['stop','--time','5',name]);}
