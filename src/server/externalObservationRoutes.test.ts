import {it,expect,vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WorkspaceStore} from '../core/store/workspaceStore.js';
import {AgentForgeWebServer} from './webServer.js';

it('requires authenticated execution permission and observes only the saved runtime/run',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'af-external-route-'));
 const store=new WorkspaceStore(path.join(directory,'workspace.json'));
 for(const [username,permissions] of [['reader',['tasks:read']],['operator',['tasks:read','tasks:execute']]] as const)
  store.createUser({username,displayName:username,role:'viewer',permissions:[...permissions],password:'synthetic test password'});
 const task=store.createTask({title:'Synthetic external task',status:'paused',priority:'medium'});
 store.updateTask(task.id,{externalTurnReceipts:[{requestId:'saved-request',requestDigest:'synthetic-digest',approvalId:'synthetic-approval',connectionId:'saved-connection',sessionKey:'synthetic-session',status:'accepted',runId:'saved-run',createdAt:new Date().toISOString()}]});
 const server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(directory,'settings.json')});
 const inspect=vi.fn(async()=>({runId:'saved-run',status:'timeout'}));
 server.registerExternalRunConnection({id:'saved-connection',inspectRun:inspect});
 try{
  await server.start(); const base=server.getBaseUrl();
  const login=async(username:string)=>{const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:'synthetic test password'})});expect(r.status).toBe(200);return (await r.json()).token as string;};
  const reader=await login('reader'), operator=await login('operator');
  const request=(token?:string,method='POST')=>fetch(base+'/api/tasks/'+task.id+'/external-observation',{method,headers:token?{Authorization:'Bearer '+token}:{}});
  expect((await request()).status).toBe(401);
  expect((await request(reader)).status).toBe(403);
  expect((await request(operator,'GET')).status).toBe(405);
  expect(inspect).not.toHaveBeenCalled();
  const response=await request(operator);
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toMatchObject({runId:'saved-run',observation:{remoteStatus:'timeout'},replayed:false,verified:false});
  expect(inspect).toHaveBeenCalledExactlyOnceWith('saved-run');
  expect(new WorkspaceStore(path.join(directory,'workspace.json')).getTask(task.id)?.status).toBe('paused');
  inspect.mockRejectedValueOnce(Error('private-token-do-not-return'));
  const failed=await request(operator);expect(failed.status).toBe(409);expect(await failed.text()).not.toContain('private-token');
 }finally{await server.stop();await fs.rm(directory,{recursive:true,force:true});}
});
