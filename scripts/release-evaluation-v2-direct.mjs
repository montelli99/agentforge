import {assertEvaluationScoringAllowed} from './evaluation-scoring-gate.mjs';
await assertEvaluationScoringAllowed();
// Direct baseline: no AgentForge planner, repair loop, memory, or tool orchestration.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';
import {evaluationJourneyCase} from './evaluation-journey-case.mjs';import {evaluationLimits} from './evaluation-limits.mjs';import {atomicProofJournal} from './atomic-proof-journal.mjs';
const [root,id,trialText]=process.argv.slice(2);const trial=Number(trialText);
if(process.env.AGENTFORGE_LIVE_PLANNING_PROOF!=='1'||!process.env.MIMO_API_KEY||!path.isAbsolute(root||'')||![1,2,3].includes(trial))throw Error('Explicit live opt-in, credential, absolute attempt root and trial 1–3 required');
const item=await evaluationJourneyCase(id);const budget=await evaluationLimits();const directory=path.join(root,`${id}-${trial}-direct`);await fs.mkdir(directory,{recursive:false});await item.stage(path.join(directory,'work'));
const journal=atomicProofJournal(path.join(directory,'attempt.json'));const start=performance.now();const record={id,trial,arm:'direct',status:'started',startedAt:new Date().toISOString(),protocolSha256:budget.protocolSha256,inputSha256:item.inputSha256,requests:0,usage:null,cost:null};await journal.write(record);
try{
 const body=budget.request({messages:[{role:'system',content:'Return only JSON {"commands":[{"checkName":"...","command":"...","timeoutMs":10000}]}.'},{role:'user',content:item.prompt+'\nInput file contents:\n'+await fs.readFile(path.join(directory,'work/input.json'),'utf8')}],stream:false});
 await fs.writeFile(path.join(directory,'request.json'),JSON.stringify(body,null,2));record.requests=1;record.status='provider-requested';await journal.write(record);const providerStart=performance.now();
 const response=await fetch('https://token-plan-sgp.xiaomimimo.com/v1/chat/completions',{method:'POST',redirect:'error',signal:AbortSignal.timeout(budget.limits.providerRequestTimeoutMs),headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.MIMO_API_KEY},body:JSON.stringify(body)});
 const text=await response.text();record.providerElapsedMs=performance.now()-providerStart;record.httpStatus=response.status;await fs.writeFile(path.join(directory,'response.json'),text);if(!response.ok)throw Error('Provider HTTP '+response.status);
 const parsed=JSON.parse(text);record.usage=parsed.usage??null;const plan=JSON.parse(parsed.choices?.[0]?.message?.content);await fs.writeFile(path.join(directory,'plan.json'),JSON.stringify(plan,null,2));budget.validatePlan(plan.commands);record.planSha256=createHash('sha256').update(JSON.stringify(plan)).digest('hex');record.status='awaiting-review';record.reviewReadyAt=new Date().toISOString();
}catch(error){record.status='failed';record.error=error.message;}finally{record.planningElapsedMs=performance.now()-start;await journal.write(record);await journal.flush();console.log(JSON.stringify({...record,directory}));}

