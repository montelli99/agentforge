/** Natural expiry only: never edits credentials or substitutes the clock. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ChatGPTSetup} from '../src/server/chatgptSetup.js';
import {DirectTokenStore} from '../src/providers/models/chatgptDirectTokenStore.js';
import {WindowsDirectCredentialBackend} from '../src/providers/models/windowsDirectCredentialBackend.js';

const [root,actor,model,output,...extra]=process.argv.slice(2);
if(!root||!path.isAbsolute(root)||!actor||!model||!output||!path.isAbsolute(output)||extra.length)throw Error('Explicit dedicated profile, actor, model and new evidence path required');
const profile=await fs.realpath(root);
const destination=await fs.open(output,'wx',0o600);
const setup=new ChatGPTSetup(profile);
const proof={passed:false,stage:'inspect',naturalExpiryObserved:false,renewedCredentialPersisted:false,sameAccount:false,inferenceRequests:0,responseVerified:false,scope:'Restore after actual saved access-token expiry, persisted renewal for the same account, and one live response. Does not prove expiry during an active task or another platform.'};
const originalFetch=globalThis.fetch;
try{
 const state=await setup.status(actor);assert.equal(state.accounts.length,1);
 const directory=path.join(profile,createHash('sha256').update(actor).digest('hex'),state.accounts[0].id,'chatgpt-direct');
 const metadata=JSON.parse(await fs.readFile(path.join(directory,'account.json'),'utf8'));
 const store=new DirectTokenStore(new WindowsDirectCredentialBackend(directory));
 const before=await store.read(metadata.clientId,metadata.subject);assert(before&&!before.renewalPending);
 // Fail before any restore/network activity if the natural-expiry prerequisite is absent.
 assert(before.expiresAt<=Date.now(),'Token has not naturally expired');proof.naturalExpiryObserved=true;
 proof.stage='restore';
 const restored=await setup.restore(actor,state.accounts[0].id);
 const after=await store.read(metadata.clientId,metadata.subject);assert(after&&!after.renewalPending);
 assert.equal(after.subject,before.subject);assert.equal(after.clientId,before.clientId);proof.sameAccount=true;
 assert(after.expiresAt>Date.now()&&after.expiresAt>before.expiresAt);proof.renewedCredentialPersisted=true;
 const provider=(await setup.activate(actor,restored.id,model)).provider;
 globalThis.fetch=async(...args)=>{
  const url=new URL(args[0] instanceof Request?args[0].url:String(args[0]));
  if(url.pathname.endsWith('/responses')){proof.inferenceRequests++;assert(proof.inferenceRequests<=1);}
  return originalFetch(...args);
 };
 proof.stage='inference';
 const result=await provider.generate({model,messages:[{role:'user',content:'Reply with exactly RENEWED.'}],signal:AbortSignal.timeout(60000)});
 assert.equal(result.content.trim(),'RENEWED');assert.equal(result.toolCalls?.length??0,0);assert.equal(proof.inferenceRequests,1);
 proof.responseVerified=true;proof.passed=true;proof.stage='complete';
}catch{process.exitCode=1;}
finally{
 globalThis.fetch=originalFetch;await setup.shutdown();
 try{await destination.writeFile(JSON.stringify(proof,null,2)+'\n');}finally{await destination.close();}
 console.log(JSON.stringify(proof));
}
