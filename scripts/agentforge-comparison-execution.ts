/** Execute only a separately reviewed development draft in a disposable worktree. */
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {comparisonCase} from './comparison-case.mjs';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {WorktreeManager} from '../src/core/worktree/worktreeManager.js';
import {TaskWorkerRuntime} from '../src/core/runtime/taskWorkerRuntime.js';
import {ApprovedPlanProvider,executionContractDigest} from '../src/core/runtime/approvedPlanProvider.js';
import {ContractedDockerExecutionBackend} from '../src/core/runtime/contractedDockerExecutionBackend.js';
import {DockerComputeProvider} from '../src/core/compute/dockerComputeProvider.js';
const [draftFile,reviewedSha,image,output,...extra]=process.argv.slice(2);
if(!draftFile||!path.isAbsolute(draftFile)||!reviewedSha?.match(/^[a-f0-9]{64}$/)||!image?.startsWith('sha256:')||!output||!path.isAbsolute(output)||extra.length)throw Error('Explicit reviewed draft hash, pinned image and new output required');
const bytes=await fs.readFile(draftFile);assert.equal(createHash('sha256').update(bytes).digest('hex'),reviewedSha);
const draft=JSON.parse(bytes.toString());assert(draft.passed&&draft.status==='drafted-not-approved');
const item=await comparisonCase(draft.caseId);assert.equal(item.inputSha256,draft.inputSha256);
const destination=await fs.open(output,'wx',0o600);
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-live-case-execution-')));
const git=(args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe',windowsHide:true}).trim();
let worker:TaskWorkerRuntime|undefined;
let proof:Record<string,unknown>={passed:false,caseId:item.id,reviewedDraftSha256:reviewedSha,image,newModelRequests:0,scoredComparison:false,scope:'Reviewed live-model draft through ordinary worker and Docker, independently scored development case. Not a frozen matched comparison or browser journey.'};
try{
 await item.stage(root);git(['init','--initial-branch=main']);await fs.writeFile(path.join(root,'.git/info/attributes'),'* -text\n',{flag:'wx'});git(['add','input.json']);git(['-c','user.name=Synthetic Acceptance','-c','user.email=acceptance@example.invalid','commit','-m','synthetic input']);const baseSha=git(['rev-parse','HEAD']);
 const worktree=await new WorktreeManager(root).createWorktree({taskId:draft.task.id,branchName:'worktree/synthetic-case',baseBranch:baseSha});
 assert.equal(createHash('sha256').update(await fs.readFile(path.join(worktree.worktreePath,'input.json'))).digest('hex'),item.inputSha256);
 const store=new WorkspaceStore(path.join(root,'state.json'));
 let task=store.createTask({...draft.task,status:'ready',worktree,contract:{...draft.task.contract,repository:{baseBranch:'main',baseSha}}});
 task=store.updateTask(task.id,{approvedExecutionPlan:{plan:{...draft.draft,source:'human_approved'},contractDigest:executionContractDigest(task),approvedBy:'synthetic-test-reviewer',approvedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString()}});
 const backend=new ContractedDockerExecutionBackend(new DockerComputeProvider({defaultImage:image}),new ApprovedPlanProvider(async id=>store.getTask(id)?.approvedExecutionPlan),{resultJournalDirectory:path.join(root,'results')});
 assert((await backend.initialize()).ready);
 worker=new TaskWorkerRuntime(store,backend,{repoRoot:root,workspaceIdentity:'synthetic-comparison',requireEffectReceipts:true,autoStart:false,automaticDispatch:false});
 const result=await worker.executeTask(task.id);const score=await item.score(worktree.worktreePath);
 proof={...proof,taskStatus:result.status,score,receiptCount:result.executionReceipts?.length,checks:result.evidencePack?.testResults.map(c=>({checkName:c.checkName,passed:c.passed,exitCode:c.exitCode})),artifactSha256:result.evidencePack?.artifacts[0]?.sha256};
 assert.equal(score.passed,true);assert.equal(result.status,'waiting_approval');assert.equal(result.executionReceipts?.length,1);
 assert.equal(store.getApproval(result.evidencePack!.approvalId!)?.status,'pending');
 proof.passed=true;
}catch{process.exitCode=1;}
finally{worker?.stop();try{await destination.writeFile(JSON.stringify(proof,null,2)+'\n');}finally{await destination.close();}console.log(JSON.stringify(proof));}
