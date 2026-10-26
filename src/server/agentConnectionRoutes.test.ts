import {it,expect} from 'vitest';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import http from 'node:http';import {once} from 'node:events';import {WorkspaceStore} from '../core/store/workspaceStore.js';import {AgentForgeWebServer} from './webServer.js';
it('requires owner setup and separates encrypted save, read-only connect, disconnect and forget',async()=>{
 let rejectCredential=false;const calls:string[]=[];const upstream=http.createServer((req,res)=>{calls.push(req.method+' '+req.url);if(rejectCredential){res.writeHead(401);res.end('synthetic-upstream-secret');return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({object:'list',limit:1,offset:0,has_more:false,data:[]}));});upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'af-guided-agent-'));const store=new WorkspaceStore(path.join(dir,'workspace.json'));store.createUser({username:'setup-owner',displayName:'Owner',role:'owner',permissions:['settings:write','tasks:read','tasks:execute'],password:'synthetic test password'});store.createUser({username:'viewer',displayName:'Viewer',role:'viewer',permissions:['tasks:read'],password:'synthetic test password'});const server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(dir,'settings.json')});
 try{await server.start();const base=server.getBaseUrl();const login=async(username:string)=>(await(await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:'synthetic test password'})})).json()).token;const owner=await login('setup-owner'),viewer=await login('viewer');const endpoint=base+'/api/agent-connections';const post=(body:unknown,token=owner)=>fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});expect((await fetch(endpoint)).status).toBe(401);expect((await post({action:'connect'},viewer)).status).toBe(403);
 const passphrase='synthetic setup passphrase',profile={provider:'hermes',url:'http://127.0.0.1:'+(upstream.address() as {port:number}).port,token:'synthetic-agent-secret'};const saved=await post({action:'save',profile,passphrase});expect(saved.status).toBe(200);expect(await saved.json()).toMatchObject({saved:true,activationRequired:true,activeConnectionUnchanged:true});expect(calls).toEqual([]);expect(await fs.readFile(path.join(dir,'agent-connections.encrypted.json'),'utf8')).not.toContain(profile.token);
 const connected=await post({action:'connect',provider:'hermes',passphrase});expect(connected.status).toBe(200);expect(await connected.json()).toMatchObject({connected:true,workSubmitted:false});expect(calls).toEqual(['GET /api/sessions?source=api_server&limit=1&offset=0']);
 const listing=async()=> (await(await fetch(base+'/api/runtime-connections',{headers:{Authorization:'Bearer '+owner}})).json()).connections;
 const originalId=(await listing())[0].id;const task=store.createTask({title:'Saved external binding',status:'paused',priority:'medium'});store.updateTask(task.id,{externalTurnReceipts:[{requestId:'request',requestDigest:'digest',approvalId:'approval',connectionId:originalId,sessionKey:'session',runId:'run',status:'accepted',createdAt:new Date().toISOString()}]});
 rejectCredential=true;expect((await post({action:'save',profile:{...profile,token:'replacement-secret'},passphrase})).status).toBe(200);const failed=await post({action:'connect',provider:'hermes',passphrase});expect(failed.status).toBe(400);expect(await failed.text()).not.toContain('synthetic-upstream-secret');expect((await listing())[0].id).toBe(originalId);expect(store.getTask(task.id)?.externalTurnReceipts?.[0].connectionId).toBe(originalId);
 rejectCredential=false;expect((await post({action:'connect',provider:'hermes',passphrase})).status).toBe(200);expect((await listing())[0].id).not.toBe(originalId);expect(store.getTask(task.id)?.externalTurnReceipts?.[0].connectionId).toBe(originalId);
expect((await post({action:'disconnect',provider:'hermes'})).status).toBe(200);expect(calls).toHaveLength(3);expect((await post({action:'forget',provider:'hermes',passphrase})).status).toBe(200);expect((await post({action:'connect',provider:'hermes',passphrase})).status).toBe(400);expect(calls).toHaveLength(3);
 }finally{await server.stop();upstream.closeAllConnections();await new Promise<void>(r=>upstream.close(()=>r()));}
});


it('does not register a connection whose upstream check finishes during shutdown',async()=>{
 let release!:()=>void;let observed!:()=>void;
 const requested=new Promise<void>(resolve=>{observed=resolve;});
 const upstream=http.createServer((_req,res)=>{release=()=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({object:'list',limit:1,offset:0,has_more:false,data:[]}));};observed();});
 upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'af-setup-shutdown-'));const store=new WorkspaceStore(path.join(dir,'workspace.json'));
 store.createUser({username:'shutdown-owner',displayName:'Owner',role:'owner',permissions:['settings:write'],password:'synthetic test password'});
 const server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(dir,'settings.json')});
 try{
 await server.start();const base=server.getBaseUrl();const token=(await(await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'shutdown-owner',password:'synthetic test password'})})).json()).token;
 const post=(body:unknown)=>fetch(base+'/api/agent-connections',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const passphrase='synthetic setup passphrase';expect((await post({action:'save',passphrase,profile:{provider:'hermes',url:'http://127.0.0.1:'+(upstream.address() as {port:number}).port,token:'synthetic-token'}})).status).toBe(200);
 const pending=post({action:'connect',provider:'hermes',passphrase}).catch(()=>undefined);await requested;
 const stopping=server.stop();release();await pending;await stopping;
 for(let n=0;n<100&&(server as any).agentSetupBusy;n++)await new Promise(resolve=>setTimeout(resolve,10));
 expect((server as any).agentSetupBusy).toBe(false);
 expect((server as any).managedAgentConnections.size).toBe(0);
 expect((server as any).externalRunConnections.size).toBe(0);
 }finally{await server.stop();upstream.closeAllConnections();await new Promise<void>(resolve=>upstream.close(()=>resolve()));}
});
