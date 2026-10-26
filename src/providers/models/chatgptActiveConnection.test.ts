import {describe,it,expect,vi} from 'vitest';
import {ChatGPTActiveConnection} from './chatgptActiveConnection.js';
import type {DirectCredentials} from './chatgptDirectOAuth.js';
const credentials=():DirectCredentials=>({clientId:'synthetic-client',subject:'synthetic-subject',issuer:'https://auth.openai.com',resource:'https://api.openai.com/v1',tokenType:'Bearer',accessToken:'synthetic-access',refreshToken:'synthetic-refresh',idToken:'synthetic-id',scopes:['resource.invoke','chatgpt.tokens.use.direct'],expiresAt:Date.now()+10000});
const catalog=async()=>({models:[{slug:'synthetic-model',display_name:'Synthetic',visibility:'list'}]});
describe('active subscription connection',()=>{
 it('shares renewal across concurrent callers and uses only the renewed credential',async()=>{
  const original=credentials();let finish!:(value:DirectCredentials)=>void;
  const renew=vi.fn(()=>new Promise<DirectCredentials>(resolve=>{finish=resolve;}));const list=vi.fn(catalog);
  const request=vi.fn<typeof fetch>(async(_url,init)=>{expect(init?.headers).toMatchObject({Authorization:'Bearer replacement-access'});return new Response('data: '+JSON.stringify({type:'response.completed',response:{id:'synthetic-response',status:'completed',output:[]}})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});});
  const connection=new ChatGPTActiveConnection(original,{renew,catalog:list,request});
  const first=connection.listModels(),second=connection.listModels();expect(renew).toHaveBeenCalledTimes(1);expect(list).not.toHaveBeenCalled();
  finish({...original,accessToken:'replacement-access',expiresAt:Date.now()+3600000});
  expect(await first).toEqual(['synthetic-model']);expect(await second).toEqual(['synthetic-model']);expect(list).toHaveBeenCalledTimes(1);
  await connection.generate({model:'synthetic-model',messages:[{role:'user',content:'Synthetic'}]});expect(request).toHaveBeenCalledTimes(1);expect(renew).toHaveBeenCalledTimes(1);
 });
 it('never reactivates a connection deactivated during renewal',async()=>{
  const original=credentials();let finish!:(value:DirectCredentials)=>void;
  const connection=new ChatGPTActiveConnection(original,{renew:()=>new Promise(resolve=>{finish=resolve;}),catalog});
  const pending=connection.listModels();connection.deactivate();finish({...original,expiresAt:Date.now()+3600000});
  await expect(pending).rejects.toThrow('could not be prepared');expect(await connection.isAvailable()).toBe(false);
  let entered!:()=>void;
  const started=new Promise<void>(resolve=>{entered=resolve;});
  let observed:AbortSignal|undefined;
  const request=vi.fn<typeof fetch>(async(_url,init)=>{
    observed=init?.signal??undefined;entered();
    return new Promise((_resolve,reject)=>{
      observed!.addEventListener('abort',()=>reject(Error('synthetic cancelled request')),{once:true});
    });
  });
  const active=new ChatGPTActiveConnection({...original,expiresAt:Date.now()+3600000},{renew:vi.fn(),catalog,request});
  const running=active.generate({model:'synthetic-model',messages:[{role:'user',content:'Synthetic'}]});
  const rejected=expect(running).rejects.toThrow();
  await started;active.deactivate();await rejected;
  expect(observed?.aborted).toBe(true);expect(request).toHaveBeenCalledTimes(1);
 });
 it('rejects swapped accounts and unavailable model catalogs before inference',async()=>{
  const original=credentials(),request=vi.fn<typeof fetch>();
  for(const replacement of [{...original,subject:'other'},{...original,renewalPending:true},{...original,scopes:[]}]){
   const connection=new ChatGPTActiveConnection(original,{renew:async()=>replacement,catalog,request});
   await expect(connection.generate({model:'synthetic-model',messages:[{role:'user',content:'Synthetic'}]})).rejects.toThrow('could not be prepared');
  }
  const empty=new ChatGPTActiveConnection({...original,expiresAt:Date.now()+3600000},{renew:vi.fn(),catalog:async()=>({models:[]}),request});
  expect(await empty.isAvailable()).toBe(false);expect(request).not.toHaveBeenCalled();
 });
});

it('does not send inference after cancellation while the catalog is pending',async()=>{
 const original={...credentials(),expiresAt:Date.now()+3600000};
 let release!:(value:unknown)=>void,entered!:()=>void;
 const started=new Promise<void>(resolve=>{entered=resolve;});
 const request=vi.fn<typeof fetch>();
 const connection=new ChatGPTActiveConnection(original,{renew:vi.fn(),request,catalog:()=>{entered();return new Promise(resolve=>{release=resolve;});}});
 const controller=new AbortController();
 const pending=connection.generate({model:'synthetic-model',messages:[{role:'user',content:'Synthetic'}],signal:controller.signal});
 const rejected=expect(pending).rejects.toThrow();
 await started;controller.abort();release(await catalog());await rejected;
 expect(request).not.toHaveBeenCalled();
 expect(await connection.listModels()).toEqual(['synthetic-model']);
});

it('retains a usable connection after an interrupted response without replaying inference',async()=>{
 const original={...credentials(),expiresAt:Date.now()+3600000};
 let calls=0;
 const request=vi.fn<typeof fetch>(async()=>{
  calls++;
  if(calls===1)return new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:'unfinished'})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
  return new Response('data: '+JSON.stringify({type:'response.completed',response:{id:'synthetic-response',status:'completed',output:[]}})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
 });
 const connection=new ChatGPTActiveConnection(original,{renew:vi.fn(),catalog,request});
 const options={model:'synthetic-model',messages:[{role:'user' as const,content:'Synthetic'}]};
 await expect(connection.generate(options)).rejects.toThrow('without response.completed');
 expect(request).toHaveBeenCalledTimes(1);
 await connection.generate(options);
 expect(request).toHaveBeenCalledTimes(2);
});
