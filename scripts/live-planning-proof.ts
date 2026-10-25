/** Produce a live reviewable plan for a useful disposable deliverable; never execute it. */
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ModelPlanDraftProvider } from '../src/core/runtime/modelPlanDraftProvider.js';
import { MiMoModelProvider } from '../src/providers/models/mimoModel.js';
import type { Task } from '../src/core/types/task.js';
import type { PlanningAudit } from '../src/core/runtime/executionReceipt.js';

if(process.env.AGENTFORGE_LIVE_PLANNING_PROOF!=='1'||!process.env.AGENTFORGE_PROOF_MODEL||!process.env.AGENTFORGE_PROOF_OUTPUT||!process.env.MIMO_API_KEY)throw Error('Explicit live opt-in, model, private credential and output required');
const model=process.env.AGENTFORGE_PROOF_MODEL;
const now=new Date().toISOString();
const task:Task={id:'synthetic-sales-summary',projectId:'disposable-evaluation',title:'Build a sales summary',description:'Create artifacts/summary.json from these synthetic orders: [{"id":"A","amount":50,"status":"paid"},{"id":"B","amount":75,"status":"paid"},{"id":"C","amount":40,"status":"cancelled"}]. The file must contain paidOrderCount and paidRevenue, excluding cancelled orders. Create a readable artifacts/summary.md explaining those two results. Use Node.js only. Do not read any host files or use the network.',status:'ready',priority:'medium',createdAt:now,updatedAt:now,contract:{id:'synthetic-summary-contract',taskId:'synthetic-sales-summary',version:1,repository:{baseBranch:'main'},workspace:{requireIsolatedWorktree:true},scope:{allowedPaths:['artifacts/**'],protectedPaths:['.env'],maxFilesChanged:2},authority:{externalMessage:false,productionWrite:false,deployment:false,forcePush:false,deleteFiles:false,networkOutbound:false},requiredChecks:[{type:'custom_script',required:true,command:'node -e "const fs=require(\'fs\');const x=JSON.parse(fs.readFileSync(\'artifacts/summary.json\',\'utf8\'));if(x.paidOrderCount!==2||x.paidRevenue!==125)process.exit(1);if(!fs.readFileSync(\'artifacts/summary.md\',\'utf8\').includes(\'125\'))process.exit(1)"'}],completion:{requireEvidencePack:true,requireHumanApproval:true,requiredArtifacts:[{path:'artifacts/summary.json'},{path:'artifacts/summary.md'}]},createdAt:now}};
const audits:PlanningAudit[]=[];
const planner=new ModelPlanDraftProvider(new MiMoModelProvider(),model,['node','sh'],1500,{requireReportedUsage:true,deadlineMs:60000,persist:async audit=>{const i=audits.findIndex(x=>x.id===audit.id);if(i<0)audits.push(audit);else audits[i]=audit;}});
const started=Date.now();
const draft=await planner.draft(task);
const report={model,status:'drafted-not-approved-not-executed',elapsedMs:Date.now()-started,task,draft,audits,costUsd:'unmeasured',draftSha256:createHash('sha256').update(JSON.stringify(draft)).digest('hex')};
await writeFile(process.env.AGENTFORGE_PROOF_OUTPUT,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
