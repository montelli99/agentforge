import {it,expect,vi} from 'vitest';
import {WorkspaceStore} from '../store/workspaceStore.js';
import {TaskWorkerRuntime,type TaskExecutionBackend} from './taskWorkerRuntime.js';
import {executionContractDigest,type ApprovedPlanRecord} from './approvedPlanProvider.js';
import {hasApprovedExecutionRepair} from './executionRepair.js';
function fixture(){
 const store=new WorkspaceStore();let task=store.createTask({title:'Synthetic repair',status:'ready',priority:'medium'});
 task=store.updateTask(task.id,{contract:{...task.contract,workspace:{requireIsolatedWorktree:false},requiredChecks:[],completion:{requireEvidencePack:true,requireHumanApproval:true}}});
 const record=(command:string):ApprovedPlanRecord=>({plan:{taskId:task.id,source:'human_approved',commands:[{checkName:'unit_tests',command}]},contractDigest:executionContractDigest(task),approvedBy:'reviewer',approvedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()});
 store.updateTask(task.id,{approvedExecutionPlan:record('node broken-check.js')});
 let pass=false;
 const backend:TaskExecutionBackend={getReadiness:()=>({ready:true,blockers:[],capabilities:{modelPlanning:true,isolatedCompute:true,realVerification:true,evidenceCollection:true}}),execute:vi.fn(async()=>({commandsExecuted:[],testResults:[{checkName:'unit_tests',command:'synthetic',passed:pass,exitCode:pass?0:1,stdout:'',stderr:pass?'':'bad check',durationMs:1}],filesChanged:[],artifacts:[],finalSha:'base'}))};
 const options={autoStart:false,workspaceIdentity:'workspace',requireEffectReceipts:true,repoRoot:process.cwd()};
 const worker=new TaskWorkerRuntime(store,backend,options);return {store,task,record,backend,worker,options,pass:()=>{pass=true;}};
}
it('executes a reviewed repair once, retains prior receipt, and restores without replay',async()=>{
 const f=fixture();await f.worker.executeTask(f.task.id);const failed=f.store.getTask(f.task.id)!;expect(failed.status).toBe('failed');const receipt=structuredClone(failed.executionReceipts![0]);
 await expect(f.worker.retryTask(f.task.id)).rejects.toThrow('no replay');
 f.worker.approveRepairPlan(f.task.id,f.record('node corrected-check.js'),receipt.receiptDigest);
 expect(f.backend.execute).toHaveBeenCalledTimes(1);f.pass();const repaired=await f.worker.retryTask(f.task.id);
 expect(repaired.status).toBe('waiting_approval');expect(repaired.executionReceipts).toHaveLength(2);expect(repaired.executionReceipts![0]).toEqual(receipt);
 const restarted=new TaskWorkerRuntime(f.store,f.backend,f.options);await restarted.executeTask(f.task.id);expect(f.backend.execute).toHaveBeenCalledTimes(2);f.worker.stop();restarted.stop();
});
it('rejects stale review and mutated repair commands',async()=>{
 const f=fixture();await f.worker.executeTask(f.task.id);const failed=f.store.getTask(f.task.id)!;
 expect(()=>f.worker.approveRepairPlan(f.task.id,f.record('node corrected-check.js'),'stale')).toThrow('Review');
 f.worker.approveRepairPlan(f.task.id,f.record('node corrected-check.js'),failed.executionReceipts![0].receiptDigest);
 f.store.updateTask(f.task.id,{approvedExecutionPlan:f.record('node changed.js')});
 expect(()=>hasApprovedExecutionRepair(f.store.getTask(f.task.id)!,'workspace',process.cwd())).toThrow('no longer matches');f.worker.stop();
});
import {prepareExecutionRepair} from './executionRepair.js';
import {beginReceipt} from './executionReceipt.js';
it('refuses unobserved effects, unchanged plans and cross-workspace approval',async()=>{
 const f=fixture();await f.worker.executeTask(f.task.id);const failed=f.store.getTask(f.task.id)!,digest=failed.executionReceipts![0].receiptDigest;
 expect(()=>prepareExecutionRepair(failed,failed.approvedExecutionPlan!,'workspace',process.cwd(),digest)).toThrow('corrected');
 expect(()=>prepareExecutionRepair(failed,f.record('node corrected.js'),'other-workspace',process.cwd(),digest)).toThrow('identity');
 const started=beginReceipt(failed,'workspace',process.cwd(),'unknown-run');
 expect(()=>prepareExecutionRepair({...failed,executionReceipts:[started]},f.record('node corrected.js'),'workspace',process.cwd(),started.receiptDigest)).toThrow('observed failed');
 f.worker.stop();
});
it.each([401,403] as const)('worker executes once after recorded authentication refusal %s',async rejectionStatus=>{
 const f=fixture();f.pass();
 f.store.updateTask(f.task.id,{planningAudits:[{id:'refused',taskId:f.task.id,model:'fixture',requestDigest:'synthetic',status:'rejected',rejectionStatus}]});
 try{
  const result=await f.worker.executeTask(f.task.id);
  expect(result.status).toBe('waiting_approval');expect(f.backend.execute).toHaveBeenCalledTimes(1);
  expect(result.planningAudits?.[0]).toMatchObject({status:'rejected',rejectionStatus});
  expect(result.planningAudits?.[0].inputTokens).toBeUndefined();
  const restarted=new TaskWorkerRuntime(f.store,f.backend,f.options);
  try{await restarted.executeTask(f.task.id);expect(f.backend.execute).toHaveBeenCalledTimes(1);}finally{restarted.stop();}
 }finally{f.worker.stop();}
});
it.each(['unknown','started','rejected'] as const)('worker refuses unresolved planning status %s before execution',async status=>{
 const f=fixture();f.pass();
 f.store.updateTask(f.task.id,{planningAudits:[{id:'unresolved',taskId:f.task.id,model:'fixture',requestDigest:'synthetic',status}]});
 try{await expect(f.worker.executeTask(f.task.id)).rejects.toThrow(/Planning usage unknown/);expect(f.backend.execute).not.toHaveBeenCalled();}finally{f.worker.stop();}
});
