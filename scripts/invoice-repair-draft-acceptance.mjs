import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {ModelPlanDraftProvider} from '../dist/core/runtime/modelPlanDraftProvider.js';
import {MiMoModelProvider} from '../dist/providers/models/mimoModel.js';
if(process.env.AGENTFORGE_LIVE_PLANNING_PROOF!=='1'||!process.env.MIMO_API_KEY)throw Error('Live proof opt-in required');
const root=process.argv[2];if(!root||!path.isAbsolute(root)||!path.basename(root).startsWith('agentforge-approval-browser-'))throw Error('Explicit synthetic invoice attempt required');
const statePath=path.join(root,'state.json'),before=await fs.readFile(statePath);const task=JSON.parse(before).tasks.find(t=>t.title==='User-created bounded task'&&t.status==='failed');
if(!task||!task.description.includes('P02 useful task: synthetic invoice reconciliation'))throw Error('Synthetic failed invoice task required');
const output=path.join(root,'repair-draft-proof.json');try{await fs.access(output);throw Error('Attempt already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
const audits=[];const planner=new ModelPlanDraftProvider(new MiMoModelProvider(),'mimo-v2.6-flash',['sh','node'],3000,{requireReportedUsage:true,persist:async audit=>{const i=audits.findIndex(a=>a.id===audit.id);if(i<0)audits.push(audit);else audits[i]=audit;await fs.writeFile(output,JSON.stringify({status:'planning',audits},null,2));}});
try{const draft=await planner.draft(task);if(!before.equals(await fs.readFile(statePath)))throw Error('Original state changed');await fs.writeFile(output,JSON.stringify({status:'drafted-not-approved-not-executed',sourceTaskId:task.id,sourceStateSha256:crypto.createHash('sha256').update(before).digest('hex'),audits,draft},null,2));console.log(output);}catch(error){await fs.writeFile(output,JSON.stringify({status:'failed',error:error.message,audits},null,2));throw error;}
