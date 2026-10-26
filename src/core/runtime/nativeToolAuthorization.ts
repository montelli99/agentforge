import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export interface NativeToolRequest {taskId:string;operationId:string;sessionId:string;callId:string;tool:string;input:Record<string,unknown>}
function digest(request:NativeToolRequest){
 for(const value of [request.taskId,request.operationId,request.sessionId,request.callId,request.tool])if(typeof value!=='string'||!value||value.length>256)throw Error('Invalid native tool identity');
 if(!request.input||typeof request.input!=='object'||Array.isArray(request.input))throw Error('Invalid tool input');
 const serialized=JSON.stringify(request,(_key,value:unknown)=>{if(value===undefined||typeof value==='function'||typeof value==='symbol'||typeof value==='number'&&!Number.isFinite(value))throw Error('Non-JSON tool input');return value;});if(Buffer.byteLength(serialized)>65536)throw Error('Native tool request too large');
 return createHash('sha256').update(serialized).digest('hex');
}
/** Internal host service only. Never mount this directory into a client workspace.
 * A consumed receipt means permission was issued, not that the effect completed.
 */
export class NativeToolAuthorization {
 constructor(private directory:string,private worktree:string){if(!path.isAbsolute(directory)||!path.isAbsolute(worktree))throw Error('Absolute authorization paths required');}
 private async placement(){
  const lexical=path.relative(this.worktree,this.directory);if(!lexical||(!lexical.startsWith('..'+path.sep)&&lexical!=='..'&&!path.isAbsolute(lexical)))throw Error('Authorization directory must be outside client worktree');
  await fs.mkdir(this.directory,{recursive:true,mode:0o700});
  const [root,dir]=await Promise.all([fs.realpath(this.worktree),fs.realpath(this.directory)]);
  const relative=path.relative(root,dir);if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Authorization directory must be outside client worktree');
 }
 private file(id:string){if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('Invalid approval identity');return path.join(this.directory,id+'.json');}
 private async record(file:string):Promise<Record<string,unknown>|null>{
  let stat;try{stat=await fs.lstat(file);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096)throw Error('Invalid authorization record');
  const value:unknown=JSON.parse(await fs.readFile(file,'utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid authorization record');return value as Record<string,unknown>;
 }
 /** Inspection never grants permission. Corrupt/partial receipts fail closed. */
 async inspect(id:string,request:NativeToolRequest){
  const requestHash=digest(request);await this.placement();const file=this.file(id);
  const approval=await this.record(file);if(!approval||approval.version!==1||approval.requestHash!==requestHash)throw Error('Approval missing or bound to another request');
  const claim=await this.record(file+'.consumed');const observed=await this.record(file+'.observed');
  if(!claim){if(observed)throw Error('Observation without claim');return {state:'unused' as const,requestHash};}
  if(claim.requestHash!==requestHash||claim.effectStatus!=='unconfirmed'||typeof claim.claimedAt!=='string'||!Number.isFinite(Date.parse(claim.claimedAt)))throw Error('Invalid claim receipt');
  if(!observed)return {state:'unconfirmed' as const,requestHash};
  if(observed.requestHash!==requestHash||typeof observed.evidenceSha256!=='string'||! /^[a-f0-9]{64}$/.test(observed.evidenceSha256))throw Error('Invalid observation receipt');
  return {state:'observed' as const,requestHash,evidenceSha256:observed.evidenceSha256};
 }
 /** Host records independently collected evidence; observation is not task acceptance. */
 async observe(id:string,request:NativeToolRequest,evidenceSha256:string){
  if(!/^[a-f0-9]{64}$/.test(evidenceSha256))throw Error('Invalid evidence hash');
  const state=await this.inspect(id,request);if(state.state!=='unconfirmed')throw Error('Unconfirmed claim required');
  const handle=await fs.open(this.file(id)+'.observed','wx',0o600);
  try{await handle.writeFile(JSON.stringify({requestHash:state.requestHash,evidenceSha256,observedAt:new Date().toISOString()}));await handle.sync();}finally{await handle.close();}
 }
 async approve(id:string,request:NativeToolRequest,approver:string,expiresAt:number){
  if(typeof approver!=='string'||!approver.trim()||approver.length>256||!Number.isSafeInteger(expiresAt)||expiresAt<=Date.now())throw Error('Valid approver and future expiration required');
  const requestHash=digest(request);await this.placement();
  const handle=await fs.open(this.file(id),'wx',0o600);
  try{await handle.writeFile(JSON.stringify({version:1,requestHash,approver,expiresAt}));await handle.sync();}finally{await handle.close();}
 }
 async consume(id:string,request:NativeToolRequest){
  const requestHash=digest(request);await this.placement();const file=this.file(id);
  const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096)throw Error('Invalid authorization record');
  const approval=JSON.parse(await fs.readFile(file,'utf8'));
  if(approval.version!==1||approval.requestHash!==requestHash||typeof approval.approver!=='string'||!approval.approver.trim()||!Number.isSafeInteger(approval.expiresAt)||approval.expiresAt<=Date.now())throw Error('Approval missing, expired or bound to another request');
  // The exclusive claim survives process death. Never retry a claimed effect.
  const handle=await fs.open(file+'.consumed','wx',0o600);
  try{if(approval.expiresAt<=Date.now())throw Error('Approval expired before claim');await handle.writeFile(JSON.stringify({requestHash,claimedAt:new Date().toISOString(),effectStatus:'unconfirmed'}));await handle.sync();}finally{await handle.close();}
  return {approvalId:id,requestHash,effectStatus:'unconfirmed' as const};
 }
}
