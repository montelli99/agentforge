import crypto from 'node:crypto';
import type {WorkspaceStore} from '../store/workspaceStore.js';
import type {Task} from '../types/task.js';
import {executionContractDigest} from './approvedPlanProvider.js';

export interface ExternalTurnRequest { connectionId: string; sessionKey: string; message: string; }
export interface ExternalTurnReceipt { requestId: string; requestDigest: string; approvalId: string; connectionId: string; sessionKey: string; status: 'started' | 'accepted'; runId?: string; createdAt: string; }
export function externalTurnApprovalAction(task: Task, request: ExternalTurnRequest): string {
  return 'external-runtime-turn:' + crypto.createHash('sha256').update(JSON.stringify({taskId:task.id, projectId:task.projectId, contract:executionContractDigest(task), connectionId:request.connectionId, sessionKey:request.sessionKey, message:request.message})).digest('hex');
}
/** Control-plane boundary; accepted means received upstream, never verified complete. */
export async function dispatchExternalTurn(store: WorkspaceStore, taskId: string, approvalId: string, request: ExternalTurnRequest,
  connection: { id: string; submitSessionTurn(sessionKey: string, message: string, requestId: string): Promise<{runId:string}> }): Promise<ExternalTurnReceipt> {
  if (store.persistenceMode !== "local_json") throw Error("External execution requires durable workspace storage");
  request = {...request};
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
