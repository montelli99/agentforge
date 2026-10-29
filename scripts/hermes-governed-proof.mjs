import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {WorkspaceStore} from '../dist/core/store/workspaceStore.js';
import {configureHermesRunConnection} from '../dist/providers/channels/hermesRunConnection.js';
import {prepareExternalTurnApproval,dispatchExternalTurn,observeExternalTurn,stopExternalTurn} from '../dist/core/runtime/externalTurnDispatch.js';

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
 const stopTask=reopened.createTask({title:'Synthetic Hermes Stop acceptance',priority:'medium',status:'ready'});
 const stopRequest={connectionId:connection.id,sessionKey,message:'Write a detailed explanation of arithmetic addition using only text. Do not use tools or access files, network, or other resources.'};
 const stopApproval=prepareExternalTurnApproval(reopened,stopTask.id,'synthetic-proof',stopRequest);
 reopened.resolveApproval({approvalId:stopApproval.id,status:'approved',approverUserId:'synthetic-proof-reviewer',decisionOrigin:'web'});
 const stopReceipt=await dispatchExternalTurn(reopened,stopTask.id,stopApproval.id,stopRequest,connection);
 const beforeStop=await observeExternalTurn(reopened,stopTask.id,connection);
 assert.ok(['queued','running'].includes(beforeStop.observation.remoteStatus),'Run must be active before Stop');
 const acknowledged=await stopExternalTurn(reopened,stopTask.id,'synthetic-proof-reviewer',connection);
 let stopped;
 for(let i=0;i<60;i++){
  stopped=await observeExternalTurn(reopened,stopTask.id,connection);
  if(['cancelled','completed','failed','interrupted'].includes(stopped.observation.remoteStatus))break;
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 const record={runId:stopReceipt.runId,before:beforeStop.observation.remoteStatus,acknowledgment:acknowledged.stop.status,terminal:stopped.observation.remoteStatus,localStatus:reopened.getTask(stopTask.id).status,limits:['Text-only workload; cancellation of tool side effects is not proved.','Synthetic reviewer; browser interaction remains separate.']};
 await fs.writeFile(path.join(root,'stop-proof.json'),JSON.stringify(record,null,2));
 assert.equal(record.acknowledgment,'acknowledged');assert.equal(record.terminal,'cancelled');assert.equal(record.localStatus,'paused');
 const restoredStop=new WorkspaceStore(file);
 await assert.rejects(()=>stopExternalTurn(restoredStop,stopTask.id,'synthetic-proof-reviewer',connection),/already recorded/);
 await assert.rejects(()=>connection.readRunOutput(stopReceipt.runId),/unavailable/);
 console.log('Real Hermes cancellation observed; repeated Stop refused after reopen.');
}
