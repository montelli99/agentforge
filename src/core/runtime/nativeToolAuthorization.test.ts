import {it,expect} from 'vitest';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {randomUUID} from 'node:crypto';import {NativeToolAuthorization,type NativeToolRequest} from './nativeToolAuthorization.js';
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-native-'));const worktree=path.join(root,'work');await fs.mkdir(worktree);const directory=path.join(root,'host');const gate=new NativeToolAuthorization(directory,worktree);const request:NativeToolRequest={taskId:'task',operationId:'operation',sessionId:'session',callId:'call',tool:'write',input:{path:'output.txt',content:'synthetic'}};return {gate,directory,worktree,request,id:randomUUID()};}
it('consumes exact approval once across concurrent and restarted callers',async()=>{const f=await fixture();await f.gate.approve(f.id,f.request,'owner',Date.now()+60000);const results=await Promise.allSettled([f.gate.consume(f.id,f.request),f.gate.consume(f.id,f.request)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);await expect(new NativeToolAuthorization(f.directory,f.worktree).consume(f.id,f.request)).rejects.toThrow();});
it('rejects changed operation session tool and arguments without consuming approval',async()=>{const f=await fixture();await f.gate.approve(f.id,f.request,'owner',Date.now()+60000);for(const request of [{...f.request,operationId:'other'},{...f.request,sessionId:'other'},{...f.request,tool:'shell'},{...f.request,input:{path:'other'}}])await expect(f.gate.consume(f.id,request)).rejects.toThrow(/another request/);expect((await f.gate.consume(f.id,f.request)).effectStatus).toBe('unconfirmed');});
it('rejects missing and expired approvals',async()=>{const f=await fixture();await expect(f.gate.consume(f.id,f.request)).rejects.toThrow();await f.gate.approve(f.id,f.request,'owner',Date.now()+60000);const file=path.join(f.directory,f.id+'.json');const record=JSON.parse(await fs.readFile(file,'utf8'));record.expiresAt=Date.now()-1;await fs.writeFile(file,JSON.stringify(record));await expect(f.gate.consume(f.id,f.request)).rejects.toThrow(/expired/);});
it('refuses approval storage inside client worktree',async()=>{const f=await fixture();await expect(new NativeToolAuthorization(path.join(f.worktree,'approvals'),f.worktree).approve(f.id,f.request,'owner',Date.now()+60000)).rejects.toThrow(/outside/);});
it('recovers unused, uncertain and observed states without granting replay',async()=>{
 const f=await fixture();await f.gate.approve(f.id,f.request,'owner',Date.now()+60000);
 expect((await f.gate.inspect(f.id,f.request)).state).toBe('unused');
 await expect(f.gate.observe(f.id,f.request,'a'.repeat(64))).rejects.toThrow();
 await f.gate.consume(f.id,f.request);
 const restarted=new NativeToolAuthorization(f.directory,f.worktree);
 expect((await restarted.inspect(f.id,f.request)).state).toBe('unconfirmed');
 await expect(restarted.observe(f.id,{...f.request,callId:'different'},'a'.repeat(64))).rejects.toThrow();
 const results=await Promise.allSettled([restarted.observe(f.id,f.request,'a'.repeat(64)),restarted.observe(f.id,f.request,'b'.repeat(64))]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect((await new NativeToolAuthorization(f.directory,f.worktree).inspect(f.id,f.request)).state).toBe('observed');
 await expect(restarted.consume(f.id,f.request)).rejects.toThrow();
});
it('partial claim after process death is never classified as unused or replayed',async()=>{
 const f=await fixture();await f.gate.approve(f.id,f.request,'owner',Date.now()+60000);
 await fs.writeFile(path.join(f.directory,f.id+'.json.consumed'),'{');
 const restarted=new NativeToolAuthorization(f.directory,f.worktree);
 await expect(restarted.inspect(f.id,f.request)).rejects.toThrow();
 await expect(restarted.consume(f.id,f.request)).rejects.toThrow();
 await expect(restarted.observe(f.id,f.request,'a'.repeat(64))).rejects.toThrow();
});
it('a second approval for the identical call cannot issue a second effect permission',async()=>{
 const f=await fixture();const second=randomUUID();
 await f.gate.approve(f.id,f.request,'owner',Date.now()+60000);await f.gate.approve(second,f.request,'owner',Date.now()+60000);
 const outcomes=await Promise.allSettled([f.gate.consume(f.id,f.request),f.gate.consume(second,f.request)]);
 expect(outcomes.filter(result=>result.status==='fulfilled')).toHaveLength(1);
 const winner=outcomes[0].status==='fulfilled'?f.id:second;const loser=winner===f.id?second:f.id;
 const restarted=new NativeToolAuthorization(f.directory,f.worktree);
 expect((await restarted.inspect(loser,f.request)).state).toBe('claimed_elsewhere');
 await expect(restarted.consume(loser,f.request)).rejects.toThrow();
 await expect(restarted.observe(loser,f.request,'a'.repeat(64))).rejects.toThrow();
 await restarted.observe(winner,f.request,'a'.repeat(64));
 expect((await restarted.inspect(winner,f.request)).state).toBe('observed');
});
it('reordered JSON keys do not bypass the request claim',async()=>{
 const f=await fixture();const second=randomUUID();const reordered={...f.request,input:{content:'synthetic',path:'output.txt'}};
 await f.gate.approve(f.id,f.request,'owner',Date.now()+60000);await f.gate.consume(f.id,f.request);
 await f.gate.approve(second,reordered,'owner',Date.now()+60000);
 await expect(f.gate.consume(second,reordered)).rejects.toThrow();
 expect((await f.gate.inspect(second,reordered)).state).toBe('claimed_elsewhere');
});
it('a replacement client session cannot replay the same operation call',async()=>{
 const f=await fixture();await f.gate.approve(f.id,f.request,'owner',Date.now()+60000);await f.gate.consume(f.id,f.request);
 const next={...f.request,sessionId:'reconnected'};const approval=randomUUID();
 await f.gate.approve(approval,next,'owner',Date.now()+60000);
 await expect(f.gate.consume(approval,next)).rejects.toThrow();
 expect((await f.gate.inspect(approval,next)).state).toBe('claimed_elsewhere');
});
