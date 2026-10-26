import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {WorkspaceStore} from '../dist/core/store/workspaceStore.js';
import {configureHermesRunConnection} from '../dist/providers/channels/hermesRunConnection.js';
import {prepareExternalTurnApproval,dispatchExternalTurn,observeExternalTurn} from '../dist/core/runtime/externalTurnDispatch.js';

export async function proveGovernedHermes({base,token,sessionKey,root}){
 const connection=configureHermesRunConnection({AGENTFORGE_HERMES_URL:base,AGENTFORGE_HERMES_API_KEY:token});
 const file=path.join(root,'governed-workspace.json');
 const store=new WorkspaceStore(file);
 const task=store.createTask({title:'Synthetic Hermes continuation',priority:'medium',status:'ready'});
 const request={connectionId:connection.id,sessionKey,message:'Using the numeric total from our previous exchange, add 50. Return the new total and the prior total. No tools or external access are needed.'};
 const approval=prepareExternalTurnApproval(store,task.id,'synthetic-proof',request);
 await assert.rejects(()=>dispatchExternalTurn(store,task.id,approval.id,request,connection),/approval/);
 // Test-only reviewer exercising the authorized synthetic acceptance case.
 // This does not claim a browser human-review journey.
 store.resolveApproval({approvalId:approval.id,status:'approved',approverUserId:'synthetic-proof-reviewer',decisionOrigin:'web'});
 const receipt=await dispatchExternalTurn(store,task.id,approval.id,request,connection);
 const reopened=new WorkspaceStore(file);
 await assert.rejects(()=>dispatchExternalTurn(reopened,task.id,approval.id,request,connection),/already recorded/);
 await assert.rejects(()=>observeExternalTurn(reopened,task.id,{...connection,id:'rotated-binding'}),/connection/);
 let observed;
 for(let i=0;i<120;i++){
  observed=await observeExternalTurn(reopened,task.id,connection);
  if(['completed','failed','cancelled','interrupted'].includes(observed.observation.remoteStatus))break;
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 await fs.writeFile(path.join(root,'governed-observation.json'),JSON.stringify(observed,null,2));
 assert.equal(observed.observation.remoteStatus,'completed');
 const output=await connection.readRunOutput(receipt.runId);
 assert.match(output.content,/\b1300\b/);assert.match(output.content,/\b1250\b/);
 assert.equal(reopened.getTask(task.id).status,'paused');
 assert.equal(reopened.getTask(task.id).evidencePack,undefined);
 await fs.writeFile(path.join(root,'governed-proof.json'),JSON.stringify({runId:receipt.runId,sessionKey,output:output.content,checks:{unapprovedSubmissionRefused:true,reviewedDispatch:true,reopenedReceipt:true,duplicateDispatchRefused:true,changedBindingRefused:true,sessionContextContinued:true,remoteCompletionNotLocalVerification:true},limits:['Synthetic reviewer, not browser review.','Cancellation and useful tool execution remain separate acceptance cases.']},null,2));
 console.log('Governed Hermes session continuation passed.');
}
