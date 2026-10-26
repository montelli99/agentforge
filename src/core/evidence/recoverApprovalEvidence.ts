import type {Task} from '../types/task.js';
import type {ApprovalRequest} from '../types/approval.js';
import {sealEvidencePack,verifyEvidencePackIntegrity} from './evidencePackIntegrity.js';
/** Repair only the historical addition of approval provenance after sealing. */
export function recoverApprovalEvidence(task:Task,approval:ApprovalRequest|undefined){
 const pack=task.evidencePack;
 if(!pack||verifyEvidencePackIntegrity(pack))return undefined;
 if(task.status!=='completed'||pack.taskId!==task.id||!pack.verifiedPassed||!approval||approval.id!==pack.approvalId||approval.taskId!==task.id||approval.status!=='approved'||!approval.decidedAt||!approval.approverUserId||approval.approverUserId!==pack.approvedBy||!approval.decisionOrigin||approval.decisionOrigin!==pack.approvalSource)return undefined;
 const {approvedBy,approvalSource,...original}=pack;
 if(!verifyEvidencePackIntegrity(original))return undefined;
 return sealEvidencePack(pack);
}
