import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {prepareChatGPTSignIn,type DirectSignInSession} from '../providers/models/chatgptDirectSignIn.js';
import {FileChatGPTDirectRegistrationStore} from '../providers/models/chatgptDirectRegistrationStore.js';
import {WindowsDirectCredentialBackend} from '../providers/models/windowsDirectCredentialBackend.js';
import {DirectTokenStore} from '../providers/models/chatgptDirectTokenStore.js';
import {exchangeDirectCallback} from '../providers/models/chatgptDirectExchange.js';
import {loadVerifiedSignInRuntime,createIsolatedIdentityVerifier,createIsolatedTokenTransport,createIsolatedCatalogTransport,renewStoredChatGPTSession} from '../providers/models/chatgptDirectSignInRuntime.js';
import {ChatGPTActiveConnection} from '../providers/models/chatgptActiveConnection.js';
import type {ConversationConfiguration} from './conversationRuntime.js';

type Attempt={id:string;accountId:string;state:'waiting'|'verifying'|'ready'|'failed'|'cancelled';models:string[];session?:DirectSignInSession;abort:AbortController;connection?:ChatGPTActiveConnection};
const accountPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
/** Authenticated web handlers own authorization; actor-scoped storage owns account separation. */
export class ChatGPTSetup {
 private attempts=new Map<string,Attempt>();
 private starting=new Set<string>();
 private verifierDirectory=fileURLToPath(new URL('../providers/models/assets',import.meta.url));
 constructor(private root:string){}
 private actorRoot(actor:string){if(!actor||actor.length>512)throw Error('Invalid account owner');return path.join(this.root,createHash('sha256').update(actor).digest('hex'));}
 private accountRoot(actor:string,id:string){if(!accountPattern.test(id))throw Error('Invalid saved account');return path.join(this.actorRoot(actor),id,'chatgpt-direct');}
 private store(directory:string){return new DirectTokenStore(new WindowsDirectCredentialBackend(directory));}
 private async metadata(directory:string):Promise<{clientId:string;subject:string}|undefined>{
  const file=path.join(directory,'account.json');
  try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096)throw Error('Invalid saved account');const value=JSON.parse(await fs.readFile(file,'utf8'));if(typeof value.clientId!=='string'||typeof value.subject!=='string'||!value.subject||value.subject.length>256)throw Error('Invalid saved account');return value;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error;}
 }
 async status(actor:string){
  const attempt=this.attempts.get(actor);
  if(process.platform!=='win32')return {supported:false,accounts:[],attempt:null};
  const root=this.actorRoot(actor),accounts:Array<{id:string;label:string}>=[];
  // Validate the private path before reading any account metadata.
  await this.store(path.join(root,'probe','chatgpt-direct')).read('probe','probe');
  let names:string[]=[];try{names=await fs.readdir(root);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  for(const id of names.filter(name=>accountPattern.test(name)).slice(0,20)){
   const directory=this.accountRoot(actor,id);await this.store(directory).read('probe','probe');
   const registration=await new FileChatGPTDirectRegistrationStore(directory).load();
   if(registration)accounts.push({id,label:'ChatGPT account '+id.slice(0,8)});
  }
  return {supported:true,accounts,attempt:attempt?{id:attempt.id,accountId:attempt.accountId,state:attempt.state,models:[...attempt.models]}:null};
 }
 async begin(actor:string,existingId?:string){
  if(this.starting.has(actor)||['waiting','verifying'].includes(this.attempts.get(actor)?.state??''))throw Error('Sign-in already in progress');
  this.starting.add(actor);
  try{
   const status=await this.status(actor);if(!status.supported)throw Error('Protected subscription sign-in is currently available on Windows');
   if(existingId&&!status.accounts.some(account=>account.id===existingId))throw Error('Saved account not found');
   if(!existingId&&status.accounts.length>=20)throw Error('Account limit reached');
   const accountId=existingId??randomUUID(),directory=this.accountRoot(actor,accountId),store=this.store(directory);
   await store.read('probe','probe');
   const registration=new FileChatGPTDirectRegistrationStore(directory);
   const saved=await registration.load(),host=saved??await registration.prepareFirstRegistration();
   const metadata=await this.metadata(directory);
   if(metadata&&metadata.clientId!==saved?.clientId)throw Error('Saved account mismatch');
   const previous=metadata?await store.read(metadata.clientId,metadata.subject):undefined;
   const factory=await loadVerifiedSignInRuntime(this.verifierDirectory);
   const session=await prepareChatGPTSignIn({hostId:host.hostId,clientId:saved?.clientId,selectedSubject:metadata?.subject,idTokenHint:previous?.idToken});
   const attempt:Attempt={id:randomUUID(),accountId,state:'waiting',models:[],session,abort:new AbortController()};
   this.attempts.set(actor,attempt);
   void (async()=>{
    let exchanged:Awaited<ReturnType<typeof exchangeDirectCallback>>|undefined;
    try{
     const callback=await session.waitForCallback();attempt.state='verifying';attempt.abort.signal.throwIfAborted();
     if(!saved?.clientId)await registration.saveIssuedClientId(host.hostId,callback.clientId,attempt.abort.signal);
     const signal=AbortSignal.any([attempt.abort.signal,AbortSignal.timeout(30000)]);
     const verifier=await createIsolatedIdentityVerifier(factory,callback,signal);
     exchanged=await exchangeDirectCallback(callback,createIsolatedTokenTransport(signal),verifier,randomUUID());
     signal.throwIfAborted();await store.replace(exchanged.credentials);
     if(!metadata)await fs.writeFile(path.join(directory,'account.json'),JSON.stringify({clientId:exchanged.credentials.clientId,subject:exchanged.credentials.subject}),{flag:'wx',mode:0o600});
     signal.throwIfAborted();
     const credentials=exchanged.credentials;
     const connection=new ChatGPTActiveConnection(credentials,{
      renew:()=>renewStoredChatGPTSession(store,credentials.clientId,credentials.subject,this.verifierDirectory),
      catalog:(token,abort)=>createIsolatedCatalogTransport(abort).list(token),
     });
     const models=await connection.listModels();
     if(attempt.abort.signal.aborted){connection.deactivate();throw Error('Cancelled');}
     attempt.connection=connection;attempt.models=models;attempt.state='ready';
    }catch{attempt.state=attempt.abort.signal.aborted?'cancelled':'failed';}
    finally{exchanged?.discard();await session.cancel().catch(()=>{});}
   })();
   return {id:attempt.id,authorizationUrl:session.authorizationUrl};
  }finally{this.starting.delete(actor);}
 }
 async cancel(actor:string){const attempt=this.attempts.get(actor);if(!attempt)return;attempt.abort.abort();await attempt.session?.cancel();if(attempt.state!=='ready')attempt.state='cancelled';}
 async shutdown(){await Promise.all([...this.attempts.values()].map(async attempt=>{attempt.abort.abort();attempt.connection?.deactivate();await attempt.session?.cancel().catch(()=>{});}));this.attempts.clear();}
 async restore(actor:string,accountId:string){
  if(this.starting.has(actor)||['waiting','verifying'].includes(this.attempts.get(actor)?.state??''))throw Error('Account setup already in progress');
  this.starting.add(actor);
  let attempt:Attempt|undefined;
  try{
   const status=await this.status(actor);
   if(!status.supported||!status.accounts.some(account=>account.id===accountId))throw Error('Saved account not found');
   const directory=this.accountRoot(actor,accountId),store=this.store(directory);
   const metadata=await this.metadata(directory),registration=await new FileChatGPTDirectRegistrationStore(directory).load();
   if(!metadata||metadata.clientId!==registration?.clientId)throw Error('Saved account mismatch');
   const credentials=await store.read(metadata.clientId,metadata.subject);
   if(!credentials||credentials.renewalPending)throw Error('Fresh sign-in required');
   attempt={id:randomUUID(),accountId,state:'verifying',models:[],abort:new AbortController()};
   this.attempts.set(actor,attempt);
   const signal=attempt.abort.signal;
   const connection=new ChatGPTActiveConnection(credentials,{
    renew:()=>renewStoredChatGPTSession(store,metadata.clientId,metadata.subject,this.verifierDirectory,signal),
    catalog:(token,abort)=>createIsolatedCatalogTransport(AbortSignal.any([signal,abort])).list(token),
   });
   attempt.connection=connection;
   attempt.models=await connection.listModels();signal.throwIfAborted();attempt.state='ready';
   return {id:attempt.id,models:[...attempt.models]};
  }catch{if(attempt){attempt.connection?.deactivate();attempt.state=attempt.abort.signal.aborted?'cancelled':'failed';}throw Error('Saved account could not be restored; sign in again');}
  finally{this.starting.delete(actor);}
 }
 async activate(actor:string,id:string,model:string):Promise<ConversationConfiguration>{
  const attempt=this.attempts.get(actor);
  if(!attempt||attempt.id!==id||attempt.state!=='ready'||!attempt.connection||!attempt.models.includes(model))throw Error('Complete sign-in and select an available model');
  const models=await attempt.connection.listModels();if(!models.includes(model))throw Error('Selected model is no longer available');
  return {provider:attempt.connection,models:[model],connections:[{model,connection:'ChatGPT account '+attempt.accountId.slice(0,8),billing:'ChatGPT plan usage',status:'connected'}]};
 }
}
