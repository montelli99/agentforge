import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {runBoundedChild} from '../src/providers/models/boundedCliProcess.js';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {TaskWorkerRuntime} from '../src/core/runtime/taskWorkerRuntime.js';
import {ApprovedPlanProvider} from '../src/core/runtime/approvedPlanProvider.js';
import {ContractedDockerExecutionBackend} from '../src/core/runtime/contractedDockerExecutionBackend.js';
import {DockerComputeProvider} from '../src/core/compute/dockerComputeProvider.js';

// Explicit, dedicated signed-in profile. Never discover an operator profile.
const [profile,actor,model,image,output,...extra]=process.argv.slice(2);
if(!profile||!path.isAbsolute(profile)||!actor||!model||!image?.startsWith('sha256:')||!output||!path.isAbsolute(output)||extra.length)throw Error('Supply dedicated profile, actor, model, pinned image and new absolute evidence path');
const destination=await fs.open(output,'wx',0o600);
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-chatgpt-crash-')));
const proof={passed:false,stage:'launch',liveProvider:'chatgpt-subscription',model,requests:0,recoveryExecutions:0,duplicateRecoveryRefused:false,artifactSha256:'',scope:'Real chat/worker child terminated after durable Docker result but before observed receipt; recovery in a separate process. Pre-approved synthetic command, not browser or mid-command partial-effect recovery.'};
let worker:TaskWorkerRuntime|undefined;
try{
 const env:NodeJS.ProcessEnv={AGENTFORGE_LIVE_EXECUTION_PROOF:'1',AGENTFORGE_PROOF_PROVIDER:'chatgpt',AGENTFORGE_PROOF_MODEL:model,AGENTFORGE_PROOF_ACTOR:actor,AGENTFORGE_PROOF_SUBSCRIPTION_ROOT:await fs.realpath(profile),AGENTFORGE_APPROVED_DOCKER_IMAGE:image,AGENTFORGE_PROOF_CRASH_CHILD:'1',AGENTFORGE_PROOF_CRASH_ROOT:root};
 for(const key of ['SystemRoot','WINDIR','PATH','LOCALAPPDATA','APPDATA','USERPROFILE','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
 const child=await runBoundedChild(process.execPath,['--import','tsx','scripts/conversation-execution-e2e.ts'],{cwd:process.cwd(),env,timeoutMs:120000,maxOutputBytes:1048576});
 assert.notEqual(child.code,0,'Child must terminate before normal completion');
 proof.stage='recover';
 const checkpoint=JSON.parse(await fs.readFile(path.join(root,'checkpoint.json'),'utf8'));
 proof.requests=checkpoint.requests;
 const store=new WorkspaceStore(path.join(root,'state.json'));
 const task=store.getTask(checkpoint.taskId)!;
 assert.equal(task.executionReceipts?.at(-1)?.status,'started');
 const backend=new ContractedDockerExecutionBackend(new DockerComputeProvider({defaultImage:image}),new ApprovedPlanProvider(async id=>store.getTask(id)?.approvedExecutionPlan),{resultJournalDirectory:path.join(root,'results')});
 backend.execute=async()=>{proof.recoveryExecutions++;throw Error('Recovery must never execute');};
 worker=new TaskWorkerRuntime(store,backend,{repoRoot:root,workspaceIdentity:checkpoint.workspaceId,requireEffectReceipts:true,autoStart:false,automaticDispatch:false});
 const result=await worker.recoverJournaledExecution(task.id);
 assert.equal(proof.recoveryExecutions,0);
 assert.equal(result.status,'waiting_approval');
 assert.equal(result.executionReceipts?.at(-1)?.status,'observed');
 assert.equal(store.getApproval(result.evidencePack!.approvalId!)?.status,'pending');
 const bytes=await fs.readFile(path.join(result.worktree!.worktreePath,'artifacts','verified.txt'));
 assert.equal(bytes.toString(),'agentforge-docker-e2e');
 proof.artifactSha256=createHash('sha256').update(bytes).digest('hex');
 assert.equal(result.evidencePack!.artifacts[0].sha256,proof.artifactSha256);
 await assert.rejects(worker.recoverJournaledExecution(task.id));proof.duplicateRecoveryRefused=true;
 assert.equal(new WorkspaceStore(path.join(root,'state.json')).getTask(task.id)?.status,'waiting_approval');
 proof.passed=true;proof.stage='complete';
}catch{process.exitCode=1;}
finally{
 worker?.stop();
 // This generated fixture is the only removable path; no profile is under it.
 assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));
 try{
  const tasks=new WorkspaceStore(path.join(root,'state.json')).listTasks();
  const docker=new DockerComputeProvider();
  for(const task of tasks){
   const worktree=task.worktree?.worktreePath;if(!worktree)continue;
   const relative=path.relative(root,worktree);assert(!relative.startsWith('..')&&!path.isAbsolute(relative));
   for(const container of await docker.listWorkspaceContainers(worktree))execFileSync('docker',['rm','--force',container.id],{timeout:15000,stdio:'pipe',windowsHide:true});
  }
  await fs.rm(root,{recursive:true,force:true});
 }
 finally{try{await destination.writeFile(JSON.stringify(proof,null,2)+'\n');}finally{await destination.close();}}
 console.log(JSON.stringify(proof));
}
