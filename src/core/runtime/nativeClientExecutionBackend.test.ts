import {it,expect} from 'vitest';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {WorkspaceStore} from '../store/workspaceStore.js';
import type {ContractedDockerExecutionBackend} from './contractedDockerExecutionBackend.js';
import {NativeClientExecutionBackend} from './nativeClientExecutionBackend.js';
it('requires an operation receipt and rejects client completion without verified execution output',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-native-worker-'));try{
 const work=path.join(root,'work');await fs.mkdir(work);const store=new WorkspaceStore(path.join(root,'workspace.json'));
 const task=store.createTask({title:'Synthetic native task',status:'ready',priority:'medium'});task.contract.workspace.requireIsolatedWorktree=true;
 let launches=0;let endpoint='';let recoveries=0;
 const docker={getReadiness:()=>({ready:true,blockers:[],capabilities:{modelPlanning:true,isolatedCompute:true,realVerification:true,evidenceCollection:true}}),recoverResult:async()=>{recoveries++;throw Error('No verified execution result');}} as unknown as ContractedDockerExecutionBackend;
 const backend=new NativeClientExecutionBackend(docker,{getReadiness:()=>({ready:true}),run:async input=>{launches++;endpoint=input.connection.endpoint;}},store,path.join(root,'host'));
 const input={task,worktreePath:work,signal:new AbortController().signal};
 await expect(backend.execute(input)).rejects.toThrow('operation receipt');expect(launches).toBe(0);
 const pending=backend.execute({...input,operationId:'operation'});
 await new Promise(resolve=>setTimeout(resolve,20));
 expect(launches).toBe(0);expect(store.getTask(task.id)?.status).toBe('waiting_approval');
 const review=store.listApprovals()[0]!;
 store.resolveApproval({approvalId:review.id,status:'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});
 await expect(pending).rejects.toThrow('No verified execution result');
 expect(launches).toBe(1);expect(recoveries).toBe(1);
 await expect(fetch(endpoint,{signal:AbortSignal.timeout(1000)})).rejects.toThrow();
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

it('cancels a pending owner review without launching the client',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-native-cancel-'));try{
 const work=path.join(root,'work');await fs.mkdir(work);
 const store=new WorkspaceStore(path.join(root,'store.json'));
 const task=store.createTask({title:'Synthetic cancellation',status:'ready',priority:'medium'});
 task.contract.workspace.requireIsolatedWorktree=true;
 let launches=0;
 const docker={getReadiness:()=>({ready:true,blockers:[]})} as unknown as ContractedDockerExecutionBackend;
 const backend=new NativeClientExecutionBackend(docker,{getReadiness:()=>({ready:true}),run:async()=>{launches++;}},store,path.join(root,'host'));
 const controller=new AbortController();
 const pending=backend.execute({task,worktreePath:work,operationId:'cancel-operation',signal:controller.signal});
 const rejected=expect(pending).rejects.toThrow();
 await new Promise(resolve=>setTimeout(resolve,20));
 controller.abort();await rejected;
 expect(launches).toBe(0);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
it.each(['rejected','expired','cancelled-after-approval'] as const)('does not launch after %s',async scenario=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-native-review-stop-'));
 try{
  const work=path.join(root,'work');await fs.mkdir(work);
  const store=new WorkspaceStore(path.join(root,'store.json'));
  const task=store.createTask({title:'Synthetic review stop',status:'ready',priority:'medium'});
  task.contract.workspace.requireIsolatedWorktree=true;
  let launches=0;
  const docker={getReadiness:()=>({ready:true,blockers:[]})} as unknown as ContractedDockerExecutionBackend;
  const backend=new NativeClientExecutionBackend(docker,{getReadiness:()=>({ready:true}),run:async()=>{launches++;}},store,path.join(root,'host'));
  const pending=backend.execute({task,worktreePath:work,operationId:'stop-operation',signal:new AbortController().signal});
  const rejected=expect(pending).rejects.toThrow();
  await new Promise(resolve=>setTimeout(resolve,20));
  const review=store.listApprovals()[0]!;
  if(scenario==='expired'){
   review.expiresAt=new Date(Date.now()-1000).toISOString();
   store.emit('approval_updated','approval',review);
  }else{
   store.resolveApproval({approvalId:review.id,status:scenario==='rejected'?'rejected':'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});
   if(scenario==='cancelled-after-approval')store.updateTask(task.id,{status:'cancelled'});
  }
  await rejected;expect(launches).toBe(0);
  if(scenario==='cancelled-after-approval')expect(store.getTask(task.id)?.status).toBe('cancelled');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
