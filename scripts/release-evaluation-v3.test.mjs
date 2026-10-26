import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {loadEvaluationCase} from './release-evaluation-contract.mjs';
const directory=fileURLToPath(new URL('./fixtures/release-evaluation-v3/',import.meta.url));
test('v3 frozen expected answers follow each stated rule independently',async()=>{
 const read=async id=>{await loadEvaluationCase(directory,id);return JSON.parse(await fs.readFile(directory+id+'.json','utf8'));};
 const a=await read('payment-ledger');assert.deepEqual(a.expected,{balances:a.input.opening.map(o=>({account:o.account,cents:o.cents+a.input.entries.filter(e=>e.account===o.account).reduce((sum,e)=>sum+(e.kind==='credit'?e.cents:-e.cents),0)})).sort((x,y)=>x.account<y.account?-1:1)});
 const b=await read('shipment-coverage');assert.deepEqual(b.expected,{orders:b.input.orders.map(o=>{const shipped=b.input.shipments.filter(s=>s.order===o.id&&!s.cancelled).reduce((n,s)=>n+s.units,0);return {id:o.id,shipped,remaining:Math.max(0,o.ordered-shipped)};}).sort((x,y)=>x.id<y.id?-1:1)});
 const c=await read('access-policy');const output={allowed:[],denied:[]};for(const r of c.input.requests){const u=c.input.users.find(u=>u.id===r.user);output[u?.active&&u.grants.includes(r.resource)&&!u.denies.includes(r.resource)?'allowed':'denied'].push(r.id);}output.allowed.sort();output.denied.sort();assert.deepEqual(c.expected,output);
});

test('v3 journey exposes only inputs and carries pinned execution rules',async()=>{
 const previous=process.env.AGENTFORGE_EVALUATION_VERSION;process.env.AGENTFORGE_EVALUATION_VERSION='3';
 const {evaluationJourneyCase}=await import('./evaluation-journey-case.mjs');const {evaluationLimits}=await import('./evaluation-limits.mjs');const {evaluationExecutionInstructions}=await import('./evaluation-execution-instructions.mjs');
 try{const budget=await evaluationLimits();assert.equal(budget.limits.commandTimeoutMs,10000);for(const id of ['payment-ledger','shipment-coverage','access-policy']){const item=await evaluationJourneyCase(id);assert(item.prompt.endsWith(evaluationExecutionInstructions));assert(!Object.hasOwn(item,'expected'));assert.equal(item.artifactPath,'artifacts/result.json');}}
 finally{if(previous===undefined)delete process.env.AGENTFORGE_EVALUATION_VERSION;else process.env.AGENTFORGE_EVALUATION_VERSION=previous;}
});
