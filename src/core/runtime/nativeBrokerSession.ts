import {NativeToolBroker} from './nativeToolBroker.js';
import {nativeToolRequestDigest,type NativeToolRequest} from './nativeToolAuthorization.js';
export interface NativeReviewQueue {
 prepare(request:NativeToolRequest):{id:string;status:string};
 authorize(reviewId:string,request:NativeToolRequest):Promise<{approvalId:string}>;
}

export interface NativeSessionIdentity {taskId:string;operationId:string;sessionId:string}
/** Construct only from a host-created connection. Neither a tool name nor model
 * arguments authenticate the client. Transport must select this instance before
 * passing input, and close it when the corresponding client session ends.
 */
export class NativeBrokerSession {
 private readonly identity:Readonly<NativeSessionIdentity>;
 private readonly controller=new AbortController();
 private readonly pending=new Set<Promise<unknown>>();
 constructor(identity:NativeSessionIdentity,private broker:NativeToolBroker,private reviews?:NativeReviewQueue){
  for(const value of [identity.taskId,identity.operationId,identity.sessionId])
   if(typeof value!=='string'||!value||value.length>256)throw Error('Invalid host session identity');
  this.identity=Object.freeze({...identity});
 }
 get hasReviewQueue(){return !!this.reviews;}
 async review(payload:unknown){
  if(this.controller.signal.aborted||!this.reviews)throw Error('Review unavailable');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid review request');
  const value=payload as Record<string,unknown>;
  if(Object.keys(value).length!==3||Object.keys(value).some(key=>!['callId','tool','input'].includes(key)))throw Error('Invalid review fields');
  const request={...this.identity,...value} as NativeToolRequest;nativeToolRequestDigest(request);
  const review=this.reviews.prepare(structuredClone(request));return {reviewId:review.id,status:review.status};
 }
 async dispatchReviewed(payload:unknown){
  if(this.controller.signal.aborted||!this.reviews)throw Error('Review unavailable');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid reviewed dispatch');
  const value=payload as Record<string,unknown>;
  if(Object.keys(value).length!==4||Object.keys(value).some(key=>!['reviewId','callId','tool','input'].includes(key))||typeof value.reviewId!=='string')throw Error('Invalid reviewed dispatch fields');
  const {reviewId,...args}=value;const request=structuredClone({...this.identity,...args}) as NativeToolRequest;nativeToolRequestDigest(request);
  const execution=(async()=>{
   const permission=await this.reviews!.authorize(reviewId,request);
   return this.dispatch({approvalId:permission.approvalId,callId:request.callId,tool:request.tool,input:request.input});
  })();
  this.pending.add(execution);try{return await execution;}finally{this.pending.delete(execution);}
 }
 async close(timeoutMs=5000){
  this.controller.abort();
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)throw Error('Invalid shutdown deadline');
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([
   Promise.allSettled([...this.pending]),
   new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('Native tool still running; shutdown not confirmed')),timeoutMs);}),
  ]);}finally{if(timer)clearTimeout(timer);}
 }
 async dispatch(payload:unknown){
  if(this.controller.signal.aborted)throw Error('Native client session closed');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid native dispatch');
  const value=payload as Record<string,unknown>;
  const keys=Object.keys(value);
  if(keys.length!==4||keys.some(key=>!['approvalId','callId','tool','input'].includes(key)))throw Error('Native dispatch cannot supply session identity');
  if(typeof value.approvalId!=='string'||typeof value.callId!=='string'||typeof value.tool!=='string'||!value.input||typeof value.input!=='object'||Array.isArray(value.input))throw Error('Invalid native dispatch');
  const request:NativeToolRequest={...this.identity,callId:value.callId,tool:value.tool,input:value.input as Record<string,unknown>};
  const execution=this.broker.dispatch(value.approvalId,request,this.controller.signal);
  this.pending.add(execution);
  try{return await execution;}finally{this.pending.delete(execution);}
 }
}
