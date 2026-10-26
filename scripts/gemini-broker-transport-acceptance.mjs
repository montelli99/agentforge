/** Installed Gemini MCP transport -> AgentForge broker, no model or account. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {DockerComputeProvider} from '../src/core/compute/dockerComputeProvider.ts';
import {ContractedDockerExecutionBackend} from '../src/core/runtime/contractedDockerExecutionBackend.ts';
import {ApprovedPlanProvider,executionContractDigest} from '../src/core/runtime/approvedPlanProvider.ts';
import {createNativeDockerSession} from '../src/core/runtime/nativeDockerBroker.ts';
import {WorkspaceStore} from '../src/core/store/workspaceStore.ts';
import {NativeToolAuthorization} from '../src/core/runtime/nativeToolAuthorization.ts';
import {NativeToolBroker} from '../src/core/runtime/nativeToolBroker.ts';
import {NativeBrokerSession} from '../src/core/runtime/nativeBrokerSession.ts';
import {startNativeBrokerEndpoint} from '../src/providers/mcp/nativeBrokerEndpoint.ts';
const moduleFile=process.argv[2];if(!moduleFile||!path.isAbsolute(moduleFile))throw Error('Absolute official module required');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-gemini-transport-'));
const saved={...process.env};for(const key of Object.keys(process.env))delete process.env[key];
for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(saved[key])process.env[key]=saved[key];
Object.assign(process.env,{HOME:root,USERPROFILE:root,TEMP:root,TMP:root,GEMINI_CLI_HOME:root});
let connection,client;
try{
 const work=path.join(root,'work');await fs.mkdir(work);
 const gate=new NativeToolAuthorization(path.join(root,'host'),work);
 const identity={taskId:'synthetic',operationId:randomUUID(),sessionId:'session'};
 let args={callId:'call',tool:'write',input:{text:'synthetic'}};const approvalId=randomUUID();
 const dockerMode=process.argv.includes('--docker');
 let artifact=path.join(work,'result.txt');let imageId=null;let backend,task,store;
 let session=new NativeBrokerSession(identity,new NativeToolBroker(gate,async()=>{
  await fs.appendFile(artifact,'one\n');return {evidence:await fs.readFile(artifact,'utf8')};
 }));
 if(dockerMode){
  const repo=path.join(root,'repo');await fs.mkdir(repo);const git=values=>execFileSync('git',values,{cwd:repo,encoding:'utf8',windowsHide:true});
  git(['init']);await fs.mkdir(path.join(repo,'artifacts'));await fs.writeFile(path.join(repo,'artifacts','result.txt'),'');await fs.writeFile(path.join(repo,'README.md'),'Synthetic native broker proof\n');git(['add','.']);git(['-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','commit','-m','fixture']);
  git(['worktree','add','--detach',work,'HEAD']);
  const write="node -e \"require('fs').appendFileSync('artifacts/result.txt','one\\n')\"";
  const verify="node -e \"if(require('fs').readFileSync('artifacts/result.txt','utf8')!=='one\\n')process.exit(1)\"";
  const now=new Date().toISOString();
  task={id:identity.taskId,projectId:'synthetic',title:'Native Docker proof',description:'Synthetic',status:'ready',priority:'medium',createdAt:now,updatedAt:now,contract:{id:'contract',taskId:identity.taskId,version:1,createdAt:now,repository:{baseBranch:git(['branch','--show-current']).trim(),baseSha:git(['rev-parse','HEAD']).trim()},workspace:{requireIsolatedWorktree:true},scope:{allowedPaths:['artifacts/**'],protectedPaths:['.git/**','.env']},authority:{externalMessage:false,productionWrite:false,deployment:false,forcePush:false,deleteFiles:false,networkOutbound:false},requiredChecks:[{type:'custom_script',command:verify,required:true}],completion:{requireEvidencePack:true,requireHumanApproval:true,requiredArtifacts:[{path:'artifacts/result.txt'}]}}};
  const plan={taskId:task.id,source:'human_approved',commands:[{checkName:'write',command:write,timeoutMs:10000},{checkName:'custom_script',command:verify,timeoutMs:10000}]};
  imageId=execFileSync('docker',['image','inspect','node:22-alpine','--format','{{.Id}}'],{encoding:'utf8',windowsHide:true}).trim();
  backend=new ContractedDockerExecutionBackend(new DockerComputeProvider({defaultImage:imageId}),new ApprovedPlanProvider(async()=>({plan,contractDigest:executionContractDigest(task),approvedBy:'synthetic-owner',approvedAt:now,expiresAt:new Date(Date.now()+60000).toISOString()})),{resultJournalDirectory:path.join(root,'results')});
  assert.equal((await backend.initialize()).ready,true);
  store=new WorkspaceStore(path.join(root,'workspace.json'));store.createTask(task);
  const bound=createNativeDockerSession({identity,task,worktreePath:work,authorization:gate,backend,reviewStore:store});session=bound.session;args={callId:bound.callId,tool:bound.tool,input:bound.input};artifact=path.join(work,'artifacts','result.txt');
 }
 connection=await startNativeBrokerEndpoint(session);
 const {Client,createTransport}=await import(pathToFileURL(moduleFile).href);
 client=new Client({name:'agentforge-acceptance',version:'0.1.2'},{capabilities:{}});
 const transport=await createTransport('agentforge-broker',{url:connection.endpoint,type:'http',headers:{Authorization:'Bearer '+connection.token}},false,{sanitizationConfig:{enableEnvironmentVariableRedaction:false}});
 await client.connect(transport,{timeout:10000});
 assert.deepEqual((await client.listTools()).tools.map(tool=>tool.name),dockerMode?['request_review','execute_reviewed','read_result']:['dispatch']);
 let call={name:'dispatch',arguments:{approvalId,...args}};
 if(dockerMode){const response=await client.callTool({name:'request_review',arguments:args});const {reviewId}=JSON.parse(response.content[0].text);assert.ok(reviewId);call={name:'execute_reviewed',arguments:{reviewId,...args}};}
 assert.equal((await client.callTool(call)).isError,true);
 if(dockerMode)assert.equal(await fs.readFile(artifact,'utf8'),'');else await assert.rejects(fs.stat(artifact));
 if(dockerMode)store.resolveApproval({approvalId:call.arguments.reviewId,status:'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});
 else await gate.approve(approvalId,{...identity,...args},'synthetic-owner',Date.now()+60000);
 assert.equal((await client.callTool(call)).isError,undefined);
 assert.equal((await client.callTool(call)).isError,true);
 assert.equal(await fs.readFile(artifact,'utf8'),'one\n');
 if(dockerMode){assert.equal((await client.callTool({name:'request_review',arguments:{...args,callId:'new-call'}})).isError,true);assert.equal(await fs.readFile(artifact,'utf8'),'one\n');}
 if(dockerMode){const recovered=await backend.recoverResult({task,operationId:identity.operationId,worktreePath:work});assert.ok(recovered.artifacts.length);assert.ok(recovered.testResults.length);assert.ok(recovered.testResults.every(check=>check.passed));assert.equal((await backend.inspectSurvivors({operationId:identity.operationId,worktreePath:work})).length,0);}
 if(dockerMode){
  await client.close();client=new Client({name:'agentforge-reconnected',version:'0.1.2'},{capabilities:{}});
  await client.connect(await createTransport('agentforge-broker',{url:connection.endpoint,type:'http',headers:{Authorization:'Bearer '+connection.token}},false,{sanitizationConfig:{enableEnvironmentVariableRedaction:false}}),{timeout:10000});
  const response=await client.callTool({name:'read_result',arguments:{}});assert.equal(response.isError,undefined);
  const recovered=JSON.parse(response.content[0].text);assert.ok(recovered.artifacts.length);assert.ok(recovered.testResults.every(check=>check.passed));
  assert.equal((await client.callTool({name:'read_result',arguments:{worktreePath:'other'}})).isError,true);
  assert.equal(await fs.readFile(artifact,'utf8'),'one\n');
  await fs.writeFile(artifact,'changed\n');assert.equal((await client.callTool({name:'read_result',arguments:{}})).isError,true);
  await fs.writeFile(artifact,'one\n');
 }
 console.log(JSON.stringify({scope:dockerMode?'Pinned Gemini MCP transport -> broker -> real contracted Docker; synthetic approved plan, no model inference':'Pinned Gemini MCP transport with synthetic host executor; not model inference or full CLI worker',imageId,moduleSha256:createHash('sha256').update(await fs.readFile(moduleFile)).digest('hex'),discovery:true,missingApprovalDenied:true,approvedEffectCount:1,duplicateDenied:true,durableResultRecovered:dockerMode,modelRequests:0,accountUsed:false}));
}finally{await client?.close();await connection?.close();await fs.rm(root,{recursive:true,force:true});}





