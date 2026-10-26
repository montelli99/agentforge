import {it,expect} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {NativeToolAuthorization} from './nativeToolAuthorization.js';
import {NativeToolBroker} from './nativeToolBroker.js';
import {NativeBrokerSession} from './nativeBrokerSession.js';
it('binds approvals to the host connection and rejects identity injection without effects',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-session-proof-'));try{
 const work=path.join(root,'work');await fs.mkdir(work);const gate=new NativeToolAuthorization(path.join(root,'host'),work);
 const identity={taskId:'task',operationId:'operation',sessionId:'first'};
 const args={callId:'call',tool:'write',input:{text:'synthetic'}};const approvalId=randomUUID();
 await gate.approve(approvalId,{...identity,...args},'owner',Date.now()+60000);
 let calls=0;const broker=new NativeToolBroker(gate,async()=>{calls++;return {evidence:'synthetic'};});
 const first=new NativeBrokerSession(identity,broker);const second=new NativeBrokerSession({...identity,sessionId:'second'},broker);
 identity.sessionId='changed-after-construction';
 await expect(second.dispatch({approvalId,...args})).rejects.toThrow();
 await expect(second.dispatch({approvalId,...args,sessionId:'first'})).rejects.toThrow();
 expect(calls).toBe(0);
 expect((await first.dispatch({approvalId,...args})).effectStatus).toBe('observed');expect(calls).toBe(1);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
it('closed sessions cannot consume a permission',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-session-proof-'));try{
 const work=path.join(root,'work');await fs.mkdir(work);const gate=new NativeToolAuthorization(path.join(root,'host'),work);
 const identity={taskId:'task',operationId:'operation',sessionId:'session'};
 const args={callId:'call',tool:'write',input:{}};const approvalId=randomUUID();
 await gate.approve(approvalId,{...identity,...args},'owner',Date.now()+60000);
 const session=new NativeBrokerSession(identity,new NativeToolBroker(gate,async()=>{throw Error('Must not execute');}));session.close();
 await expect(session.dispatch({approvalId,...args})).rejects.toThrow('closed');
 expect((await gate.inspect(approvalId,{...identity,...args})).state).toBe('unused');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
