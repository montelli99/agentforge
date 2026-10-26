import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {evaluationJourneyCase} from './evaluation-journey-case.mjs';
test('journey scores submitted bytes and rejects modified input and extra output',async()=>{
 const item=await evaluationJourneyCase('deadline-classification');const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-journey-contract-'));
 try{await item.stage(root);assert.deepEqual(await fs.readdir(root),['input.json']);assert.equal(Object.hasOwn(item,'expected'),false);assert(item.prompt.includes('artifacts/result.json'));await fs.mkdir(path.join(root,'artifacts'));
 const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/release-evaluation-v2/deadline-classification.json',import.meta.url),'utf8'));
 await fs.writeFile(path.join(root,item.artifactPath),JSON.stringify(fixture.expected));assert.equal((await item.verify(root)).passed,true);
 await fs.writeFile(path.join(root,item.artifactPath),JSON.stringify({...fixture.expected,extra:true}));assert.equal((await item.verify(root)).passed,false);
 await fs.writeFile(path.join(root,item.artifactPath),JSON.stringify(fixture.expected));const original=await fs.readFile(path.join(root,'input.json'),'utf8');await fs.writeFile(path.join(root,'input.json'),original.replace('2027','2028'));assert.equal((await item.verify(root)).reason,'input-modified');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('journey refuses unknown case before staging',async()=>{await assert.rejects(evaluationJourneyCase('../unknown'),/Unknown frozen case/);});
test('journey refuses directory junction as artifact submission',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-journey-link-'));const external=await fs.mkdtemp(path.join(os.tmpdir(),'af-journey-target-'));
 try{const item=await evaluationJourneyCase('deadline-classification');await item.stage(root);await fs.symlink(external,path.join(root,'artifacts'),process.platform==='win32'?'junction':'dir');assert.equal((await item.verify(root)).reason,'invalid-submission-file');}
 finally{await fs.rm(path.join(root,'artifacts'),{force:true});await fs.rm(root,{recursive:true,force:true});await fs.rm(external,{recursive:true,force:true});}
});

