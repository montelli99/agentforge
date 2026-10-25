import {expect, it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WorkspaceStore} from '../core/store/workspaceStore.js';
import {AgentForgeWebServer} from './webServer.js';

it('reviews without writing, requires authorized exact confirmation, and persists history without overwriting', async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'af-memory-route-'));
  const file=path.join(directory,'workspace.json');
  const store=new WorkspaceStore(file);
  for(const [username,permissions] of [['writer',['memory:read','memory:write']],['reader',['memory:read']]] as const)
    store.createUser({username,displayName:username,role:'viewer',permissions:[...permissions],password:'synthetic acceptance password'});
  const server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(directory,'settings.json')});
  const record={id:'synthetic-memory',namespace:'fixture',category:'do_not_repeat',title:'Keep the lesson',content:'Synthetic content',tags:['fixture'],createdAt:'2026-01-01T00:00:00.000Z',version:2,revisions:[{version:1,title:'First lesson',content:'Original',category:'do_not_repeat',tags:[],archived:false,savedAt:'2026-01-01T00:00:00.000Z'}]};
  const archive={format:'agentforge-memory',schemaVersion:1,namespace:'fixture',exportedAt:'2026-01-02T00:00:00.000Z',records:[record]};
  try {
    await server.start();const base=server.getBaseUrl();
    const login=async(username:string)=>{const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:'synthetic acceptance password'})});expect(response.status).toBe(200);return(await response.json()).token as string;};
    const writer=await login('writer'),reader=await login('reader');
    const request=(body:unknown,token?:string)=>fetch(base+'/api/memory/import',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
    const body={action:'review',namespace:'fixture',archive};
    expect((await request(body)).status).toBe(401);
    expect((await request(body,reader)).status).toBe(403);
    const snapshot=fs.readFileSync(file,'utf8');
    const response=await request(body,writer);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
    const review=await response.json();expect(review.imported).toBe(1);
    expect(fs.readFileSync(file,'utf8')).toBe(snapshot);
    expect((await request({...body,action:'commit',digest:review.digest},writer)).status).toBe(409);
    expect((await request({...body,action:'commit',digest:review.digest,confirm:true,archive:{...archive,records:[{...record,content:'changed after review'}]}},writer)).status).toBe(409);
    expect(store.listOperationalMemories('fixture')).toEqual([]);
    expect((await request({...body,action:'commit',digest:review.digest,confirm:true},writer)).status).toBe(200);
    expect(new WorkspaceStore(file).listOperationalMemories('fixture')).toEqual([record]);
    // The old preview is no longer current, even for an identical replay.
    expect((await request({...body,action:'commit',digest:review.digest,confirm:true},writer)).status).toBe(409);
    const replay=await(await request(body,writer)).json();expect(replay.unchanged).toBe(1);
    expect((await request({...body,action:'commit',digest:replay.digest,confirm:true},writer)).status).toBe(200);
    expect((await request({...body,archive:{...archive,records:[{...record,content:'conflict'}]}},writer)).status).toBe(409);
    expect((await request({...body,archive:{...archive,records:[{...record,id:'other',projectId:'missing-project'}]}},writer)).status).toBe(409);
    expect((await request({...body,namespace:'different'},writer)).status).toBe(409);
    expect(new WorkspaceStore(file).listOperationalMemories('fixture')).toEqual([record]);
    expect(store.listAuditEntries().filter(entry=>entry.action==='memory_batch_imported')).toHaveLength(1);
  } finally {await server.stop();if(path.dirname(directory)!==os.tmpdir()||!path.basename(directory).startsWith('af-memory-route-'))throw Error('Unsafe fixture path');fs.rmSync(directory,{recursive:true,force:true});}
});
