/** Live development planning for shared cases. Draft only; never auto-approves. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {ModelPlanDraftProvider} from '../src/core/runtime/modelPlanDraftProvider.js';
import {MiMoModelProvider} from '../src/providers/models/mimoModel.js';
import type {PlanningAudit} from '../src/core/runtime/executionReceipt.js';
const [caseId,model,output,...extra]=process.argv.slice(2);
if(!caseId||!model||!output||!path.isAbsolute(output)||extra.length||process.env.AGENTFORGE_LIVE_COMPARISON_DEVELOPMENT!=='1'||!process.env.MIMO_API_KEY)throw Error('Explicit development opt-in, case, model, credential and new output required');
const cases=JSON.parse((await fs.readFile(new URL('./fixtures/comparison-v4/cases.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
const item=cases.cases.find((value:{id:string})=>value.id===caseId);if(!item)throw Error('Unknown development case');
const file=await fs.open(output,'wx',0o600);
const store=new WorkspaceStore();let task=store.createTask({title:'Synthetic '+caseId,description:item.prompt,status:'ready',priority:'medium'});
task=store.updateTask(task.id,{contract:{...task.contract,scope:{allowedPaths:['artifacts/result.json'],protectedPaths:['input.json'],maxFilesChanged:1},authority:{externalMessage:false,productionWrite:false,deployment:false,forcePush:false,deleteFiles:false,networkOutbound:false},requiredChecks:[],completion:{requireEvidencePack:true,requireHumanApproval:true,requiredArtifacts:[{path:'artifacts/result.json'}]}}});
const audits:PlanningAudit[]=[];
let proof:Record<string,unknown>={passed:false,caseId,model,scoredComparison:false,inputSha256:createHash('sha256').update(JSON.stringify(item.input,null,2)+'\n').digest('hex'),audits,scope:'Live draft for a shared development case; no approval, execution, artifact score or competitive result.'};
try{
 const planner=new ModelPlanDraftProvider(new MiMoModelProvider(),model,['node','sh'],1000,{requireReportedUsage:true,deadlineMs:60000,persist:async audit=>{const index=audits.findIndex(a=>a.id===audit.id);if(index<0)audits.push(audit);else audits[index]=audit;}});
 const draft=await planner.draft(task);proof={...proof,passed:true,status:'drafted-not-approved',task,draft};
}catch{proof={...proof,status:'planning-failed'};process.exitCode=1;}
finally{try{await file.writeFile(JSON.stringify(proof,null,2)+'\n');}finally{await file.close();}console.log(JSON.stringify({passed:proof.passed,status:proof.status,attempts:audits.length}));}
