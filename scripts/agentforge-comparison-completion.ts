/** Final review of an existing synthetic development result; never executes commands. */
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {comparisonCase} from './comparison-case.mjs';
const [directory,caseId,expectedArtifactHash,output,...extra]=process.argv.slice(2);
if(!directory||!caseId||!expectedArtifactHash?.match(/^[a-f0-9]{64}$/)||!output||!path.isAbsolute(output)||extra.length)throw Error('Explicit synthetic workspace, case, reviewed artifact hash and output required');
const root=await fs.realpath(directory);assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert(path.basename(root).startsWith('af-live-case-execution-'));
const file=await fs.open(output,'wx',0o600);const proof={passed:false,caseId,newExecutions:0,newModelRequests:0,independentScorePassed:false,finalApprovalCompleted:false,reopenedCompleted:false,receiptUnchanged:false,artifactUnchanged:false,scope:'Final test-authorized review of an existing synthetic live-model result; disk store reopened, no new execution or inference. Not browser approval or held-out comparison.'};
try{
 const state=path.join(root,'state.json');const store=new WorkspaceStore(state);const candidates=store.listTasks().filter(t=>t.title==='Synthetic '+caseId);assert.equal(candidates.length,1);const task=candidates[0];assert.equal(task.status,'waiting_approval');
 const worktree=await fs.realpath(task.worktree!.worktreePath);const relative=path.relative(root,worktree);assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
 const item=await comparisonCase(caseId);assert((await item.score(worktree)).passed);proof.independentScorePassed=true;
 const artifact=path.join(worktree,'artifacts/result.json');const hash=async()=>createHash('sha256').update(await fs.readFile(artifact)).digest('hex');assert.equal(await hash(),expectedArtifactHash);
 const receipt=JSON.stringify(task.executionReceipts);assert.equal(task.executionReceipts?.length,1);assert.equal(task.evidencePack?.verifiedPassed,true);
 store.resolveApproval({approvalId:task.evidencePack!.approvalId!,status:'approved',approverUserId:'synthetic-test-reviewer',decisionOrigin:'api',decisionNotes:'Independent fixture scorer and reviewed artifact hash passed.'});
 assert.equal(store.getTask(task.id)?.status,'completed');proof.finalApprovalCompleted=true;
 const reopened=new WorkspaceStore(state);assert.equal(reopened.getTask(task.id)?.status,'completed');proof.reopenedCompleted=true;
 assert.equal(JSON.stringify(reopened.getTask(task.id)?.executionReceipts),receipt);proof.receiptUnchanged=true;
 assert.equal(await hash(),expectedArtifactHash);proof.artifactUnchanged=true;proof.passed=true;
}catch{process.exitCode=1;}
finally{try{await file.writeFile(JSON.stringify(proof,null,2)+'\n');}finally{await file.close();}console.log(JSON.stringify(proof));}
