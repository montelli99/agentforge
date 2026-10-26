/** Explicitly disconnects the dedicated acceptance account; never logs credentials. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ChatGPTSetup} from '../src/server/chatgptSetup.js';
import {DirectTokenStore} from '../src/providers/models/chatgptDirectTokenStore.js';
import {WindowsDirectCredentialBackend} from '../src/providers/models/windowsDirectCredentialBackend.js';

const [root,actor,model,output,...extra]=process.argv.slice(2);
if(process.env.AGENTFORGE_ACCEPTANCE_SIGNOUT!=='1'||!root||!path.isAbsolute(root)||!actor||!model||!output||!path.isAbsolute(output)||extra.length)throw Error('Explicit sign-out opt-in, dedicated profile, actor, model and new evidence path required');
const profile=await fs.realpath(root);
const destination=await fs.open(output,'wx',0o600);
const setup=new ChatGPTSetup(profile);
const reopened=new ChatGPTSetup(profile);
const originalFetch=globalThis.fetch;
const proof={passed:false,stage:'restore',localCleared:false,remoteRevocation:'not-attempted',activeProviderRefused:false,freshRestoreRefused:false,credentialAbsent:false,registrationRetained:false,postSignoutRequests:0,scope:'Dedicated Windows account sign-out, local credential removal, stale provider rejection and fresh setup restore rejection. Remote revocation is reported separately; no inference or browser journey.'};
try{
 const state=await setup.status(actor);assert.equal(state.accounts.length,1);
 const account=state.accounts[0]!;
 const directory=path.join(profile,createHash('sha256').update(actor).digest('hex'),account.id,'chatgpt-direct');
 const metadata=JSON.parse(await fs.readFile(path.join(directory,'account.json'),'utf8'));
 const restored=await setup.restore(actor,account.id);
 const provider=(await setup.activate(actor,restored.id,model)).provider;
 proof.stage='signout';
 const result=await setup.signOut(actor,account.id,async(providers,remove)=>{
  assert(providers.includes(provider as typeof providers[number]));
  return remove();
 });
 proof.localCleared=result.localCleared;proof.remoteRevocation=result.remoteRevocation;
 assert(result.localCleared);
 proof.stage='verify-local';
 const token=await new DirectTokenStore(new WindowsDirectCredentialBackend(directory)).read(metadata.clientId,metadata.subject);
 assert.equal(token,undefined);proof.credentialAbsent=true;
 // No request should escape after disconnection, including a stale reference.
 globalThis.fetch=async()=>{proof.postSignoutRequests++;throw Error('Network forbidden after sign-out');};
 await assert.rejects(()=>provider.generate({model,messages:[{role:'user',content:'Reply with TEST.'}],signal:AbortSignal.timeout(5000)}));
 proof.activeProviderRefused=true;
 await assert.rejects(()=>reopened.restore(actor,account.id));proof.freshRestoreRefused=true;
 const after=await reopened.status(actor);
 assert(after.accounts.some(item=>item.id===account.id));proof.registrationRetained=true;
 assert.equal(proof.postSignoutRequests,0);
 proof.passed=true;proof.stage='complete';
}catch{process.exitCode=1;}
finally{
 globalThis.fetch=originalFetch;
 await setup.shutdown();await reopened.shutdown();
 try{await destination.writeFile(JSON.stringify(proof,null,2)+'\n');}finally{await destination.close();}
 console.log(JSON.stringify(proof));
}
