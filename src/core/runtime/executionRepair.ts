import {planningAuditUnresolved} from './executionReceipt.js';
import type {Task} from '../types/task.js';
import type {ApprovedPlanRecord} from './approvedPlanProvider.js';
import {requestDigest,validateReceipt} from './executionReceipt.js';
export interface ExecutionRepairApproval {
 priorOperationId:string; priorReceiptDigest:string; previousPlan?:ApprovedPlanRecord;
 nextRequestDigest:string; approvedBy:string; approvedAt:string;
}
/** Explicit new operation after a fully observed failure; never erase the old receipt. */
export function prepareExecutionRepair(task:Task,plan:ApprovedPlanRecord,workspace:string,worktree:string,reviewedReceiptDigest:string):ExecutionRepairApproval {
 const receipt=task.executionReceipts?.at(-1);
 if(task.status!=='failed'||!receipt||receipt.status!=='observed'||receipt.evidence?.verifiedPassed!==false
   ||receipt.receiptDigest!==reviewedReceiptDigest||!plan.approvedBy.trim())throw Error('Review the observed failed operation before approving a repair');
 validateReceipt(task,receipt,workspace,worktree);
 if(task.planningAudits?.some(planningAuditUnresolved))throw Error('Unresolved planning usage');
 if(JSON.stringify(plan.plan.commands)===JSON.stringify(task.approvedExecutionPlan?.plan.commands))throw Error('Repair must contain a newly reviewed corrected plan');
 return {priorOperationId:receipt.operationId,priorReceiptDigest:receipt.receiptDigest,previousPlan:task.approvedExecutionPlan,
 nextRequestDigest:requestDigest({...task,approvedExecutionPlan:plan}),approvedBy:plan.approvedBy,approvedAt:plan.approvedAt};
}
export function hasApprovedExecutionRepair(task:Task,workspace:string,worktree:string):boolean {
 const receipt=task.executionReceipts?.at(-1),approval=task.executionRepairs?.at(-1);
 if(!receipt||!approval||approval.priorOperationId!==receipt.operationId)return false;
 if(receipt.status!=='observed'||receipt.evidence?.verifiedPassed!==false||receipt.receiptDigest!==approval.priorReceiptDigest
   ||requestDigest(task)!==approval.nextRequestDigest||task.approvedExecutionPlan?.approvedBy!==approval.approvedBy)throw Error('Repair approval no longer matches the reviewed operation and plan');
 validateReceipt({...task,approvedExecutionPlan:approval.previousPlan},receipt,workspace,worktree);
 return true;
}
