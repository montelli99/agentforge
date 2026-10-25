import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {chromium} from 'playwright';
import {WorkspaceStore} from '../dist/core/store/workspaceStore.js';
import {WorktreeManager} from '../dist/core/worktree/worktreeManager.js';
import {ApprovedPlanProvider} from '../dist/core/runtime/approvedPlanProvider.js';
import {ContractedDockerExecutionBackend} from '../dist/core/runtime/contractedDockerExecutionBackend.js';
import {DockerComputeProvider} from '../dist/core/compute/dockerComputeProvider.js';
import {TaskWorkerRuntime} from '../dist/core/runtime/taskWorkerRuntime.js';
import {AgentForgeWebServer} from '../dist/server/webServer.js';
const executable=process.env.AGENTFORGE_BROWSER_EXECUTABLE;
if(!executable||!path.isAbsolute(executable))throw Error('Select an absolute Chromium executable');
process.env.AGENTFORGE_AUTH_STRICT='1';
const root=await mkdtemp(path.join(os.tmpdir(),'agentforge-approval-browser-'));
const git=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:'pipe'}).trim();
    git(root, ["init", "--initial-branch=main"]);
    await writeFile(path.join(root, "README.md"), "# AgentForge Docker E2E\n", "utf8");
    git(root, ["add", "README.md"]);
    git(root, ["-c", "user.name=AgentForge E2E", "-c", "user.email=e2e@example.invalid", "commit", "-m", "fixture"]);
    const baseSha = git(root, ["rev-parse", "HEAD"]);

    const taskId = "approved-docker-e2e";
    const manager = new WorktreeManager(root);
    const worktree = await manager.createWorktree({ taskId, branchName: `worktree/${taskId}`, baseBranch: baseSha });
    const now = Date.now();
    const command = "node -e \"require('node:fs').writeFileSync('artifacts/verified.txt','agentforge-docker-e2e')\"";
    const task = {
      id: taskId,
      projectId: "local-acceptance",
      title: "Prove approved Docker execution",
      description: "Disposable local acceptance fixture.",
      priority: "medium",
      status: "ready",
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      contract: {
        id: "contract-approved-docker-e2e",
        taskId,
        version: 1,
        repository: { baseBranch: "main", baseSha },
        workspace: { requireIsolatedWorktree: true },
        scope: { allowedPaths: ["artifacts/**"], protectedPaths: [".env"], maxFilesChanged: 1 },
        authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
        requiredChecks: [{ type: "custom_script", command, required: true }],
        completion: { requireEvidencePack: true, requireHumanApproval: true, requiredArtifacts: [{ path: "artifacts/verified.txt" }] },
        createdAt: new Date(now).toISOString(),
      },
      worktree,
    };

const store=new WorkspaceStore(path.join(root,'state.json'));
const workspace=store.createWorkspace({name:'Synthetic approval workspace'});
const project=store.createSpace({workspaceId:workspace.id,name:'Synthetic approval project',provider:'web'});
task.projectId=project.id;store.createTask(task);
const plans=new ApprovedPlanProvider(async id=>store.getTask(id)?.approvedExecutionPlan);
const backend=new ContractedDockerExecutionBackend(new DockerComputeProvider({defaultImage:'node:22-alpine',maxMemoryBytes:256*1024*1024,cpuQuota:1}),plans);
assert.equal((await backend.initialize()).ready,true);
const worker=new TaskWorkerRuntime(store,backend,{repoRoot:root,automaticDispatch:false,autoStart:true,requireEffectReceipts:true,workspaceIdentity:workspace.id});
const server=new AgentForgeWebServer(store,0,undefined,worker,{settingsFilePath:path.join(root,'settings.json')});let browser;
try{
 await server.start();browser=await chromium.launch({headless:true,executablePath:executable});const page=await browser.newPage();
 await page.goto(server.getBaseUrl());await page.locator('input[name=displayName]').fill('Synthetic reviewer');await page.locator('input[name=password]').fill('Synthetic reviewer password');await page.getByRole('button',{name:'Secure & continue',exact:true}).click();
 await page.getByLabel('Tasks and runs',{exact:true}).click();
 await page.getByRole('button').filter({has:page.getByText('Prove approved Docker execution',{exact:true})}).click();
 await page.locator('.task-proof-step').filter({hasText:'Plan'}).click();
 await page.getByRole('heading',{name:'Review execution plan',exact:true}).waitFor();
 assert.match(await page.locator('.execution-command-list').innerText(),/verified.txt/);
 assert.equal(store.getTask(taskId).approvedExecutionPlan,undefined);
 await page.getByRole('button',{name:'Approve these commands',exact:true}).click();
 await page.getByText('Approved until',{exact:false}).waitFor();
 assert.equal(store.getTask(taskId).approvedExecutionPlan.approvedBy,'user-owner');
 assert.equal(store.getTask(taskId).executionReceipts?.length||0,0);
 await page.getByRole('button',{name:'Run task',exact:true}).click();
 const deadline=Date.now()+60000;
 while(!['waiting_approval','failed'].includes(store.getTask(taskId).status)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
 const result=store.getTask(taskId);assert.equal(result.status,'waiting_approval');assert.equal(result.evidencePack.verifiedPassed,true);assert.equal(result.executionReceipts.at(-1).status,'observed');
 assert.equal(await readFile(path.join(worktree.worktreePath,'artifacts/verified.txt'),'utf8'),'agentforge-docker-e2e');
 console.log(JSON.stringify({passed:true,syntheticOnly:true,browserCommandReview:true,authenticatedApproval:true,approvalDidNotExecute:true,realDocker:true,verifiedArtifact:true,finalHumanReviewPending:true}));
}finally{await browser?.close();worker.stop();await server.stop();}



