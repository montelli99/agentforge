import crypto from 'node:crypto';
import type {WorkspaceStore} from '../store/workspaceStore.js';
import type {Task} from '../types/task.js';
import {executionContractDigest} from './approvedPlanProvider.js';

export interface ExternalTurnRequest { connectionId: string; sessionKey: string; message: string; }
export interface ExternalTurnReceipt { requestId: string; requestDigest: string; approvalId: string; connectionId: string; sessionKey: string; status: 'started' | 'accepted'; runId?: string; createdAt: string; observation?: {remoteStatus: string; observedAt: string}; }
function validateRequest(request: ExternalTurnRequest): void {
  for (const [value, maximum] of [[request.connectionId,512],[request.sessionKey,512],[request.message,32000]] as const) {
    if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw Error('External destination and message must be explicit and within limits');
  }
  if (/[\u0000-\u001f]/.test(request.connectionId + request.sessionKey)) throw Error('External destination contains invalid characters');
}

/** Prepare a reviewable request; never resolves approval or submits work. */
export function prepareExternalTurnApproval(store: WorkspaceStore, taskId: string, requesterAgentId: string, request: ExternalTurnRequest) {
  if (store.persistenceMode !== 'local_json') throw Error('External approval requires durable workspace storage');
  validateRequest(request);
  const task = store.getTask(taskId);
  if (!task || !requesterAgentId.trim() || ['cancelled','completed','failed','in_progress','verification_running'].includes(task.status)
    || task.externalTurnReceipts?.length || task.executionReceipts?.length || task.planningAudits?.some(item=>item.status!=='completed')) throw Error('Task is not available for external approval');
  const action = externalTurnApprovalAction(task,request);
  const existing = store.listApprovals('pending').find(item=>item.taskId===taskId && item.action===action && Date.parse(item.expiresAt ?? '')>Date.now());
  if (existing) return existing;
  return store.createApproval({taskId,requesterAgentId,action,risk:'high',expiresAt:new Date(Date.now()+15*60*1000).toISOString(),
    description: 'Delegate the exact message below to the selected external runtime. That runtime uses its own tools and permissions; AgentForge does not enforce its local execution limits there. No other conversation history is included by this request. Remote acceptance is not verified completion.\n\n'+JSON.stringify(request,null,2)});
}
export function externalTurnApprovalAction(task: Task, request: ExternalTurnRequest): string {
  return 'external-runtime-turn:' + crypto.createHash('sha256').update(JSON.stringify({taskId:task.id, projectId:task.projectId, contract:executionContractDigest(task), connectionId:request.connectionId, sessionKey:request.sessionKey, message:request.message})).digest('hex');
}
/** Control-plane boundary; accepted means received upstream, never verified complete. */
export async function dispatchExternalTurn(store: WorkspaceStore, taskId: string, approvalId: string, request: ExternalTurnRequest,
  connection: { id: string; submitSessionTurn(sessionKey: string, message: string, requestId: string): Promise<{runId:string}> }): Promise<ExternalTurnReceipt> {
  if (store.persistenceMode !== "local_json") throw Error("External execution requires durable workspace storage");
  request = {...request};
  validateRequest(request);
  const task = store.getTask(taskId), approval = store.getApproval(approvalId);
  if (!task || !approval || connection.id !== request.connectionId || !request.connectionId.trim() || !request.sessionKey.trim() || !request.message.trim()) throw Error('External task connection or scope is missing');
  if (task.executionReceipts?.length || ['in_progress','verification_running'].includes(task.status) || task.planningAudits?.some(item => item.status !== 'completed')) throw Error('Existing local execution or unresolved planning must be reconciled first');
  if (task.externalTurnReceipts?.length) throw Error('External submission already recorded; reconcile it before any further dispatch');
  const digest = externalTurnApprovalAction(task, request);
  const now = Date.now(), decided = Date.parse(approval.decidedAt ?? ''), expires = Date.parse(approval.expiresAt ?? '');
  if (approval.taskId !== taskId || approval.action !== digest || approval.status !== 'approved' || !approval.approverUserId?.trim() || !Number.isFinite(decided) || decided > now || !Number.isFinite(expires) || expires <= now || expires <= decided) throw Error('Exact unexpired human approval is required for external execution');
  if (['cancelled','completed','failed'].includes(task.status)) throw Error('Task is not available for external dispatch');
  const receipt: ExternalTurnReceipt = {requestId:crypto.randomUUID(),requestDigest:digest,approvalId,connectionId:request.connectionId,sessionKey:request.sessionKey,status:'started',createdAt:new Date().toISOString()};
  // Synchronous durable store update precedes the first remote side effect.
  store.updateTask(taskId,{externalTurnReceipts:[receipt],status:'paused'});
  const result = await connection.submitSessionTurn(request.sessionKey,request.message,receipt.requestId);
  if (!result.runId?.trim()) throw Error('External run receipt missing; submission remains uncertain');
  const current = store.getTask(taskId);
  if (current?.externalTurnReceipts?.[0]?.requestId !== receipt.requestId) throw Error('External receipt changed during submission; reconcile manually');
  const accepted: ExternalTurnReceipt = {...receipt,status:'accepted',runId:result.runId};
  store.updateTask(taskId,{externalTurnReceipts:[accepted]});
  return accepted;
}

/** Read-only upstream reconciliation; remote status never satisfies local verification. */
export async function observeExternalTurn(store: WorkspaceStore, taskId: string,
  connection: {id: string; inspectRun(runId: string): Promise<{runId: string; status: string}>}): Promise<ExternalTurnReceipt> {
  if (store.persistenceMode !== 'local_json') throw Error('External recovery requires durable workspace storage');
  const receipt = store.getTask(taskId)?.externalTurnReceipts?.[0];
  if (!receipt || receipt.connectionId !== connection.id) throw Error('Saved external connection is required');
  if (receipt.status !== 'accepted' || !receipt.runId) throw Error('Submission is uncertain; a saved upstream run ID is required');
  const result = await connection.inspectRun(receipt.runId);
  if (result.runId !== receipt.runId || typeof result.status !== 'string' || !result.status.trim() || result.status.length > 128) throw Error('Invalid or mismatched external observation');
  const current = store.getTask(taskId)?.externalTurnReceipts?.[0];
  if (!current || current.requestId !== receipt.requestId || current.runId !== receipt.runId || current.connectionId !== connection.id) throw Error('External receipt changed during observation');
  const observed: ExternalTurnReceipt = {...current, observation: {remoteStatus: result.status, observedAt: new Date().toISOString()}};
  // Retain only bounded status metadata, not unsolicited remote transcript content.
  // In particular, never revive a cancelled task or mark an unverified task complete.
  store.updateTask(taskId, {externalTurnReceipts: [observed]});
  return observed;
}
