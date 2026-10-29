import {it,expect,vi} from 'vitest';import {WorkspaceStore} from '../store/workspaceStore.js';import {TaskWorkerRuntime,type TaskExecutionBackend,type TaskExecutionOutput} from './taskWorkerRuntime.js';import {beginReceipt} from './executionReceipt.js';
function fixture(){const store=new WorkspaceStore();const task=store.createTask({title:'Synthetic recovery',status:'paused',priority:'medium'});store.updateTask(task.id,{contract:{...task.contract,requiredChecks:[],completion:{requireEvidencePack:true,requireHumanApproval:false}},worktree:{worktreePath:process.cwd(),branchName:'test',baseSha:'base',isIsolated:true,createdAt:new Date().toISOString()}});const current=store.getTask(task.id)!;store.updateTask(task.id,{executionReceipts:[beginReceipt(current,'workspace',process.cwd(),'original-run')]});const output:TaskExecutionOutput={commandsExecuted:[],testResults:[],filesChanged:[],artifacts:[],finalSha:'base'};const backend:TaskExecutionBackend={getReadiness:()=>({ready:true,blockers:[],capabilities:{modelPlanning:true,isolatedCompute:true,realVerification:true,evidenceCollection:true}}),execute:vi.fn(async()=>{throw Error('Must not execute');}),recoverResult:vi.fn(async()=>output)};const worker=new TaskWorkerRuntime(store,backend,{autoStart:false,workspaceIdentity:'workspace',requireEffectReceipts:true,repoRoot:process.cwd()});return {store,task,backend,worker,output};}
it('requires final approval even for an originally automatic task, including later restore',async()=>{const f=fixture();const task=await f.worker.recoverJournaledExecution(f.task.id);expect(task.status).toBe('waiting_approval');expect(f.worker.reconcileObservedExecution(task.id).status).toBe('waiting_approval');expect(f.backend.execute).not.toHaveBeenCalled();});
it('rejects changed task during recovery without creating an approval',async()=>{const f=fixture();f.backend.recoverResult=async()=>{f.store.updateTask(f.task.id,{description:'changed'});return f.output;};await expect(f.worker.recoverJournaledExecution(f.task.id)).rejects.toThrow('changed');expect(f.store.listApprovals()).toHaveLength(0);expect(f.store.getTask(f.task.id)?.executionReceipts?.at(-1)?.status).toBe('started');});
it('does not turn failed verification into completion',async()=>{const f=fixture();f.output.testResults.push({checkName:'scope',command:'check',passed:false,exitCode:1,stdout:'',stderr:'',durationMs:0});const recovered=await f.worker.recoverJournaledExecution(f.task.id);expect(recovered.status).toBe('failed');expect(recovered.executionReceipts?.at(-1)).toMatchObject({status:'observed',evidence:{verifiedPassed:false}});expect(f.store.listApprovals()).toHaveLength(0);expect(f.backend.execute).not.toHaveBeenCalled();await expect(f.worker.retryTask(f.task.id)).rejects.toThrow('no replay');expect(()=>f.worker.reconcileObservedExecution(f.task.id)).toThrow('no automatic completion');});
it('concurrent recovery cannot create duplicate final approvals',async()=>{const f=fixture();let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);f.backend.recoverResult=async()=>{await gate;return f.output;};const first=f.worker.recoverJournaledExecution(f.task.id),second=f.worker.recoverJournaledExecution(f.task.id);release();const results=await Promise.allSettled([first,second]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(f.store.listApprovals()).toHaveLength(1);expect(f.backend.execute).not.toHaveBeenCalled();});

it('keeps effects uncertain when durable result is unavailable',async()=>{const f=fixture();f.backend.recoverResult=async()=>{throw Error('Journal unavailable');};await expect(f.worker.recoverJournaledExecution(f.task.id)).rejects.toThrow('Journal unavailable');expect(f.store.getTask(f.task.id)?.executionReceipts?.at(-1)?.status).toBe('started');expect(f.store.listApprovals()).toHaveLength(0);expect(f.backend.execute).not.toHaveBeenCalled();});
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {executionContractDigest} from './approvedPlanProvider.js';

it('restores a failed journal, persists reviewed repair, and executes it once across store reopen',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'af-recovered-repair-'));
 const file=path.join(root,'workspace.json');
 const options={autoStart:false,workspaceIdentity:'workspace',requireEffectReceipts:true,repoRoot:root};
 const workers:TaskWorkerRuntime[]=[];
 try{
  let store=new WorkspaceStore(file);
  let task=store.createTask({title:'Synthetic persisted repair',status:'paused',priority:'medium'});
  task=store.updateTask(task.id,{contract:{...task.contract,workspace:{requireIsolatedWorktree:false},requiredChecks:[],completion:{requireEvidencePack:true,requireHumanApproval:true}},worktree:{worktreePath:root,branchName:'test',baseSha:'base',isIsolated:true,createdAt:new Date().toISOString()}});
  const receipt=beginReceipt(task,'workspace',root,'crashed-worker');
  store.updateTask(task.id,{executionReceipts:[receipt]});
  const result:TaskExecutionOutput={commandsExecuted:[],testResults:[{checkName:'unit_tests',command:'synthetic check',passed:false,exitCode:1,stdout:'',stderr:'synthetic failure',durationMs:1}],filesChanged:[],artifacts:[],finalSha:'base'};
  const backend:TaskExecutionBackend={getReadiness:()=>({ready:true,blockers:[],capabilities:{modelPlanning:true,isolatedCompute:true,realVerification:true,evidenceCollection:true}}),recoverResult:async()=>structuredClone(result),execute:vi.fn(async()=>({...result,testResults:result.testResults.map(check=>({...check,passed:true,exitCode:0,stderr:''}))}))};
  let worker=new TaskWorkerRuntime(store,backend,options);workers.push(worker);
  const failed=await worker.recoverJournaledExecution(task.id);
  expect(failed.status).toBe('failed');expect(backend.execute).not.toHaveBeenCalled();
  const observed=structuredClone(failed.executionReceipts![0]);
  worker.approveRepairPlan(task.id,{plan:{taskId:task.id,source:'human_approved',commands:[{checkName:'unit_tests',command:'node corrected.js'}]},contractDigest:executionContractDigest(failed),approvedBy:'synthetic-reviewer',approvedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()},observed.receiptDigest);
  worker.stop();store=new WorkspaceStore(file);worker=new TaskWorkerRuntime(store,backend,options);workers.push(worker);
  const repaired=await worker.retryTask(task.id);
  expect(repaired.status).toBe('waiting_approval');expect(backend.execute).toHaveBeenCalledTimes(1);
  expect(repaired.executionReceipts).toHaveLength(2);expect(repaired.executionReceipts![0]).toEqual(observed);
  expect(repaired.executionReceipts![1].operationId).not.toBe(receipt.operationId);
  worker.stop();store=new WorkspaceStore(file);worker=new TaskWorkerRuntime(store,backend,options);workers.push(worker);
  expect(worker.reconcileObservedExecution(task.id).status).toBe('waiting_approval');
  expect(backend.execute).toHaveBeenCalledTimes(1);expect(store.listApprovals()).toHaveLength(1);
 }finally{for(const worker of workers)worker.stop();fs.rmSync(root,{recursive:true,force:true});}
});
