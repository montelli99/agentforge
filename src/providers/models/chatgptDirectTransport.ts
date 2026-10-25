import type {AuthorizedResponsesTransport,DirectGrant} from './chatgptDirectModel.js';
import type {DirectCredentials} from './chatgptDirectOAuth.js';

/** Uses only the caller's explicitly validated session; never discovers credentials. */
export class DirectResponsesTransport implements AuthorizedResponsesTransport {
  constructor(private credentials:(grant:DirectGrant)=>{credentials:DirectCredentials;grantId:string}|undefined,private request:typeof fetch=fetch){}
  async *open(input:Parameters<AuthorizedResponsesTransport['open']>[0]):AsyncIterable<unknown>{
    const session=this.credentials(input.grant),token=session?.credentials,now=Date.now();
    if(input.url!=='https://api.openai.com/v1/responses'||!token||session?.grantId!==input.grant.grantId||token.subject!==input.grant.accountId
      ||token.resource!==input.grant.resource||token.issuer!=='https://auth.openai.com'||token.tokenType!=='Bearer'
      ||token.renewalPending||!token.accessToken||token.expiresAt<=now||input.grant.expiresAt<=now
      ||!['resource.invoke','chatgpt.tokens.use.direct'].every(s=>token.scopes.includes(s)&&input.grant.scopes.includes(s)))throw Error('Authorized subscription session unavailable');
    input.signal.throwIfAborted();
    let response:Response;
    try{response=await this.request(input.url,{method:'POST',headers:{Authorization:'Bearer '+token.accessToken,'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify(input.body),redirect:'error',signal:input.signal});}
    catch{throw Error('Subscription request failed; no retry was attempted');}
    if(!response.ok||!response.body||!/^text\/event-stream\b/i.test(response.headers.get('content-type')??'')){
      await response.body?.cancel().catch(()=>undefined);throw Error('Subscription response rejected; reconnect or inspect account access');
    }
    const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let pending='',data:string[]=[],bytes=0;
    try{
      while(true){
        input.signal.throwIfAborted();const chunk=await reader.read();if(chunk.done)break;
        bytes+=chunk.value.byteLength;if(bytes>2*1024*1024)throw Error('Subscription stream exceeded size limit');
        pending+=decoder.decode(chunk.value,{stream:true});
        let newline:number;
        while((newline=pending.indexOf('\n'))>=0){
          const line=pending.slice(0,newline).replace(/\r$/,'');pending=pending.slice(newline+1);
          if(line===''){
            if(data.length){const value=data.join('\n');data=[];if(value!=='[DONE]'){let parsed:unknown;try{parsed=JSON.parse(value);}catch{throw Error('Malformed subscription event');}yield parsed;}}
          }else if(line.startsWith('data:'))data.push(line.slice(5).replace(/^ /,''));
          if(data.reduce((n,s)=>n+s.length,0)>131072)throw Error('Subscription event exceeded size limit');
        }
        if(pending.length>131072)throw Error('Subscription event exceeded size limit');
      }
      pending+=decoder.decode();
      if(pending.trim()||data.length)throw Error('Incomplete subscription event');
    }finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
  }
}
