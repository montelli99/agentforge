import {createHash} from 'node:crypto';
import type {WorkspaceStore} from '../store/workspaceStore.js';
import {NativeToolAuthorization,nativeToolRequestDigest,type NativeToolRequest} from './nativeToolAuthorization.js';

function reviewDescription(request:NativeToolRequest){
 const requestHash=nativeToolRequestDigest(request);
 return JSON.stringify({kind:'native-tool-review-v1',requestHash,request});
}
/** Uses the existing owner review queue. No model-created approval is accepted. */
export function prepareNativeToolReview(store:WorkspaceStore,request:NativeToolRequest){
 const description=reviewDescription(request);
 if(!store.getTask(request.taskId))throw Error('Native tool task does not exist');
 const existing=store.listApprovals().find(item=>item.taskId===request.taskId&&item.description===description&&(item.status==='pending'||item.status==='approved')&&Date.parse(item.expiresAt??'')>Date.now());
 if(existing)return existing;
 return store.createApproval({taskId:request.taskId,requesterAgentId:'native-client',action:`Review native tool: ${request.tool}`,description,risk:'high',expiresAt:new Date(Date.now()+10*60*1000).toISOString()});
}

/** Called by the trusted host after authenticated review, never by client hooks. */
export async function authorizeReviewedNativeTool(store:WorkspaceStore,authorization:NativeToolAuthorization,reviewId:string,request:NativeToolRequest){
 const task=store.getTask(request.taskId);if(!task||['completed','cancelled','failed','paused'].includes(task.status))throw Error('Task is not available for native execution');
 const review=store.getApproval(reviewId);const expiresAt=Date.parse(review?.expiresAt??'');
 if(!review||review.status!=='approved'||!review.approverUserId?.trim()||!review.decidedAt||!Number.isFinite(Date.parse(review.decidedAt))||Date.parse(review.decidedAt)>Date.now()
  ||!Number.isFinite(expiresAt)||expiresAt<=Date.now()||review.taskId!==request.taskId||review.description!==reviewDescription(request))throw Error('Exact unexpired owner review required');
 const hash=createHash('sha256').update('native-review-v1:'+reviewId).digest('hex');
 const approvalId=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
 try{await authorization.approve(approvalId,request,review.approverUserId,expiresAt);}
 catch(error){
  if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
  // Recover an already-issued permission, never replace or reset it.
  const recovered=await authorization.inspect(approvalId,request);
  if(recovered.state!=='unused')throw Error('Permission already issued to an effect; reconcile instead of replay');
 }
 return {approvalId};
}
