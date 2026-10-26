import {createHash} from 'node:crypto';
import {NativeToolAuthorization,type NativeToolRequest} from './nativeToolAuthorization.js';

/** Trusted host boundary. The client gets dispatch, never approve or the receipt directory.
 * Executors must enforce isolation and scope themselves; this broker supplies exactly-once
 * permission issuance, not exactly-once external effects or task acceptance.
 */
export class NativeToolBroker {
 constructor(private authorization:NativeToolAuthorization,
  private execute:(request:NativeToolRequest,signal:AbortSignal)=>Promise<{evidence: string}>){ }

 async dispatch(approvalId:string,request:NativeToolRequest,signal:AbortSignal){
  if(signal.aborted)throw Error('Native tool cancelled before authorization');
  // Freeze the request crossing asynchronous approval and execution boundaries.
  const captured=structuredClone(request);
  const claim=await this.authorization.consume(approvalId,captured);
  // Cancellation after the durable claim intentionally leaves an uncertain receipt.
  if(signal.aborted)throw Error('Native tool cancelled after authorization; reconcile before retry');
  const result=await this.execute(structuredClone(captured),signal);
  if(typeof result?.evidence!=='string'||Buffer.byteLength(result.evidence)>1048576)throw Error('Invalid tool evidence; reconcile before retry');
  const evidenceSha256=createHash('sha256').update(result.evidence).digest('hex');
  await this.authorization.observe(approvalId,captured,evidenceSha256);
  return {...claim,effectStatus:'observed' as const,evidenceSha256};
 }
}
