import {it,expect} from 'vitest';
import {WorkspaceStore} from './workspaceStore.js';
import {sealEvidencePack,verifyEvidencePackIntegrity} from '../evidence/evidencePackIntegrity.js';
import type {EvidencePack} from '../types/evidence.js';
function fixture(){const store=new WorkspaceStore();const task=store.createTask({title:'Synthetic',priority:'medium',status:'waiting_approval'});const approval=store.createApproval({taskId:task.id,requesterAgentId:'synthetic',action:'Review',description:'Synthetic',risk:'low'});store.updateTask(task.id,{evidencePack:sealEvidencePack({taskId:task.id,approvalId:approval.id,verifiedPassed:true,artifacts:[]} as unknown as EvidencePack)});return {store,task,approval,decision:{approvalId:approval.id,status:'approved' as const,approverUserId:'owner',decisionOrigin:'web' as const}};}
it('preserves evidence integrity after adding approval provenance',()=>{const f=fixture();f.store.resolveApproval(f.decision);const task=f.store.getTask(f.task.id)!;expect(task.status).toBe('completed');expect(task.evidencePack?.approvedBy).toBe('owner');expect(verifyEvidencePackIntegrity(task.evidencePack!)).toBe(true);});
it('refuses tampered evidence without consuming its pending approval',()=>{const f=fixture();f.store.getTask(f.task.id)!.evidencePack!.objective='changed';expect(()=>f.store.resolveApproval(f.decision)).toThrow('integrity');expect(f.store.getApproval(f.approval.id)?.status).toBe('pending');expect(f.store.getTask(f.task.id)?.status).toBe('waiting_approval');});

it('repairs only the historical provenance-only hash mismatch',()=>{
 const f=fixture();const oldHash=f.store.getTask(f.task.id)!.evidencePack!.integrityHash;f.store.resolveApproval(f.decision);
 f.store.getTask(f.task.id)!.evidencePack!.integrityHash=oldHash;
 const repaired=f.store.recoverCompletedApprovalEvidence(f.task.id);expect(verifyEvidencePackIntegrity(repaired.evidencePack!)).toBe(true);
 expect(repaired.status).toBe('completed');expect(f.store.getApproval(f.approval.id)?.status).toBe('approved');
});
it('does not repair changed output metadata or a mismatched reviewer',()=>{
 for(const field of ['objective','approvedBy'] as const){const f=fixture();const oldHash=f.store.getTask(f.task.id)!.evidencePack!.integrityHash;f.store.resolveApproval(f.decision);const pack=f.store.getTask(f.task.id)!.evidencePack!;pack.integrityHash=oldHash;pack[field]='changed';expect(verifyEvidencePackIntegrity(f.store.recoverCompletedApprovalEvidence(f.task.id).evidencePack!)).toBe(false);}
});
