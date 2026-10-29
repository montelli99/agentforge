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
test('missing, oversized, directory and redirected artifact submissions fail',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-v4-boundary-'));const c=await comparisonCase('invoice-adjustments');await c.stage(root);
 assert.equal((await c.score(root)).passed,false);
 await fs.mkdir(path.join(root,'artifacts'));const output=path.join(root,'artifacts/result.json');
 await fs.writeFile(output,' '.repeat(65537));assert.equal((await c.score(root)).reason,'invalid-file');
 await fs.unlink(output);await fs.mkdir(output);assert.equal((await c.score(root)).reason,'invalid-file');await fs.rmdir(output);
 await fs.rmdir(path.join(root,'artifacts'));
 const outside=await fs.mkdtemp(path.join(os.tmpdir(),'af-v4-outside-'));await fs.writeFile(path.join(outside,'result.json'),JSON.stringify(answers['invoice-adjustments']));
 await fs.symlink(outside,path.join(root,'artifacts'),process.platform==='win32'?'junction':'dir');
 assert.equal((await c.score(root)).reason,'invalid-file');
});
test('wrong result values and changed array ordering cannot pass',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-v4-wrong-'));const c=await comparisonCase('invoice-adjustments');await c.stage(root);await fs.mkdir(path.join(root,'artifacts'));const output=path.join(root,'artifacts/result.json');
 const wrong=structuredClone(answers['invoice-adjustments']);wrong.totalBalanceCents++;await fs.writeFile(output,JSON.stringify(wrong));assert.equal((await c.score(root)).passed,false);
 const reordered=structuredClone(answers['invoice-adjustments']);reordered.invoices.reverse();await fs.writeFile(output,JSON.stringify(reordered));assert.equal((await c.score(root)).passed,false);
});
test('failure diagnostics distinguish invalid JSON and mismatch without copying model text',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-v4-diagnostic-'));
 try{
  const c=await comparisonCase('stock-allocation');await c.stage(root);await fs.mkdir(path.join(root,'artifacts'));
  const output=path.join(root,'artifacts/result.json');await fs.writeFile(output,'not JSON synthetic-private-text');
  assert.deepEqual(await c.score(root),{passed:false,reason:'invalid-json'});
  await fs.writeFile(output,JSON.stringify({...answers['stock-allocation'],remaining:{blue:99},'synthetic-private-field':'synthetic-private-value'}));
  const result=await c.score(root);
  assert.deepEqual(result,{passed:false,reason:'incorrect-output',mismatchedFields:['remaining'],extraFieldCount:1});
  assert(!JSON.stringify(result).includes('synthetic-private'));
 }finally{assert.equal(path.dirname(root),os.tmpdir());await fs.rm(root,{recursive:true,force:true});}
});
