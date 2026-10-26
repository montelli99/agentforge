import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {WorkspaceStore} from '../dist/core/store/workspaceStore.js';import {TaskWorkerRuntime} from '../dist/core/runtime/taskWorkerRuntime.js';import {ApprovedPlanProvider,executionContractDigest} from '../dist/core/runtime/approvedPlanProvider.js';import {ContractedDockerExecutionBackend} from '../dist/core/runtime/contractedDockerExecutionBackend.js';import {DockerComputeProvider} from '../dist/core/compute/dockerComputeProvider.js';
const [source,digest]=process.argv.slice(2);if(!source||!digest)throw Error('Supply reviewed evidence directory and plan digest');
if(source==='recover'){
 const root=digest;const saved=JSON.parse(await fs.readFile(path.join(root,'crash-checkpoint.json'),'utf8'));
 const store=new WorkspaceStore(path.join(root,'state.json'));let executions=0;
 const backend={getReadiness:()=>({ready:true,blockers:[]}),initialize:async()=>({ready:true,blockers:[]}),validateTask:async()=>{},execute:async()=>{executions++;throw Error('Unexpected replay');}};
 const worker=new TaskWorkerRuntime(store,backend,{repoRoot:root,automaticDispatch:false,autoStart:true,requireEffectReceipts:true,workspaceIdentity:saved.workspaceId});
 try{
  const result=await worker.executeTask(saved.taskId);assert.equal(result.status,'waiting_approval');assert.equal(executions,0);
  assert.equal(JSON.stringify(result.executionReceipts),saved.receipts);
  const artifact=path.join(result.worktree.worktreePath,'artifacts/report.json');const content=await fs.readFile(artifact);
  assert.equal(createHash('sha256').update(content).digest('hex'),saved.artifactSha256);
  execFileSync(process.execPath,['scripts/fixtures/useful-task/verify.mjs',artifact],{stdio:'pipe'});
  const proof={passed:true,scope:'Fresh process after abrupt exit following observed receipt; pre-receipt interruption still pending',taskId:saved.taskId,recoveryExecutions:executions,artifactSha256:saved.artifactSha256,receiptSha256:createHash('sha256').update(saved.receipts).digest('hex')};
  await fs.writeFile(path.join(root,'process-recovery.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
 }finally{worker.stop();}
 process.exit(0);
}
const raw=await fs.readFile(path.join(source,'plan.json'),'utf8');assert.equal(createHash('sha256').update(raw).digest('hex'),digest);
const original=JSON.parse(await fs.readFile(path.join(source,'task.json'),'utf8'));const root=await fs.mkdtemp(path.join(os.tmpdir(),'agentforge-invoice-recovery-'));console.log('Evidence directory: '+root);
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
await fs.mkdir(path.join(root,'inputs'));await fs.copyFile(path.join(source,'inputs/invoices.json'),path.join(root,'inputs/invoices.json'));git(['init','--initial-branch=main']);git(['add','inputs']);git(['-c','user.name=Acceptance','-c','user.email=acceptance@example.invalid','commit','-m','synthetic invoices']);
let store=new WorkspaceStore(path.join(root,'state.json'));const workspace=store.createWorkspace({name:'Synthetic recovery'});const project=store.createSpace({workspaceId:workspace.id,name:'Invoices',provider:'web',repositoryPath:root});
const task=store.createTask({title:original.title,description:original.description,projectId:project.id,status:'ready',priority:'medium'});
const contract={...original.contract,taskId:task.id,repository:{baseBranch:'main',baseSha:git(['rev-parse','HEAD'])}};store.updateTask(task.id,{contract});
const approved={plan:{...JSON.parse(raw),taskId:task.id,source:'human_approved'},contractDigest:executionContractDigest(store.getTask(task.id)),approvedBy:'user-authorized-acceptance-operator',approvedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()};store.updateTask(task.id,{approvedExecutionPlan:approved});
const backend=new ContractedDockerExecutionBackend(new DockerComputeProvider({defaultImage:'node:22-alpine',maxMemoryBytes:256*1024*1024,cpuQuota:1}),new ApprovedPlanProvider(async id=>store.getTask(id)?.approvedExecutionPlan));assert.equal((await backend.initialize()).ready,true);
let executions=0;const execute=backend.execute.bind(backend);backend.execute=async args=>{executions++;return execute(args);};
let worker=new TaskWorkerRuntime(store,backend,{repoRoot:root,automaticDispatch:false,autoStart:true,requireEffectReceipts:true,workspaceIdentity:workspace.id});
try{
 const result=await worker.executeTask(task.id);assert.equal(result.status,'waiting_approval');assert.equal(result.evidencePack.verifiedPassed,true);
 const artifact=path.join(result.worktree.worktreePath,'artifacts/report.json');execFileSync(process.execPath,['scripts/fixtures/useful-task/verify.mjs',artifact],{stdio:'pipe'});
 const before=JSON.stringify(result.executionReceipts);const content=await fs.readFile(artifact);
 if(process.env.AGENTFORGE_PROOF_CRASH_AFTER_OBSERVED==='1'){
  await fs.writeFile(path.join(root,'crash-checkpoint.json'),JSON.stringify({taskId:task.id,workspaceId:workspace.id,receipts:before,artifactSha256:createHash('sha256').update(content).digest('hex')}));
  process.exit(73); // Deliberately skip worker shutdown and finally cleanup.
 }
 worker.stop();
 store=new WorkspaceStore(path.join(root,'state.json'));worker=new TaskWorkerRuntime(store,backend,{repoRoot:root,automaticDispatch:false,autoStart:true,requireEffectReceipts:true,workspaceIdentity:workspace.id});
 const restored=worker.reconcileObservedExecution(task.id);assert.equal(restored.status,'waiting_approval');assert.equal(JSON.stringify(restored.executionReceipts),before);assert.deepEqual(await fs.readFile(artifact),content);assert.equal(executions,1);
 await worker.executeTask(task.id);assert.equal(executions,1);
 const proof={passed:true,scope:'Worker/store reopen and observed-result reconciliation; not process crash or browser',taskId:task.id,executions,receiptSha256:createHash('sha256').update(before).digest('hex'),artifactSha256:createHash('sha256').update(content).digest('hex'),reviewDigest:digest};await fs.writeFile(path.join(root,'acceptance.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
}finally{worker.stop();}
