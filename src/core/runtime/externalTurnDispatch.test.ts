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

it('recovers a saved run observation without replay or claiming verified completion',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-external-observation-'));
 try{
  const file=path.join(dir,'workspace.json'), store=new WorkspaceStore(file);
  const task=store.createTask({title:'Synthetic recovery',priority:'medium',status:'ready'});
  const request={connectionId:'disposable',sessionKey:'agent:main:synthetic',message:'Synthetic request'};
  const approval=store.createApproval({taskId:task.id,requesterAgentId:'test',action:externalTurnApprovalAction(task,request),risk:'high',expiresAt:new Date(Date.now()+60000).toISOString()});
  store.resolveApproval({approvalId:approval.id,status:'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});
  const submit=vi.fn(async()=>({runId:'saved-run'}));
  await dispatchExternalTurn(store,task.id,approval.id,request,{id:'disposable',submitSessionTurn:submit});
  const recovered=new WorkspaceStore(file);
  const inspect=vi.fn(async()=>({runId:'saved-run',status:'timeout'}));
  const connection={id:'disposable',inspectRun:inspect};
  const {observeExternalTurn}=await import('./externalTurnDispatch.js');
  await expect(observeExternalTurn(recovered,task.id,{...connection,id:'wrong'})).rejects.toThrow(/connection/);
  expect(inspect).not.toHaveBeenCalled();
  await observeExternalTurn(recovered,task.id,connection);
  expect(new WorkspaceStore(file).getTask(task.id)?.externalTurnReceipts?.[0].observation?.remoteStatus).toBe('timeout');
  inspect.mockResolvedValueOnce({runId:'unrelated-run',status:'ok'});
  await expect(observeExternalTurn(recovered,task.id,connection)).rejects.toThrow(/mismatched/);
  expect(recovered.getTask(task.id)?.externalTurnReceipts?.[0].observation?.remoteStatus).toBe('timeout');
  inspect.mockResolvedValueOnce({runId:'saved-run',status:'ok'});
  await observeExternalTurn(recovered,task.id,connection);
  expect(recovered.getTask(task.id)?.status).toBe('paused');
  expect(submit).toHaveBeenCalledTimes(1);
  expect(inspect).toHaveBeenCalledWith('saved-run');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

it('prepares a readable pending review of the exact destination and message without dispatch',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-external-review-'));
 try{
  const store=new WorkspaceStore(path.join(dir,'workspace.json'));
  const task=store.createTask({title:'Synthetic review',priority:'medium',status:'ready'});
  const request={connectionId:'selected-runtime',sessionKey:'selected-session',message:'Only this synthetic message'};
  const {prepareExternalTurnApproval}=await import('./externalTurnDispatch.js');
  const approval=prepareExternalTurnApproval(store,task.id,'synthetic-agent',request);
  expect(approval.status).toBe('pending');
  expect(approval.description).toContain(JSON.stringify(request,null,2));
  expect(approval.description).toContain('own tools and permissions');
  expect(approval.action).toBe(externalTurnApprovalAction(task,request));
  expect(prepareExternalTurnApproval(store,task.id,'synthetic-agent',request).id).toBe(approval.id);
  expect(store.listApprovals()).toHaveLength(1);
  expect(store.getTask(task.id)?.externalTurnReceipts).toBeUndefined();
  expect(()=>prepareExternalTurnApproval(store,task.id,'synthetic-agent',{...request,sessionKey:'invalid\nkey'})).toThrow(/invalid/);
  expect(()=>prepareExternalTurnApproval(store,task.id,'synthetic-agent',{...request,message:'a'.repeat(32001)})).toThrow(/limits/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

it('persists Stop before sending and preserves uncertainty across restart without replay',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-external-stop-'));
 try{
  const file=path.join(dir,'workspace.json'),store=new WorkspaceStore(file);
  const task=store.createTask({title:'Synthetic stopping',priority:'medium',status:'paused'});
  store.updateTask(task.id,{externalTurnReceipts:[{requestId:'request',requestDigest:'digest',approvalId:'approval',connectionId:'selected',sessionKey:'session',status:'accepted',runId:'run',createdAt:new Date().toISOString()}]});
  const {stopExternalTurn}=await import('./externalTurnDispatch.js');
  const requestRunStop=vi.fn(async(sessionKey:string,runId:string)=>{expect([sessionKey,runId]).toEqual(['session','run']);expect(new WorkspaceStore(file).getTask(task.id)?.externalTurnReceipts?.[0].stop?.status).toBe('requested');throw Error('response lost');});
  await expect(stopExternalTurn(store,task.id,'synthetic-owner',{id:'selected',requestRunStop})).rejects.toThrow('response lost');
  const reopened=new WorkspaceStore(file);
  await expect(stopExternalTurn(reopened,task.id,'synthetic-owner',{id:'selected',requestRunStop})).rejects.toThrow(/already recorded/);
  expect(requestRunStop).toHaveBeenCalledTimes(1);expect(reopened.getTask(task.id)?.status).toBe('paused');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
