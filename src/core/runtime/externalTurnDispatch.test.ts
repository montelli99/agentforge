import {expect,it,vi} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {WorkspaceStore} from '../store/workspaceStore.js';
import {dispatchExternalTurn,externalTurnApprovalAction} from './externalTurnDispatch.js';
import {TaskWorkerRuntime} from './taskWorkerRuntime.js';
it('excludes overlapping dispatch and local execution, and preserves cancellation after a late remote receipt',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-external-overlap-'));
 const file=path.join(dir,'workspace.json'), store=new WorkspaceStore(file);
 const runtime=new TaskWorkerRuntime(store,undefined,{autoStart:false});
 try{
  const task=store.createTask({title:'Synthetic overlapping task',priority:'medium',status:'ready'});
  const request={connectionId:'disposable',sessionKey:'agent:main:synthetic',message:'Synthetic request'};
  const approval=store.createApproval({taskId:task.id,requesterAgentId:'test',action:externalTurnApprovalAction(task,request),risk:'high',expiresAt:new Date(Date.now()+60000).toISOString()});
  store.resolveApproval({approvalId:approval.id,status:'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});
  let finish!:(value:{runId:string})=>void;
  const submit=vi.fn(()=>new Promise<{runId:string}>(resolve=>{finish=resolve;}));
  const connection={id:'disposable',submitSessionTurn:submit};
  const pending=dispatchExternalTurn(store,task.id,approval.id,request,connection);
  await expect(dispatchExternalTurn(store,task.id,approval.id,request,connection)).rejects.toThrow(/already recorded/);
  await expect(runtime.executeTask(task.id)).rejects.toThrow(/External execution already recorded/);
  store.updateTask(task.id,{status:'cancelled'});
  finish({runId:'synthetic-remote-run'});
  const receipt=await pending;
  const reopened=new WorkspaceStore(file);
  expect(receipt.status).toBe('accepted');
  expect(reopened.getTask(task.id)?.status).toBe('cancelled');
  expect(reopened.getTask(task.id)?.externalTurnReceipts?.[0]).toEqual(receipt);
  expect(submit).toHaveBeenCalledExactlyOnceWith(request.sessionKey,request.message,receipt.requestId);
 }finally{runtime.stop();fs.rmSync(dir,{recursive:true,force:true});}
});
it('persists before dispatch and prevents replay after failure and store reopen',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-external-turn-'));
 try{
  const file=path.join(dir,'workspace.json'), store=new WorkspaceStore(file);
  const task=store.createTask({title:'Synthetic external task',priority:'medium',status:'ready'});
  const request={connectionId:'disposable',sessionKey:'agent:main:synthetic',message:'Synthetic request'};
  const approval=store.createApproval({taskId:task.id,requesterAgentId:'test',action:externalTurnApprovalAction(task,request),risk:'high',expiresAt:new Date(Date.now()+60000).toISOString()});
  const submit=vi.fn(async()=>{const disk=new WorkspaceStore(file);expect(disk.getTask(task.id)?.externalTurnReceipts?.[0].status).toBe('started');throw Error('synthetic disconnect');});
  const connection={id:'disposable',submitSessionTurn:submit};
  await expect(dispatchExternalTurn(store,task.id,approval.id,request,connection)).rejects.toThrow(/approval/);expect(submit).not.toHaveBeenCalled();
  store.resolveApproval({approvalId:approval.id,status:'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});
  await expect(dispatchExternalTurn(store,task.id,approval.id,{...request,message:'changed'},connection)).rejects.toThrow(/approval/);
  await expect(dispatchExternalTurn(store,task.id,approval.id,request,connection)).rejects.toThrow('synthetic disconnect');
  const reopened=new WorkspaceStore(file);
  await expect(dispatchExternalTurn(reopened,task.id,approval.id,request,connection)).rejects.toThrow(/already recorded/);
  expect(submit).toHaveBeenCalledTimes(1);expect(reopened.getTask(task.id)?.status).toBe('paused');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
