import {it,expect} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {NativeToolAuthorization} from '../../core/runtime/nativeToolAuthorization.js';
import {NativeToolBroker} from '../../core/runtime/nativeToolBroker.js';
import {NativeBrokerSession} from '../../core/runtime/nativeBrokerSession.js';
import {startNativeBrokerEndpoint} from './nativeBrokerEndpoint.js';
import {McpJsonRpcClient} from './mcpJsonRpcClient.js';
import {WorkspaceStore} from '../../core/store/workspaceStore.js';
import {prepareNativeToolReview,authorizeReviewedNativeTool} from '../../core/runtime/nativeToolReview.js';

it('enforces credentials and session approvals over real HTTP before one physical effect',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-mcp-proof-'));const work=path.join(root,'work');await fs.mkdir(work);
 const gate=new NativeToolAuthorization(path.join(root,'host'),work);const identity={taskId:'task',operationId:'operation',sessionId:'session'};
 const args={callId:'call',tool:'write',input:{content:'synthetic'}};const approvalId=randomUUID();const file=path.join(work,'effects.txt');
 const broker=new NativeToolBroker(gate,async()=>{await fs.appendFile(file,'one\n');return {evidence:'one'};});
 const connection=await startNativeBrokerEndpoint(new NativeBrokerSession(identity,broker));
 try{
  expect((await fetch(connection.endpoint,{method:'POST',body:'{}'})).status).toBe(401);
  expect((await fetch(connection.endpoint,{method:'POST',headers:{Authorization:'Bearer '+connection.token,Origin:'https://untrusted.example'},body:'{}'})).status).toBe(403);
  const negotiate=await fetch(connection.endpoint,{method:'POST',headers:{Authorization:'Bearer '+connection.token,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}})});
  expect((await negotiate.json()).result.protocolVersion).toBe('2025-06-18');
  const client=new McpJsonRpcClient({endpoint:connection.endpoint,headers:{Authorization:'Bearer '+connection.token}});
  await client.initialize();expect((await client.listTools()).map(tool=>tool.name)).toEqual(['dispatch']);
  expect((await client.callTool('dispatch',{approvalId,...args})).isError).toBe(true);
  await expect(fs.stat(file)).rejects.toThrow();
  await gate.approve(approvalId,{...identity,...args},'owner',Date.now()+60000);
  expect((await client.callTool('dispatch',{approvalId,...args,sessionId:'spoof'})).isError).toBe(true);
  const result=await client.callTool('dispatch',{approvalId,...args});expect(result.isError).toBeUndefined();
  expect((await client.callTool('dispatch',{approvalId,...args})).isError).toBe(true);
  expect(await fs.readFile(file,'utf8')).toBe('one\n');
  expect((await gate.inspect(approvalId,{...identity,...args})).state).toBe('observed');
 }finally{await connection.close();await fs.rm(root,{recursive:true,force:true});}
});
it('exposes review then approved execution through the persisted owner queue',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-mcp-review-'));const work=path.join(root,'work');await fs.mkdir(work);
 const store=new WorkspaceStore(path.join(root,'workspace.json'));const task=store.createTask({title:'Synthetic',status:'ready',priority:'medium'});
 const gate=new NativeToolAuthorization(path.join(root,'host'),work);let effects=0;
 const session=new NativeBrokerSession({taskId:task.id,operationId:'operation',sessionId:'session'},new NativeToolBroker(gate,async()=>{effects++;return {evidence:'synthetic'};}),{
  prepare:request=>prepareNativeToolReview(store,request),authorize:(id,request)=>authorizeReviewedNativeTool(store,gate,id,request),
 });
 const endpoint=await startNativeBrokerEndpoint(session);try{
  const client=new McpJsonRpcClient({endpoint:endpoint.endpoint,headers:{Authorization:'Bearer '+endpoint.token}});await client.initialize();
  expect((await client.listTools()).map(tool=>tool.name)).toEqual(['request_review','execute_reviewed']);
  const args={callId:'call',tool:'write',input:{content:'synthetic'}};
  await client.callTool('request_review',args);const review=store.listApprovals()[0];expect(review.status).toBe('pending');expect(effects).toBe(0);
  expect((await client.callTool('execute_reviewed',{reviewId:review.id,...args})).isError).toBe(true);
  store.resolveApproval({approvalId:review.id,status:'approved',approverUserId:'owner',decisionOrigin:'web'});
  expect((await client.callTool('execute_reviewed',{reviewId:review.id,...args,input:{content:'changed'}})).isError).toBe(true);
  expect((await client.callTool('execute_reviewed',{reviewId:review.id,...args})).isError).toBeUndefined();
  expect((await client.callTool('execute_reviewed',{reviewId:review.id,...args})).isError).toBe(true);expect(effects).toBe(1);
 }finally{await endpoint.close();await fs.rm(root,{recursive:true,force:true});}
});
