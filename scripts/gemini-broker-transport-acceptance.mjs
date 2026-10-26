/** Installed Gemini MCP transport -> AgentForge broker, no model or account. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {NativeToolAuthorization} from '../src/core/runtime/nativeToolAuthorization.ts';
import {NativeToolBroker} from '../src/core/runtime/nativeToolBroker.ts';
import {NativeBrokerSession} from '../src/core/runtime/nativeBrokerSession.ts';
import {startNativeBrokerEndpoint} from '../src/providers/mcp/nativeBrokerEndpoint.ts';
const moduleFile=process.argv[2];if(!moduleFile||!path.isAbsolute(moduleFile))throw Error('Absolute official module required');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-gemini-transport-'));
const saved={...process.env};for(const key of Object.keys(process.env))delete process.env[key];
for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(saved[key])process.env[key]=saved[key];
Object.assign(process.env,{HOME:root,USERPROFILE:root,TEMP:root,TMP:root,GEMINI_CLI_HOME:root});
let connection,client;
try{
 const work=path.join(root,'work');await fs.mkdir(work);
 const gate=new NativeToolAuthorization(path.join(root,'host'),work);
 const identity={taskId:'synthetic',operationId:'operation',sessionId:'session'};
 const args={callId:'call',tool:'write',input:{text:'synthetic'}};const approvalId=randomUUID();
 const artifact=path.join(work,'result.txt');
 connection=await startNativeBrokerEndpoint(new NativeBrokerSession(identity,new NativeToolBroker(gate,async()=>{
  await fs.appendFile(artifact,'one\n');return {evidence:await fs.readFile(artifact,'utf8')};
 })));
 const {Client,createTransport}=await import(pathToFileURL(moduleFile).href);
 client=new Client({name:'agentforge-acceptance',version:'0.1.2'},{capabilities:{}});
 const transport=await createTransport('agentforge-broker',{url:connection.endpoint,type:'http',headers:{Authorization:'Bearer '+connection.token}},false,{sanitizationConfig:{enableEnvironmentVariableRedaction:false}});
 await client.connect(transport,{timeout:10000});
 assert.deepEqual((await client.listTools()).tools.map(tool=>tool.name),['dispatch']);
 const call={name:'dispatch',arguments:{approvalId,...args}};
 assert.equal((await client.callTool(call)).isError,true);
 await assert.rejects(fs.stat(artifact));
 await gate.approve(approvalId,{...identity,...args},'synthetic-owner',Date.now()+60000);
 assert.equal((await client.callTool(call)).isError,undefined);
 assert.equal((await client.callTool(call)).isError,true);
 assert.equal(await fs.readFile(artifact,'utf8'),'one\n');
 console.log(JSON.stringify({scope:'Pinned Gemini MCP transport with synthetic host executor; not model inference or full CLI worker',moduleSha256:createHash('sha256').update(await fs.readFile(moduleFile)).digest('hex'),discovery:true,missingApprovalDenied:true,approvedEffectCount:1,duplicateDenied:true,modelRequests:0,accountUsed:false}));
}finally{await client?.close();await connection?.close();await fs.rm(root,{recursive:true,force:true});}
