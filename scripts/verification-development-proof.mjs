import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ModelPlanDraftProvider} from '../src/core/runtime/modelPlanDraftProvider.ts';
import {MiMoModelProvider} from '../src/providers/models/mimoModel.ts';
if(process.env.AGENTFORGE_LIVE_PLANNING_PROOF!=='1'||!process.env.MIMO_API_KEY)throw Error('Explicit live proof opt-in required');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-verification-development-'));
const input={rows:[{id:'x',quantity:7,unitCents:135,returned:2},{id:'y',quantity:3,unitCents:249,returned:1},{id:'z',quantity:1,unitCents:80,returned:1}]};
await fs.mkdir(path.join(root,'work'));await fs.writeFile(path.join(root,'work/input.json'),JSON.stringify(input));
const task={id:'verification-development',title:'Net sales report',description:'Read input.json. For every row compute netCents=(quantity-returned)*unitCents. Write result.json with exactly {lines:[{id,netCents}],totalCents}, lines sorted by id ascending and totalCents the sum. Keep zero-value rows. Verify the complete result without modifying it. Input: '+JSON.stringify(input),contract:{scope:{allowedPaths:['input.json','result.json'],forbiddenPaths:[]},authority:{allowNetwork:false,allowDestructive:false},requiredChecks:[]}};
const record={status:'started',syntheticOnly:true,developmentOnly:true,root,usage:null,cost:null};
const persist=()=>fs.writeFile(path.join(root,'proof.json'),JSON.stringify(record,null,2));await persist();console.log(root);
try{const provider=new MiMoModelProvider(process.env.MIMO_API_KEY);const generate=provider.generate.bind(provider);provider.generate=async options=>{const response=await generate(options);record.usage=response.usage??null;await persist();return response;};const planner=new ModelPlanDraftProvider(provider,'mimo-v2.6-flash',['sh','node'],1800,{requireReportedUsage:true,deadlineMs:90000,persist:async audit=>{record.audit=audit;await persist();}});const plan=await planner.draft(task);await fs.writeFile(path.join(root,'plan.json'),JSON.stringify(plan,null,2));record.planSha256=createHash('sha256').update(JSON.stringify(plan)).digest('hex');record.status='awaiting-review';}catch(error){record.status='failed';record.error=error.message;}finally{await persist();console.log(JSON.stringify(record));}
