import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {loadEvaluationCase} from './release-evaluation-contract.mjs';
const root=fileURLToPath(new URL('./fixtures/release-evaluation-v2/',import.meta.url));
test('v2 fixtures have explicit schemas, frozen bytes and evaluator-only expected answers',async()=>{
 const protocol=JSON.parse(await fs.readFile(path.join(root,'protocol.json'),'utf8'));
 for(const id of protocol.taskOrder){const fixture=JSON.parse(await fs.readFile(path.join(root,id+'.json'),'utf8'));const item=await loadEvaluationCase(root,id);assert(fixture.prompt.includes('exactly'));const work=await fs.mkdtemp(path.join(os.tmpdir(),'af-eval-v2-'));try{await item.stage(work);assert.deepEqual(await fs.readdir(work),['input.json']);assert.equal(Object.hasOwn(item,'expected'),false);await fs.writeFile(path.join(work,'result.json'),JSON.stringify(fixture.expected));assert.equal((await item.score(work)).passed,true);await fs.writeFile(path.join(work,'result.json'),JSON.stringify({...fixture.expected,extra:true}));assert.equal((await item.score(work)).passed,false);}finally{await fs.rm(work,{recursive:true,force:true});}}
});

test('v2 expected results independently match the stated rules',async()=>{
 const read=async id=>JSON.parse(await fs.readFile(path.join(root,id+'.json'),'utf8'));
 const stock=await read('stock-transfer-balances');const keys=new Set(stock.input.opening.map(x=>JSON.stringify([x.sku,x.warehouse])));
 for(const t of stock.input.transfers){keys.add(JSON.stringify([t.sku,t.from]));keys.add(JSON.stringify([t.sku,t.to]));}
 const rows=[...keys].map(k=>{const [sku,warehouse]=JSON.parse(k);return {sku,warehouse,quantity:stock.input.opening.filter(x=>x.sku===sku&&x.warehouse===warehouse).reduce((s,x)=>s+x.quantity,0)+stock.input.transfers.filter(x=>x.sku===sku&&x.to===warehouse).reduce((s,x)=>s+x.quantity,0)-stock.input.transfers.filter(x=>x.sku===sku&&x.from===warehouse).reduce((s,x)=>s+x.quantity,0)};}).sort((a,b)=>a.sku===b.sku?(a.warehouse<b.warehouse?-1:1):(a.sku<b.sku?-1:1));assert.deepEqual({rows},stock.expected);
 const dates=await read('deadline-classification');const buckets={overdue:[],dueToday:[],upcoming:[],closed:[]};for(const r of dates.input.records)buckets[r.closed?'closed':r.dueDate<dates.input.asOf?'overdue':r.dueDate===dates.input.asOf?'dueToday':'upcoming'].push(r.id);for(const values of Object.values(buckets))values.sort();assert.deepEqual(buckets,dates.expected);
 const revisions=await read('latest-approved-revisions');const chosen=revisions.input.records.filter(r=>r.approved&&!revisions.input.records.some(other=>other.approved&&other.id===r.id&&other.revision>r.revision)).map(({id,revision,value})=>({id,revision,value})).sort((a,b)=>a.id<b.id?-1:1);assert.deepEqual({rows:chosen,ignoredCount:revisions.input.records.length-chosen.length},revisions.expected);
});
