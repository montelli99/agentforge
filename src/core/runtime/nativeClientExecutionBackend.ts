import {randomUUID} from 'node:crypto';
import type {WorkspaceStore} from '../store/workspaceStore.js';
import {NativeToolAuthorization} from './nativeToolAuthorization.js';
import {createNativeDockerSession} from './nativeDockerBroker.js';
import {ContractedDockerExecutionBackend} from './contractedDockerExecutionBackend.js';
import {startNativeBrokerEndpoint} from '../../providers/mcp/nativeBrokerEndpoint.js';
import {TaskExecutionCancelledError,type TaskExecutionBackend} from './taskWorkerRuntime.js';

export interface GovernedNativeClient {
 getReadiness():{ready:boolean;blocker?:string};
 /** Resolve only after the client process and its children have stopped. Never
  * place connection.token in a prompt, worktree, transcript or public evidence. */
 run(input:{connection:{endpoint:string;token:string};request:{callId:string;tool:string;input:{contractDigest:string}};signal:AbortSignal}):Promise<void>;
}

/** Install as the ordinary runtime backend, not as a second independent worker.
 * TaskWorkerRuntime continues to own locking, receipts, memory and acceptance.
 */
export class NativeClientExecutionBackend implements TaskExecutionBackend {
 readonly allowsGovernedProcesses=false;
 constructor(private docker:ContractedDockerExecutionBackend,private client:GovernedNativeClient,private store:WorkspaceStore,private authorizationDirectory:string){}
 getReadiness(){
  const execution=this.docker.getReadiness();const client=this.client.getReadiness();
  return {...execution,ready:execution.ready&&client.ready,blockers:[...execution.blockers,...(client.ready?[]:[client.blocker??'Native client is not ready'])]};
 }
 validateTask:NonNullable<TaskExecutionBackend['validateTask']>=task=>this.docker.validateTask(task);
 inspectSurvivors:NonNullable<TaskExecutionBackend['inspectSurvivors']>=input=>this.docker.inspectSurvivors(input);
 recoverResult:NonNullable<TaskExecutionBackend['recoverResult']>=input=>this.docker.recoverResult(input);
 private async waitForReview(taskId:string,reviewId:string,signal:AbortSignal):Promise<void>{
  const previous=this.store.getTask(taskId)?.status;
  if(!previous)throw Error('Native task is missing');
  if(signal.aborted)throw new TaskExecutionCancelledError();
  if(['cancelled','failed','paused','completed'].includes(previous))throw Error('Native task is stopped');
  this.store.updateTask(taskId,{status:'waiting_approval'});
  await new Promise<void>((resolve,reject)=>{
   let unsubscribe=()=>{};
   let timer:ReturnType<typeof setTimeout>|undefined;
   let settled=false;
   const finish=(error?:Error)=>{
    if(settled)return;settled=true;unsubscribe();clearTimeout(timer);signal.removeEventListener('abort',check);
    if(error)reject(error);else resolve();
   };
   const check=()=>{
    if(signal.aborted)return finish(new TaskExecutionCancelledError());
    const task=this.store.getTask(taskId);const review=this.store.getApproval(reviewId);
    if(!task||['cancelled','failed','paused','completed'].includes(task.status))return finish(Error('Native task stopped during review'));
    const expiry=Date.parse(review?.expiresAt??'');
    if(!review||!Number.isFinite(expiry)||expiry<=Date.now())return finish(Error('Native owner review expired'));
    if(review.status==='approved')return finish();
    if(review.status!=='pending')return finish(Error('Native owner review was not approved'));
   };
   unsubscribe=this.store.subscribe(check);
   signal.addEventListener('abort',check,{once:true});
   const expiry=Date.parse(this.store.getApproval(reviewId)?.expiresAt??'');
   timer=setTimeout(check,Math.max(1,expiry-Date.now()));
   check();
  });
  if(signal.aborted)throw new TaskExecutionCancelledError();
  const current=this.store.getTask(taskId);
  if(!current||current.status!=='waiting_approval')throw Error('Native task changed after review');
  this.store.updateTask(taskId,{status:previous});
 }
 execute:TaskExecutionBackend['execute']=async input=>{
  if(!input.operationId)throw Error('Native client requires a runtime operation receipt');
  if(!this.getReadiness().ready)throw Error('Native execution is not ready');
  if(input.signal.aborted)throw new TaskExecutionCancelledError();
  const authorization=new NativeToolAuthorization(this.authorizationDirectory,input.worktreePath);
  const bound=createNativeDockerSession({identity:{taskId:input.task.id,operationId:input.operationId,sessionId:randomUUID()},task:input.task,worktreePath:input.worktreePath,authorization,backend:this.docker,reviewStore:this.store});
  const review=await bound.session.review({callId:bound.callId,tool:bound.tool,input:bound.input});
  try{await this.waitForReview(input.task.id,review.reviewId,input.signal);}
  catch(error){await bound.session.close();throw error;}
  const connection=await startNativeBrokerEndpoint(bound.session);
  const abort=()=>{void bound.session.close().catch(()=>{/* Final close below must confirm settlement. */});};
  input.signal.addEventListener('abort',abort,{once:true});
  try{
   if(input.signal.aborted)throw new TaskExecutionCancelledError();
   await this.client.run({connection:{endpoint:connection.endpoint,token:connection.token},request:{callId:bound.callId,tool:bound.tool,input:bound.input},signal:input.signal});
  }finally{input.signal.removeEventListener('abort',abort);await connection.close();}
  if(input.signal.aborted)throw new TaskExecutionCancelledError();
  // A client's final message cannot declare success. Recover independently
  // verified persisted execution output for the runtime's completion engine.
  return this.docker.recoverResult({task:input.task,operationId:input.operationId,worktreePath:input.worktreePath});
 };
}
