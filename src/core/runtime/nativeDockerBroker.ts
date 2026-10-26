import path from 'node:path';
import type {Task} from '../types/task.js';
import {executionContractDigest} from './approvedPlanProvider.js';
import {ContractedDockerExecutionBackend} from './contractedDockerExecutionBackend.js';
import {NativeToolAuthorization} from './nativeToolAuthorization.js';
import {NativeToolBroker} from './nativeToolBroker.js';
import {NativeBrokerSession,type NativeSessionIdentity} from './nativeBrokerSession.js';

/** Host-only composition: client input cannot supply commands, worktree or contract.
 * The existing backend independently rechecks the stored human-approved plan.
 */
export function createNativeDockerSession(input:{identity:NativeSessionIdentity;task:Task;worktreePath:string;authorization:NativeToolAuthorization;backend:ContractedDockerExecutionBackend}){
 const task=structuredClone(input.task);const identity=Object.freeze({...input.identity});
 const worktreePath=input.worktreePath;const backend=input.backend;
 if(identity.taskId!==task.id||!path.isAbsolute(worktreePath)||!task.contract.workspace.requireIsolatedWorktree)throw Error('Bound isolated task workspace required');
 const contractDigest=executionContractDigest(task);
 const broker=new NativeToolBroker(input.authorization,async(request,signal)=>{
  if(request.taskId!==identity.taskId||request.operationId!==identity.operationId||request.sessionId!==identity.sessionId||request.tool!=='execute_approved_task'
   ||Object.keys(request.input).length!==1||request.input.contractDigest!==contractDigest)throw Error('Native request does not match approved task boundaries');
  if(!backend.getReadiness().ready)throw Error('Isolated execution is not ready');
  await backend.validateTask(task);
  const output=await backend.execute({task:structuredClone(task),worktreePath,operationId:identity.operationId,signal});
  return {evidence:JSON.stringify(output)};
 });
 return {session:new NativeBrokerSession(identity,broker),tool:'execute_approved_task',input:{contractDigest}};
}
