import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {reserveComparisonAttempt} from './comparison-attempt.mjs';
import {finalizeComparisonAttempt} from './comparison-attempt.mjs';
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-attempt-'));await fs.writeFile(path.join(root,'fixture.json'),'{}');const manifest={status:'frozen',liveScoringAllowed:true,tasks:['synthetic'],trialsPerTask:1,files:[{path:'fixture.json',sha256:createHash('sha256').update('{}').digest('hex')}]};const manifestFile=path.join(root,'protocol.json');await fs.writeFile(manifestFile,JSON.stringify(manifest));return {manifest,manifestFile,sourceRoot:root,attemptRoot:path.join(root,'attempts'),task:'synthetic',arm:'deepseek',trial:1};}
test('concurrent duplicate attempts have exactly one durable reservation',async()=>{const f=await fixture();const results=await Promise.allSettled([reserveComparisonAttempt(f),reserveComparisonAttempt(f)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const saved=JSON.parse(await fs.readFile(path.join(f.attemptRoot,'synthetic-1-deepseek/reservation.json'),'utf8'));assert.equal(saved.status,'reserved');await assert.rejects(reserveComparisonAttempt(f),/EEXIST/);});
test('unfrozen protocol cannot reserve a slot',async()=>{const f=await fixture();f.manifest.status='development';await fs.writeFile(f.manifestFile,JSON.stringify(f.manifest));await assert.rejects(reserveComparisonAttempt(f),/not frozen/);await assert.rejects(fs.stat(f.attemptRoot),/ENOENT/);});
test('changed fixture rejected before creating attempt',async()=>{const f=await fixture();await fs.writeFile(path.join(f.sourceRoot,'fixture.json'),'[]');await assert.rejects(reserveComparisonAttempt(f),/changed/);await assert.rejects(fs.stat(f.attemptRoot),/ENOENT/);});
test('unknown arm and out-of-range repeat rejected',async()=>{const f=await fixture();await assert.rejects(reserveComparisonAttempt({...f,arm:'replacement'}),/Invalid/);await assert.rejects(reserveComparisonAttempt({...f,trial:2}),/Invalid/);});
test('failed outcome keeps unknown usage and cannot be replaced by success',async()=>{
 const f=await fixture();const {directory}=await reserveComparisonAttempt(f);
 const outcome={status:'timed_out',artifactPassed:false,workflowPassed:false,elapsedMs:100,requests:1,usage:null};
 await finalizeComparisonAttempt(directory,outcome);
 await assert.rejects(finalizeComparisonAttempt(directory,{...outcome,status:'passed',artifactPassed:true,workflowPassed:true}),/EEXIST/);
 const saved=JSON.parse(await fs.readFile(path.join(directory,'outcome.json'),'utf8'));
 assert.equal(saved.status,'timed_out');assert.equal(saved.usage,null);assert.match(saved.reservationSha256,/^[a-f0-9]{64}$/);
});
test('concurrent finalization publishes exactly one complete outcome',async()=>{
 const f=await fixture();const {directory}=await reserveComparisonAttempt(f);
 const outcome={status:'failed',artifactPassed:true,workflowPassed:false,elapsedMs:1,requests:1,usage:{inputTokens:10,outputTokens:5}};
 const results=await Promise.allSettled([finalizeComparisonAttempt(directory,outcome),finalizeComparisonAttempt(directory,outcome)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(JSON.parse(await fs.readFile(path.join(directory,'outcome.json'),'utf8')).workflowPassed,false);
 assert.deepEqual((await fs.readdir(directory)).sort(),['outcome.json','reservation.json']);
});
test('unsupported fields and incomplete success cannot publish an outcome',async()=>{
 const f=await fixture();const {directory}=await reserveComparisonAttempt(f);
 const outcome={status:'passed',artifactPassed:true,workflowPassed:false,elapsedMs:1,requests:1,usage:null};
 await assert.rejects(finalizeComparisonAttempt(directory,outcome));
 await assert.rejects(finalizeComparisonAttempt(directory,{...outcome,status:'failed',rawProviderBody:'not accepted'}));
 await assert.rejects(fs.stat(path.join(directory,'outcome.json')),/ENOENT/);
});
