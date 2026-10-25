import {setTimeout as delay} from 'node:timers/promises';
import type {DirectTokenStore} from './chatgptDirectTokenStore.js';

const discovery='https://auth.openai.com/.well-known/openid-configuration';
/** Caller must stop account requests before entry. Keep registration metadata;
 * serialize revocation and removal against refresh of the same token record. */
export async function signOutDirectSession(store:DirectTokenStore,clientId:string,subject:string,request:typeof fetch=fetch){
 return store.transaction(clientId,subject,async record=>{
  let confirmed=false;
  const signal=AbortSignal.timeout(12000);
  try{
   const credentials=await record.read();
   if(!credentials)return {localCleared:true,remoteRevocation:'no-local-session' as const};
   if(credentials.refreshToken){
    const response=await request(discovery,{signal,redirect:'error',headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('Discovery unavailable');
    // Bound discovery before parsing; never trust an arbitrary token destination.
    const reader=response.body?.getReader();if(!reader)throw Error('Discovery unavailable');
    let size=0;const chunks:Uint8Array[]=[];
    try{for(;;){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>65536)throw Error('Discovery too large');chunks.push(item.value);}}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    const metadata=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(metadata.issuer!=='https://auth.openai.com'||typeof metadata.revocation_endpoint!=='string')throw Error('Invalid discovery');
    const endpoint=new URL(metadata.revocation_endpoint);
    if(endpoint.origin!=='https://auth.openai.com'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw Error('Invalid revocation endpoint');
    for(let attempt=0;attempt<2;attempt++){
     try{
      const result=await request(endpoint.href,{method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:credentials.refreshToken,token_type_hint:'refresh_token',client_id:clientId})});
      await result.body?.cancel();
      if(result.status===200){confirmed=true;break;}
      if(result.status<500)break;
     }catch{if(signal.aborted)break;}
     if(attempt===0)await delay(300,undefined,{signal});
    }
   }
  }catch{/* No remote error text or token material is exposed. */}
  finally{await record.remove();}
  return {localCleared:true,remoteRevocation:confirmed?'confirmed' as const:'unconfirmed' as const};
 });
}
