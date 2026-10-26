import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {comparisonCase} from './comparison-case.mjs';
const answers={
 'invoice-adjustments':{invoices:[{id:'INV-A',balanceCents:12000},{id:'INV-B',balanceCents:-800},{id:'INV-C',balanceCents:8000}],totalBalanceCents:19200},
 'stock-allocation':{orders:[{id:'O-A',allocated:5},{id:'O-B',allocated:0},{id:'O-E',allocated:0},{id:'O-C',allocated:5},{id:'O-D',allocated:0}],remaining:{blue:2,red:0,green:0}},
 'ticket-routing':{tickets:[{id:'T1',queue:'priority'},{id:'T2',queue:'security'},{id:'T3',queue:'billing'},{id:'T4',queue:'billing'},{id:'T5',queue:'general'}],counts:{security:1,priority:1,billing:2,general:1}}
};
for(const [id,answer] of Object.entries(answers))test(id+' independently specified answer and corruption rejection',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-v4-score-'));const c=await comparisonCase(id);await c.stage(root);assert.deepEqual(await fs.readdir(root),['input.json']);await fs.mkdir(path.join(root,'artifacts'));const output=path.join(root,'artifacts/result.json');await fs.writeFile(output,JSON.stringify(answer));assert.deepEqual(await c.score(root),{passed:true});
 await fs.writeFile(output,JSON.stringify({...answer,extra:true}));assert.equal((await c.score(root)).passed,false);
 await fs.writeFile(output,JSON.stringify(answer));const input=path.join(root,'input.json');await fs.writeFile(input,(await fs.readFile(input,'utf8')).replace(' ','\t'));assert.equal((await c.score(root)).reason,'input-changed');
});
