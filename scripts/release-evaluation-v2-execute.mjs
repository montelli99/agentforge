import {assertEvaluationScoringAllowed} from './evaluation-scoring-gate.mjs';
await assertEvaluationScoringAllowed();
import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash,randomUUID} from 'node:crypto';import {performance} from 'node:perf_hooks';
import {builtModule} from './built-package-under-test.mjs';import {evaluationJourneyCase} from './evaluation-journey-case.mjs';import {evaluationLimits} from './evaluation-limits.mjs';import {atomicProofJournal} from './atomic-proof-journal.mjs';
const [directory,digest]=process.argv.slice(2);if(!path.isAbsolute(directory||'')||!digest)throw Error('Absolute attempt directory and reviewed plan digest required');
const record=JSON.parse(await fs.readFile(path.join(directory,'attempt.json'),'utf8'));const plan=JSON.parse(await fs.readFile(path.join(directory,'plan.json'),'utf8'));const budget=await evaluationLimits();
if(record.arm!=='direct'||record.status!=='awaiting-review'||record.protocolSha256!==budget.protocolSha256||digest!==record.planSha256||createHash('sha256').update(JSON.stringify(plan)).digest('hex')!==digest)throw Error('Review, protocol or attempt mismatch');
budget.validatePlan(plan.commands);const item=await evaluationJourneyCase(record.id);if(item.inputSha256!==record.inputSha256)throw Error('Input identity mismatch');
const {buildDockerRunArguments}=await builtModule('core/compute/dockerComputeProvider.js');
// A durable, exclusive claim prevents a second invocation replaying an uncertain effect.
const claim=await fs.open(path.join(directory,'execution-claimed.json'),'wx');await claim.writeFile(JSON.stringify({digest,at:new Date().toISOString()}));await claim.sync();await claim.close();
const journal=atomicProofJournal(path.join(directory,'attempt.json'));const start=performance.now();record.reviewWaitMs=Date.now()-Date.parse(record.reviewReadyAt||record.startedAt);record.commands=[];record.status='executing';await journal.write(record);
try{
 if(record.reviewWaitMs>budget.limits.reviewTimeoutMs)throw Error('Review deadline expired');
 const work=path.join(directory,'work');const input=await fs.readFile(path.join(work,'input.json'));if(createHash('sha256').update(input).digest('hex')!==item.inputSha256)throw Error('Input modified before execution');
 await fs.mkdir(path.join(work,'artifacts'),{recursive:true});await fs.writeFile(path.join(work,item.artifactPath),'',{flag:'wx'});
 const inspected=spawnSync('docker',['image','inspect','node:22-alpine','--format','{{.Id}}'],{encoding:'utf8',windowsHide:true});if(inspected.status!==0)throw Error('Executor image unavailable');record.image=inspected.stdout.trim();
 for(const command of plan.commands){const name='af-eval-'+randomUUID();const args=buildDockerRunArguments(record.image,work,command.command,{writableFiles:[item.artifactPath]});args.splice(1,0,'--name',name);let result;
 try{result=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:command.timeoutMs,maxBuffer:65536});}finally{const cleanup=spawnSync('docker',['rm','-f',name],{encoding:'utf8',windowsHide:true});if(cleanup.status!==0&&!/No such container/i.test(cleanup.stderr||''))throw Error('Owned executor cleanup failed');}
 record.commands.push({checkName:command.checkName,exitCode:result.status,error:result.error?.code,stdout:result.stdout,stderr:result.stderr});await journal.write(record);if(result.status!==0)throw Error('Command failed or timed out');}
 record.score=await item.verify(work);record.status=record.score.passed?'passed':'failed';
}catch(error){record.status='failed';record.error=error.message;}finally{record.executionElapsedMs=performance.now()-start;record.wallElapsedMs=Date.now()-Date.parse(record.startedAt);await journal.write(record);await journal.flush();console.log(JSON.stringify(record));}
