import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ChatGPTSetup} from '../src/server/chatgptSetup.js';

const [root,actor,model,output,...extra]=process.argv.slice(2);
if(!root||!path.isAbsolute(root)||!actor||!model||!output||!path.isAbsolute(output)||extra.length)throw Error('Supply explicit dedicated profile, actor, model and new evidence path');
const profile=await fs.realpath(root);
const destination=await fs.open(output,'wx',0o600);
const originalFetch=globalThis.fetch;
const abort=new AbortController();
const proof={passed:false,stage:'restore',model,inferenceRequests:0,successfulResponseHeadersSeen:false,cancelledRequestRejected:false,deliveredChunks:0,deliveredToolCalls:0,explicitRestoreSucceeded:false,scope:'Live cancellation after response headers, no delivered model actions, no automatic inference retry; explicit saved-profile restore and a new successful request. Does not prove server-side billing cancellation or wall-clock expiry.'};
let setup=new ChatGPTSetup(profile);
let cancelNext=true;
globalThis.fetch=async(...args)=>{
 const url=new URL(args[0] instanceof Request?args[0].url:String(args[0]));
 const inference=url.pathname.endsWith('/responses');
 if(inference){proof.inferenceRequests++;if(proof.inferenceRequests>2)throw Error('Acceptance request limit');}
 const response=await originalFetch(...args);
 if(inference&&cancelNext&&response.ok){cancelNext=false;proof.successfulResponseHeadersSeen=true;abort.abort();}
 return response;
};
async function connect(){
 const state=await setup.status(actor);assert.equal(state.accounts.length,1);
 const restored=await setup.restore(actor,state.accounts[0].id);
 return (await setup.activate(actor,restored.id,model)).provider;
}
try{
 const provider=await connect();proof.stage='cancel-live-request';
 try{
  for await(const chunk of provider.stream({model,messages:[{role:'user',content:'Reply with exactly CANCEL_TEST.'}],signal:AbortSignal.any([abort.signal,AbortSignal.timeout(60000)])})){
   proof.deliveredChunks++;proof.deliveredToolCalls+=chunk.toolCalls?.length??0;
  }
 }catch{proof.cancelledRequestRejected=true;}
 assert.equal(proof.successfulResponseHeadersSeen,true);
 assert.equal(proof.cancelledRequestRejected,true);
 assert.equal(proof.deliveredChunks,0);assert.equal(proof.deliveredToolCalls,0);
 assert.equal(proof.inferenceRequests,1);
 proof.stage='explicit-restore';await setup.shutdown();setup=new ChatGPTSetup(profile);
 const restored=await connect();
 const result=await restored.generate({model,messages:[{role:'user',content:'Reply with exactly RESTORED.'}],signal:AbortSignal.timeout(60000)});
 assert.equal(result.content.trim(),'RESTORED');assert.equal(result.toolCalls?.length??0,0);
 assert.equal(proof.inferenceRequests,2);proof.explicitRestoreSucceeded=true;proof.passed=true;proof.stage='complete';
}catch{process.exitCode=1;}
finally{
 globalThis.fetch=originalFetch;
 try{await setup.shutdown();}finally{try{await destination.writeFile(JSON.stringify(proof,null,2)+'\n');}finally{await destination.close();}}
 console.log(JSON.stringify(proof));
}
