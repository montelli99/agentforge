import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {OperationalMemoryProvider} from '../src/providers/memory/operationalMemory.js';
import {reviewMemoryImport} from '../src/server/memoryImport.js';
import {runBoundedChild} from '../src/providers/models/boundedCliProcess.js';
const namespace='synthetic-migration';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
if(process.argv[2]==='--child'){
 const [file,projectId,phase]=process.argv.slice(3);
 const store=new WorkspaceStore(file);const memory=new OperationalMemoryProvider(store);
 const records=(await memory.query({namespace,projectId,limit:100})).map(item=>item.record);
 if(phase==='restore-delete'){
  assert.equal(records.length,2);
  assert.deepEqual(records.map(record=>record.content).sort(),['Synthetic launch color is blue.','Synthetic launch color is red.']);
  for(const record of records){
   assert.equal(record.metadata?.source,'synthetic-export');
   const remap=record.metadata?.agentforgeProjectRemap as {from:string;to:string;previous:{from:string;to:string}};
   assert.equal(remap.to,projectId);assert.equal(remap.previous.to,remap.from);
   assert.equal(record.version,2);assert.equal(record.revisions?.length,1);
   assert.equal(record.revisions![0].content,'Synthetic launch color is unconfirmed.');
   assert.equal(record.revisions![0].version,1);
  }
  assert.equal((await memory.query({namespace,projectId:'unrelated-project',limit:100})).length,0);
  for(const record of records)assert.equal(await memory.delete(namespace,record.id),true);
  console.log(JSON.stringify({phase,restored:2,deleted:2,provenancePreserved:true,twoHopProjectHistory:true,revisionHistoryPreserved:true,otherProjectEmpty:true}));
 }else{
  assert.equal(phase,'verify-deleted');assert.equal(records.length,0);
  console.log(JSON.stringify({phase,remaining:0}));
 }
}else{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-memory-migration-'));
 try{
  const source=new WorkspaceStore(path.join(root,'source.json'));
  const workspace=source.createWorkspace({name:'Synthetic source'});
  const project=source.createSpace({workspaceId:workspace.id,name:'Synthetic project',provider:'web'});
  const memory=new OperationalMemoryProvider(source);
  for(const color of ['blue','red']){
   const record=await memory.record({namespace,projectId:project.id,category:'general_fact',title:'Synthetic launch color',content:'Synthetic launch color is unconfirmed.',tags:['chat-context'],metadata:{source:'synthetic-export'}});
   memory.update(namespace,record.id,1,'synthetic-editor',{content:`Synthetic launch color is ${color}.`});
  }
  const exported={format:'agentforge-memory',schemaVersion:1,namespace,exportedAt:new Date().toISOString(),records:source.listOperationalMemories(namespace)};
  const archive=JSON.parse(JSON.stringify(exported));
  const destinationFile=path.join(root,'destination.json');const destination=new WorkspaceStore(destinationFile);
  const targetWorkspace=destination.createWorkspace({name:'Synthetic destination'});
  const target=destination.createSpace({workspaceId:targetWorkspace.id,name:'Migrated project',provider:'web'});
  const review=reviewMemoryImport(archive,namespace,destination,{[project.id]:target.id});
  assert.deepEqual(destination.importOperationalMemoryBatch(review.records,'synthetic-owner'),{imported:2,unchanged:0});
  assert.deepEqual(destination.importOperationalMemoryBatch(review.records,'synthetic-owner'),{imported:0,unchanged:2});
  const reexport={...exported,records:destination.listOperationalMemories(namespace)};
  const finalFile=path.join(root,'final.json');const finalStore=new WorkspaceStore(finalFile);
  const finalWorkspace=finalStore.createWorkspace({name:'Synthetic second migration'});
  const finalProject=finalStore.createSpace({workspaceId:finalWorkspace.id,name:'Second destination',provider:'web'});
  const secondReview=reviewMemoryImport(reexport,namespace,finalStore,{[target.id]:finalProject.id});
  assert.deepEqual(finalStore.importOperationalMemoryBatch(secondReview.records,'synthetic-owner'),{imported:2,unchanged:0});
  const changed=structuredClone(reexport);changed.records[1].content='Conflicting overwrite attempt';
  assert.throws(()=>reviewMemoryImport(changed,namespace,finalStore,{[target.id]:finalProject.id}),/conflicts/);
  assert.deepEqual(finalStore.listOperationalMemories(namespace),secondReview.records);
  const env:NodeJS.ProcessEnv={};
  for(const key of ['SystemRoot','WINDIR','PATH','Path','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
  const phases=[];
  for(const phase of ['restore-delete','verify-deleted']){
   const result=await runBoundedChild(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--child',finalFile,finalProject.id,phase],{cwd:process.cwd(),env,timeoutMs:30000,maxOutputBytes:65536});
   assert.equal(result.code,0,'Memory child acceptance failed');phases.push(JSON.parse(result.stdout));
  }
  console.log(JSON.stringify({passed:true,exportSha256:digest(exported),reviewSha256:review.digest,secondReviewSha256:secondReview.digest,conflictingOverwriteRefused:true,phases,scope:'Two-hop built-in memory migration with explicit project mapping, conflicting facts, revisions and provenance, duplicate import and durable deletion across fresh processes; no external provider or browser proof'}));
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
