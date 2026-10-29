import type {DirectCredentials,IdentityTokenVerifier} from './chatgptDirectOAuth.js';
import {validateDirectRefreshResponse} from './chatgptDirectOAuth.js';
import {DirectTokenStore} from './chatgptDirectTokenStore.js';

/** Renew only under the same OS lock used by sign-in, reads and sign-out writes.
 * Persist intent before sending: a crash or uncertain response requires OAuth,
 * rather than reusing a possibly consumed rotating refresh token. */
export async function renewDirectSession(store:DirectTokenStore,clientId:string,subject:string,options:{
  refresh:(clientId:string,refreshToken:string,signal:AbortSignal)=>Promise<unknown>;
  verifier:IdentityTokenVerifier|((previous:DirectCredentials,signal:AbortSignal)=>Promise<IdentityTokenVerifier>);
  signal?:AbortSignal;
  now?:()=>number;
  /** Explicit account renewal; ordinary requests retain expiry-based refresh. */
  force?:boolean;
}):Promise<DirectCredentials>{
  const now=options.now??Date.now;
  const signal=AbortSignal.any([AbortSignal.timeout(30000),...(options.signal?[options.signal]:[])]);
  return store.transaction(clientId,subject,async record=>{
    signal.throwIfAborted();
    const current=await record.read();
    if(!current||current.renewalPending||!current.refreshToken||!Number.isFinite(current.expiresAt))throw Error('Subscription sign-in required');
    if(!options.force&&current.expiresAt>now()+60000)return current;
    await record.replace({...current,renewalPending:true});
    let abort:()=>void=()=>{};
    try{
      signal.throwIfAborted();
      const interrupted=new Promise<never>((_,reject)=>{abort=()=>reject(Error('interrupted'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
      const renewal=(async()=>{
        const response=await options.refresh(clientId,current.refreshToken!,signal);
        const verifier=typeof options.verifier==='function'?await options.verifier(current,signal):options.verifier;
        return validateDirectRefreshResponse(current,response,verifier,now);
      })();
      const replacement=await Promise.race([renewal,interrupted]);
      signal.throwIfAborted();
      delete replacement.renewalPending;
      await record.replace(replacement);
      return replacement;
    }catch{
      // Leave the durable pending marker intact, including when persistence fails.
      throw Error('Subscription renewal was not confirmed; sign in again');
    }finally{signal.removeEventListener('abort',abort);}
  });
}
