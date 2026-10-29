import {it,expect} from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {NativeToolAuthorization} from './nativeToolAuthorization.js';
import {NativeToolBroker} from './nativeToolBroker.js';

async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-broker-proof-'));const work=path.join(root,'work');await fs.mkdir(work);
 const gate=new NativeToolAuthorization(path.join(root,'host'),work);
 const request={taskId:'synthetic',operationId:'operation',sessionId:'session',callId:'call',tool:'write',input:{content:'one'}};
 return {root,work,gate,request,id:randomUUID(),signal:new AbortController().signal};
}
it('missing permission never reaches the effect executor',async()=>{
 const f=await fixture();let count=0;
 try{const broker=new NativeToolBroker(f.gate,async()=>{count++;return {evidence:'written'};});
 await expect(broker.dispatch(f.id,f.request,f.signal)).rejects.toThrow();expect(count).toBe(0);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
it('concurrent dispatch produces one physical write and durable observation',async()=>{
 const f=await fixture();try{
 await f.gate.approve(f.id,f.request,'synthetic-owner',Date.now()+60000);
 const file=path.join(f.work,'effects.txt');
 const broker=new NativeToolBroker(f.gate,async()=>{await fs.appendFile(file,'effect\n');return {evidence:await fs.readFile(file,'utf8')};});
 const results=await Promise.allSettled([broker.dispatch(f.id,f.request,f.signal),broker.dispatch(f.id,f.request,f.signal)]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await fs.readFile(file,'utf8')).toBe('effect\n');
 expect((await f.gate.inspect(f.id,f.request)).state).toBe('observed');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
it('lost result after a physical effect prevents replay in a reconstructed broker',async()=>{
 const f=await fixture();try{
 await f.gate.approve(f.id,f.request,'synthetic-owner',Date.now()+60000);const file=path.join(f.work,'effects.txt');
 const executor=async()=>{await fs.appendFile(file,'effect\n');throw Error('Lost result after effect');};
 await expect(new NativeToolBroker(f.gate,executor).dispatch(f.id,f.request,f.signal)).rejects.toThrow('Lost result');
 const recovered=new NativeToolAuthorization(path.join(f.root,'host'),f.work);
 expect((await recovered.inspect(f.id,f.request)).state).toBe('unconfirmed');
 await expect(new NativeToolBroker(recovered,executor).dispatch(f.id,f.request,f.signal)).rejects.toThrow();
 expect(await fs.readFile(file,'utf8')).toBe('effect\n');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
