import {randomUUID} from 'node:crypto';
import type {GenerativeModelProvider,ModelRequestOptions,ModelResponse,StreamChunk} from '../../core/providers/model.js';
import type {DirectCredentials} from './chatgptDirectOAuth.js';
import {ChatGPTDirectModel,listedDirectModelSlugs,type DirectGrant,type DirectCatalog} from './chatgptDirectModel.js';
import {DirectResponsesTransport} from './chatgptDirectTransport.js';

export interface DirectConnectionServices {
  renew():Promise<DirectCredentials>;
  catalog(accessToken:string,signal:AbortSignal):Promise<unknown>;
  request?:typeof fetch;
}
/** Owns the active grant for an explicitly signed-in account. All callers share
 * one refresh/catalog operation; stale credentials cannot authorize new calls. */
export class ChatGPTActiveConnection implements GenerativeModelProvider {
  readonly id='chatgpt-direct';readonly name='ChatGPT subscription';readonly defaultTier=2 as const;
  private credentials:DirectCredentials|undefined;
  private grant:DirectGrant|undefined;
  private catalogSnapshot:DirectCatalog|undefined;
  private preparing:Promise<void>|undefined;
  private generation=0;
  private lifetime=new AbortController();
  constructor(credentials:DirectCredentials,private services:DirectConnectionServices){
    if(credentials.renewalPending||credentials.issuer!=='https://auth.openai.com'||credentials.resource!=='https://api.openai.com/v1'||credentials.tokenType!=='Bearer'||!credentials.accessToken||!credentials.clientId||!credentials.subject||!['resource.invoke','chatgpt.tokens.use.direct'].every(scope=>credentials.scopes.includes(scope)))throw Error('Validated subscription credentials required');
    this.credentials={...credentials,scopes:[...credentials.scopes]};
  }
  /** Invalidates new requests immediately. The caller owns remote revocation and storage removal. */
  deactivate(){this.generation++;this.lifetime.abort();this.grant=undefined;this.catalogSnapshot=undefined;this.credentials=undefined;}
  private async prepare(){
    if(!this.credentials)throw Error('Subscription sign-in required');
    if(this.preparing)return this.preparing;
    if(this.grant&&this.catalogSnapshot&&this.credentials.expiresAt>Date.now()+60000&&this.catalogSnapshot.expiresAt>Date.now())return;
    const generation=this.generation,previous=this.credentials;
    this.grant=undefined;this.catalogSnapshot=undefined;
    const pending=(async()=>{
      try{
        const credentials=previous.expiresAt<=Date.now()+60000?await this.services.renew():previous;
        if(generation!==this.generation)throw Error('Subscription connection changed');
        if(credentials.clientId!==previous.clientId||credentials.subject!==previous.subject||credentials.issuer!==previous.issuer||credentials.resource!==previous.resource||credentials.renewalPending||credentials.expiresAt<=Date.now()||credentials.tokenType!=='Bearer'||!credentials.accessToken||!['resource.invoke','chatgpt.tokens.use.direct'].every(s=>credentials.scopes.includes(s)))throw Error('Subscription renewal identity mismatch');
        const response=await this.services.catalog(credentials.accessToken,AbortSignal.any([this.lifetime.signal,AbortSignal.timeout(15000)]));
        const models=listedDirectModelSlugs(response);if(!models?.length)throw Error('No selectable subscription models');
        if(generation!==this.generation)throw Error('Subscription connection changed');
        const grant:DirectGrant={accountId:credentials.subject,grantId:randomUUID(),resource:credentials.resource,scopes:[...credentials.scopes],expiresAt:credentials.expiresAt};
        this.credentials={...credentials,scopes:[...credentials.scopes]};this.grant=grant;
        this.catalogSnapshot={accountId:grant.accountId,grantId:grant.grantId,expiresAt:Math.min(grant.expiresAt,Date.now()+300000),response};
      }catch{
        if(generation===this.generation){this.grant=undefined;this.catalogSnapshot=undefined;}
        throw Error('Subscription connection could not be prepared; reconnect or inspect account access');
      }
    })();
    this.preparing=pending;
    try{await pending;}finally{if(this.preparing===pending)this.preparing=undefined;}
  }
  async isAvailable(){try{await this.prepare();return true;}catch{return false;}}
  async listModels(){await this.prepare();return listedDirectModelSlugs(this.catalogSnapshot?.response)??[];}
  private async provider(model:string,signal:AbortSignal){
    signal.throwIfAborted();
    // Cancelling one waiter must not cancel another caller's shared renewal.
    // Conversely, a stopped request must not wait for that network operation.
    await new Promise<void>((resolve,reject)=>{
      const abort=()=>{signal.removeEventListener('abort',abort);reject(signal.reason??Error('Request stopped'));};
      signal.addEventListener('abort',abort,{once:true});
      this.prepare().then(()=>{signal.removeEventListener('abort',abort);resolve();},error=>{signal.removeEventListener('abort',abort);reject(error);});
      if(signal.aborted)abort();
    });
    signal.throwIfAborted();
    return new ChatGPTDirectModel({enabled:true,model,agentTools:true},{currentGrant:()=>this.grant},()=>this.catalogSnapshot,
      new DirectResponsesTransport(grant=>this.credentials&&this.grant?.grantId===grant.grantId?{credentials:this.credentials,grantId:grant.grantId}:undefined,this.services.request));
  }
  private requestOptions(options:ModelRequestOptions):ModelRequestOptions{
    return {...options,signal:AbortSignal.any([this.lifetime.signal,...(options.signal?[options.signal]:[])])};
  }
  async generate(options:ModelRequestOptions):Promise<ModelResponse>{
    const request=this.requestOptions(options);request.signal!.throwIfAborted();
    const result=await (await this.provider(options.model,request.signal!)).generate(request);
    request.signal!.throwIfAborted();return result;
  }
  async *stream(options:ModelRequestOptions):AsyncIterable<StreamChunk>{
    const request=this.requestOptions(options);request.signal!.throwIfAborted();
    for await(const chunk of (await this.provider(options.model,request.signal!)).stream(request)){
      request.signal!.throwIfAborted();yield chunk;
    }
  }
}
