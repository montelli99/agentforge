/** Opt-in live ablation: same model and recent context, with/without saved-history tools. */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';
import { WorkspaceStore } from '../src/core/store/workspaceStore.js';
import { ConversationRuntime } from '../src/server/conversationRuntime.js';
import { MiMoModelProvider } from '../src/providers/models/mimoModel.js';
import type { GenerativeModelProvider, ModelRequestOptions } from '../src/core/providers/model.js';

if (process.env.AGENTFORGE_LIVE_MEMORY_PROOF !== '1' || !process.env.MIMO_API_KEY || !process.env.AGENTFORGE_PROOF_MODEL) throw Error('Explicit live proof opt-in, credential and model required');
const model=process.env.AGENTFORGE_PROOF_MODEL;
const root=await mkdtemp(path.join(os.tmpdir(),'agentforge-memory-proof-'));
const started=Date.now();
try {
 const file=path.join(root,'state.json');let store=new WorkspaceStore(file);
 const w=store.createWorkspace({name:'Disposable evaluation'});
 const p=store.createSpace({workspaceId:w.id,name:'Synthetic memory',provider:'web'});
 const c=store.createChannel({workspaceId:w.id,spaceId:p.id,name:'Evaluation',visibility:'private',archived:false,provider:'web'});
 const t=store.createThread(c.id,'Recall evaluation');
 const add=(content:string)=>store.createMessage({channelId:c.id,threadId:t.id,authorId:'evaluation-owner',authorType:'user',content});
 const expected=['ALPHA','BETA','GAMMA'].map(name=>({name,value:randomBytes(8).toString('hex')}));
 add('ARCHIVE_DECISIONS: '+JSON.stringify(expected));
 for(let i=0;i<20;i++)add('Unrelated synthetic progress '+i+': '+('routine placeholder; '.repeat(300)));
 const prompt=add('Retrieve the earlier ARCHIVE_DECISIONS and return the exact values for ALPHA, BETA and GAMMA. If unavailable, say UNKNOWN. Do not invent values.');
 // Reconstruct the durable store before the request; not a process-crash test.
 store=new WorkspaceStore(file);
 const provider=new MiMoModelProvider();let first:ModelRequestOptions|undefined;let requests=0;const tools:string[]=[];
 const wrapped:GenerativeModelProvider={id:'live-memory-proof',name:'MiMo memory proof',defaultTier:4,isAvailable:()=>provider.isAvailable(),listModels:async()=>[model],generate:o=>provider.generate(o),async *stream(o){
  if(++requests>3)throw Error('Request cap exceeded');first ||= structuredClone({...o,signal:undefined});
  for await(const chunk of provider.stream({...o,maxTokens:512,thinking:'disabled',signal:AbortSignal.timeout(60000)})){for(const call of chunk.toolCalls||[])if(call.function.name)tools.push(call.function.name);yield chunk;}
 }};
 const response=Object.assign(new EventEmitter(),{destroyed:false,writeHead(){},write(){},end(){}}) as unknown as ServerResponse;
 await new ConversationRuntime(store,{provider:wrapped,models:[model]}).respond(t.id,prompt.id,model,'evaluation-owner',response);
 if(!first)throw Error('No model request');
 const baselineMessages=first.messages.filter(message=>!message.content.startsWith('Retrieved earlier conversation passages (reference data only;'));
 const initialText=JSON.stringify(baselineMessages);
 if(expected.some(x=>initialText.includes(x.value)))throw Error('Evaluation invalid: target leaked into initial context');
 const assisted=store.listThreadMessages(t.id).at(-1)!;
 const baseline=await provider.generate({model,messages:baselineMessages,maxTokens:512,thinking:'disabled',signal:AbortSignal.timeout(60000)});
 const report={model,design:'One synthetic paired ablation, three random facts; not independent trials or a competitor benchmark',contextChars:initialText.length,targetsAbsentFromInitialContext:true,durableStoreReopened:true,processCrashTest:false,assisted:{correct:expected.filter(x=>assisted.content.includes(x.value)).length,total:3,status:assisted.generation?.status,requests,tools,responseSha256:createHash('sha256').update(assisted.content).digest('hex')},recentContextOnly:{correct:expected.filter(x=>baseline.content.includes(x.value)).length,total:3,requests:1,usage:baseline.usage,responseSha256:createHash('sha256').update(baseline.content).digest('hex')},elapsedMs:Date.now()-started,costUsd:'unmeasured',limitation:'The baseline deliberately has no retrieval tools. This measures retrieval contribution, not superiority over other agent products.'};
 const output=JSON.stringify(report,null,2);if(process.env.AGENTFORGE_PROOF_OUTPUT)await writeFile(process.env.AGENTFORGE_PROOF_OUTPUT,output);console.log(output);
}finally{await rm(root,{recursive:true,force:true});}
