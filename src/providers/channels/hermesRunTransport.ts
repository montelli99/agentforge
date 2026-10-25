/** Experimental Hermes Runs adapter. Register only after explicit configuration.
 * The caller owns durable approval/receipts; this adapter never retries effects.
 */
export class HermesRunTransport {
  private readonly origin:string;
  constructor(url:string,private readonly token:string){
    const parsed=new URL(url);
    if(parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/'||
      (parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&['127.0.0.1','[::1]'].includes(parsed.hostname))))throw Error('Use HTTPS or literal loopback HTTP for Hermes');
    if(!token.trim()||/[\r\n]/.test(token))throw Error('Hermes API credential is required');
    this.origin=parsed.origin;
  }
  private identifier(value:string){if(!value.trim()||value.length>512||/[\u0000-\u001f\u007f]/.test(value))throw Error('Invalid Hermes identifier');return encodeURIComponent(value);}
  private async request(route:string,method='GET',body?:unknown,key?:string):Promise<Record<string,unknown>>{
    let response:Response;
    try{response=await fetch(this.origin+route,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
    catch{throw Error('Hermes request interrupted; do not automatically retry a submission');}
    if(!response.ok)throw Error('Hermes request rejected ('+response.status+'); inspect the saved operation before retrying');
    let result:unknown;
    try {result=await response.json();} catch {throw Error('Invalid Hermes response; operation outcome may be uncertain');}
    if(!result||typeof result!=='object'||Array.isArray(result))throw Error('Invalid Hermes response');
    return result as Record<string,unknown>;
  }
  async submitSessionTurn(sessionKey:string,message:string,requestId:string):Promise<{runId:string}>{
    this.identifier(sessionKey);
    if(!message.trim()||message.length>32000||! /^[a-zA-Z0-9_-]{8,128}$/.test(requestId))throw Error('Invalid Hermes submission');
    const result=await this.request('/v1/runs','POST',{input:message,session_id:sessionKey},requestId);
    if(typeof result.run_id!=='string')throw Error('Hermes run receipt missing; submission uncertain');
    this.identifier(result.run_id);return {runId:result.run_id};
  }
  async inspectRun(runId:string):Promise<{runId:string;status:string}>{
    const result=await this.request('/v1/runs/'+this.identifier(runId));
    if(result.run_id!==runId||typeof result.status!=='string'||!result.status.trim()||result.status.length>128)throw Error('Mismatched or invalid Hermes run observation');
    return {runId,status:result.status};
  }
  async requestRunStop(_sessionKey:string,runId:string):Promise<{acknowledged:boolean}>{
    const result=await this.request('/v1/runs/'+this.identifier(runId)+'/stop','POST',{});
    // Acknowledged means requested, not that executor work has stopped.
    return {acknowledged:result.status==='stopping'};
  }
}
