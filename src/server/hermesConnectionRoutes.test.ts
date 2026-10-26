import {it,expect} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {WorkspaceStore} from '../core/store/workspaceStore.js';
import {AgentForgeWebServer} from './webServer.js';
import {configureHermesRunConnection} from '../providers/channels/hermesRunConnection.js';

it('discovers Hermes sessions through authenticated AgentForge without importing content or sending work',async()=>{
 const requests:Array<{method:string;url:string;authorization:string|undefined}>=[];
 const upstream=http.createServer((req,res)=>{
  requests.push({method:req.method!,url:req.url!,authorization:req.headers.authorization});
  res.setHeader('Content-Type','application/json');
  if(req.url==='/v1/runs/run-synthetic'){res.end(JSON.stringify({run_id:'run-synthetic',status:'completed',output:'Synthetic remote output'}));return;}
  res.end(JSON.stringify({object:'list',limit:25,offset:0,has_more:false,data:[{id:'api-synthetic',source:'api_server',title:'Synthetic session',preview:'private synthetic preview'}]}));
 });
 upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'af-hermes-route-'));
 const store=new WorkspaceStore(path.join(directory,'workspace.json'));
 store.createUser({username:'operator',displayName:'Operator',role:'viewer',permissions:['tasks:read','tasks:execute'],password:'synthetic test password'});
 const connection=configureHermesRunConnection({AGENTFORGE_HERMES_URL:'http://127.0.0.1:'+(upstream.address() as {port:number}).port,AGENTFORGE_HERMES_API_KEY:'synthetic-secret-test'})!;
 const server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(directory,'settings.json')});
 server.registerExternalRunConnection(connection);
 try{
  await server.start();const base=server.getBaseUrl();
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'operator',password:'synthetic test password'})});
  expect(login.status).toBe(200);const token=(await login.json()).token;
  expect((await fetch(base+'/api/runtime-connections')).status).toBe(401);
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const listing=await (await fetch(base+'/api/runtime-connections',{headers})).json();
  expect(listing.connections).toEqual([{id:connection.id,displayName:'Hermes API sessions (experimental)',canSubmit:true,readiness:'not_checked'}]);
  expect(requests).toHaveLength(0);
  const response=await fetch(base+'/api/runtime-sessions',{method:'POST',headers,body:JSON.stringify({connectionId:connection.id,offset:0})});
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
  const body=await response.text();expect(JSON.parse(body)).toMatchObject({sessions:[{key:'api-synthetic',name:'Synthetic session'}]});
  expect(body).not.toContain('private synthetic preview');expect(body).not.toContain('synthetic-secret-test');
  expect(requests).toEqual([{method:'GET',url:'/api/sessions?source=api_server&limit=25&offset=0',authorization:'Bearer synthetic-secret-test'}]);
  const task=store.createTask({title:'Synthetic remote task',priority:'medium',status:'paused'});
  store.updateTask(task.id,{externalTurnReceipts:[{requestId:'synthetic-request',requestDigest:'synthetic-digest',approvalId:'synthetic-approval',connectionId:connection.id,sessionKey:'api-synthetic',status:'accepted',runId:'run-synthetic',createdAt:new Date().toISOString()}]});
  const outputUrl=base+'/api/tasks/'+task.id+'/external-output';
  expect((await fetch(outputUrl,{method:'POST'})).status).toBe(401);
  const output=await fetch(outputUrl,{method:'POST',headers,body:JSON.stringify({runId:'unrelated-run'})});
  expect(output.status).toBe(200);expect(await output.json()).toEqual({runId:'run-synthetic',content:'Synthetic remote output',referenceDataOnly:true,verified:false});
  expect(store.getTask(task.id)?.status).toBe('paused');expect(store.getTask(task.id)?.evidencePack).toBeUndefined();
  expect(requests.at(-1)?.url).toBe('/v1/runs/run-synthetic');
  const saved=await fs.readFile(path.join(directory,'workspace.json'),'utf8');
  expect(saved).not.toContain('Synthetic remote output');expect(saved).not.toContain('synthetic-secret-test');expect(saved).not.toContain('private synthetic preview');
 }finally{
  await server.stop();upstream.closeAllConnections();await new Promise<void>(resolve=>upstream.close(()=>resolve()));
  await fs.rm(directory,{recursive:true,force:true});
 }
});

