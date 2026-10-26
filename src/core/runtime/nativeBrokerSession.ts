import {NativeToolBroker} from './nativeToolBroker.js';
import type {NativeToolRequest} from './nativeToolAuthorization.js';

export interface NativeSessionIdentity {taskId:string;operationId:string;sessionId:string}
/** Construct only from a host-created connection. Neither a tool name nor model
 * arguments authenticate the client. Transport must select this instance before
 * passing input, and close it when the corresponding client session ends.
 */
export class NativeBrokerSession {
 private readonly identity:Readonly<NativeSessionIdentity>;
 private readonly controller=new AbortController();
 constructor(identity:NativeSessionIdentity,private broker:NativeToolBroker){
  for(const value of [identity.taskId,identity.operationId,identity.sessionId])
   if(typeof value!=='string'||!value||value.length>256)throw Error('Invalid host session identity');
  this.identity=Object.freeze({...identity});
 }
 close(){this.controller.abort();}
 async dispatch(payload:unknown){
  if(this.controller.signal.aborted)throw Error('Native client session closed');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid native dispatch');
  const value=payload as Record<string,unknown>;
  const keys=Object.keys(value);
  if(keys.length!==4||keys.some(key=>!['approvalId','callId','tool','input'].includes(key)))throw Error('Native dispatch cannot supply session identity');
  if(typeof value.approvalId!=='string'||typeof value.callId!=='string'||typeof value.tool!=='string'||!value.input||typeof value.input!=='object'||Array.isArray(value.input))throw Error('Invalid native dispatch');
  const request:NativeToolRequest={...this.identity,callId:value.callId,tool:value.tool,input:value.input as Record<string,unknown>};
  return this.broker.dispatch(value.approvalId,request,this.controller.signal);
 }
}
