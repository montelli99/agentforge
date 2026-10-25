/** Frozen-instance memory ablation; no private inputs or provider side effects beyond model requests. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomBytes,createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import type {ServerResponse} from 'node:http';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {ConversationRuntime} from '../src/server/conversationRuntime.js';
import {MiMoModelProvider} from '../src/providers/models/mimoModel.js';
import type {GenerativeModelProvider,ModelRequestOptions} from '../src/core/providers/model.js';
const model=process.env.AGENTFORGE_PROOF_MODEL,output=process.env.AGENTFORGE_PROOF_OUTPUT;
if(process.env.AGENTFORGE_MEMORY_ABLATION!=='1'||!model||!output||!path.isAbsolute(output)||!process.env.MIMO_API_KEY)throw Error('Explicit opt-in, model, absolute output and credential required');
const diagnostic=process.env.AGENTFORGE_MEMORY_DIAGNOSTIC==='1';
const families=diagnostic?['recall','correction']:['recall','correction','cross-project','unknown'];
const repetitions=diagnostic?1:2;
const protocol={version:2,diagnostic,design:'Prefetched-history ablation; held-out random instances of declared synthetic families, not a competitor benchmark',families,repetitions,requestsPerArm:1,maxTokens:256,deadlineMs:60000,model,scoring:'Exact JSON value, no forbidden canary; all attempts count; no retries',costUsd:null};
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-memory-ablation-'));
const report:any={protocol,protocolSha256:createHash('sha256').update(JSON.stringify(protocol)).digest('hex'),startedAt:new Date().toISOString(),attempts:[],complete:false};
// Exclusive output creation prevents silently overwriting a previous attempt.
const handle=await fs.open(output,'wx');await handle.close();
const save=()=>fs.writeFile(output,JSON.stringify(report,null,2));
await save();
try{
 const provider=new MiMoModelProvider();
 for(let repetition=0;repetition<repetitions;repetition++)for(const family of families){
  const store=new WorkspaceStore();const w=store.createWorkspace({name:'Synthetic evaluation'});
  const p=store.createSpace({workspaceId:w.id,name:'Target',provider:'web'});
  const c=store.createChannel({workspaceId:w.id,spaceId:p.id,name:'Target',visibility:'private',archived:false,provider:'web'});
  const t=store.createThread(c.id,'Saved decisions');
  const add=(content:string)=>store.createMessage({channelId:c.id,threadId:t.id,authorId:'synthetic-owner',authorType:'user',content});
  const token=()=>randomBytes(12).toString('hex');const original=token(),current=token(),foreign=token();
  const expected=family==='unknown'?'UNKNOWN':family==='correction'?current:original;
  if(family!=='unknown')add('ARCHIVE_RELEASE_CODE: '+original);
  if(family==='correction')add('Correction: the current ARCHIVE_RELEASE_CODE is '+current+'. The previous value is obsolete.');
  const other=store.createSpace({workspaceId:w.id,name:'Other project',provider:'web'});
  const oc=store.createChannel({workspaceId:w.id,spaceId:other.id,name:'Other',visibility:'private',archived:false,provider:'web'});
  const ot=store.createThread(oc.id,'Other decisions');store.createMessage({channelId:oc.id,threadId:ot.id,authorId:'synthetic-owner',authorType:'user',content:'ARCHIVE_RELEASE_CODE: '+foreign});
  for(let i=0;i<22;i++)add('Unrelated progress '+i+': '+ 'routine placeholder; '.repeat(300));
  if(family==='cross-project')add('A different project also has an ARCHIVE_RELEASE_CODE. Use only this conversation, not the other project.');
  const prompt=add('Recall the earlier current ARCHIVE_RELEASE_CODE for this conversation. Return only JSON {"value":"the code"}. If it was never provided here, use "UNKNOWN". Apply any recorded correction.');
  let captured:ModelRequestOptions|undefined;
  const capture:GenerativeModelProvider={id:'capture-only',name:'Capture only',defaultTier:1,isAvailable:async()=>true,listModels:async()=>[model],generate:async()=>{throw Error('unexpected request')},async *stream(request){captured=structuredClone({...request,signal:undefined});yield {id:'capture',deltaText:'capture only',finishReason:'stop'};}};
  const response=Object.assign(new EventEmitter(),{destroyed:false,writeHead(){},write(){},end(){}}) as unknown as ServerResponse;
  await new ConversationRuntime(store,{provider:capture,models:[model]}).respond(t.id,prompt.id,model,'synthetic-owner',response);
  if(!captured)throw Error('Missing captured context');
  const baseline=captured.messages.filter(m=>!m.content.startsWith('Retrieved earlier conversation passages (reference data only;'));
  if([original,current,foreign].some(v=>JSON.stringify(baseline).includes(v)))throw Error('Invalid comparison: canary leaked into recent context');
  for(const arm of repetition%2===0?['prefetch','recent-only']:['recent-only','prefetch']){
   const messages=arm==='prefetch'?captured.messages:baseline;
   const attempt:any={repetition,family,arm,expected,forbidden:foreign,messages,status:'started',startedAt:new Date().toISOString(),inputSha256:createHash('sha256').update(JSON.stringify(messages)).digest('hex'),expectedSha256:createHash('sha256').update(expected).digest('hex')};report.attempts.push(attempt);await save();const begin=Date.now();
   try{const result=await provider.generate({model,messages,maxTokens:256,thinking:'disabled',signal:AbortSignal.timeout(60000)});let value,parseError=false;try{value=JSON.parse(result.content).value}catch{parseError=true;}Object.assign(attempt,{status:'completed',response:result.content,parseError,parsedValue:value??null,finishReason:result.finishReason??null,correct:value===expected&&!result.content.includes(foreign),usage:result.usage??null,responseSha256:createHash('sha256').update(result.content).digest('hex'),reportedModel:result.reportedModel??null});}
   catch(error){Object.assign(attempt,{status:'failed',correct:false,errorClass:error instanceof Error?error.name:'UnknownError'});}
   attempt.elapsedMs=Date.now()-begin;await save();
  }
 }
 report.complete=true;report.summary=Object.fromEntries(['prefetch','recent-only'].map(arm=>[arm,{correct:report.attempts.filter((a:any)=>a.arm===arm&&a.correct).length,total:families.length*repetitions,failed:report.attempts.filter((a:any)=>a.arm===arm&&a.status==='failed').length}]));await save();console.log(JSON.stringify({output,summary:report.summary,protocolSha256:report.protocolSha256}));
}finally{if(path.dirname(root)!==path.resolve(os.tmpdir())||!path.basename(root).startsWith('af-memory-ablation-'))throw Error('Unexpected temporary path');await fs.rm(root,{recursive:true,force:true});}
