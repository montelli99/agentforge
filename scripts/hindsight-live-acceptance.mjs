/** Opt-in, read-only live Hindsight proof. Never print credentials, query, bank or recalled text. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {builtModule} from './built-package-under-test.mjs';
const {HindsightMemoryProvider}=await builtModule('providers/memory/hindsightMemory.js');
const required=['AGENTFORGE_HINDSIGHT_PROOF_BANK','AGENTFORGE_HINDSIGHT_PROOF_QUERY','AGENTFORGE_HINDSIGHT_PROOF_EXPECTED','HINDSIGHT_API_KEY'];
if(process.env.AGENTFORGE_LIVE_HINDSIGHT!=='1')throw Error('Explicit AGENTFORGE_LIVE_HINDSIGHT=1 required; no request sent');
for(const name of required)if(!process.env[name]?.trim())throw Error('Missing '+name+'; no request sent');
let requests=0;const statuses=[];
const request=async(...args)=>{requests++;const response=await fetch(...args);statuses.push(response.status);return response;};
const provider=new HindsightMemoryProvider(process.env.AGENTFORGE_HINDSIGHT_PROOF_BANK,'synthetic-proof','synthetic-project',process.env.HINDSIGHT_API_KEY,request);
const query={namespace:'synthetic-proof',projectId:'synthetic-project',queryText:process.env.AGENTFORGE_HINDSIGHT_PROOF_QUERY,limit:8};
try{
 assert.deepEqual(await provider.query({...query,projectId:'other-project'}),[]);assert.equal(requests,0);
 const results=await provider.query(query);assert.equal(requests,1);assert(results.some(r=>r.record.content.includes(process.env.AGENTFORGE_HINDSIGHT_PROOF_EXPECTED)),'Expected recall not found');
 assert(results.every(r=>r.record.metadata?.readOnly===true&&r.record.metadata?.providerId==='hindsight'));
 await assert.rejects(provider.record({}),/read-only/);await assert.rejects(provider.delete('unused'),/read-only/);assert.equal(requests,1);
 console.log(JSON.stringify({passed:true,liveProvider:'hindsight',requests,httpStatuses:statuses,projectIsolation:true,expectedRecallFound:true,readOnlyEnforced:true,resultCount:results.length,resultDigest:createHash('sha256').update(JSON.stringify(results)).digest('hex'),limits:['Single selected-bank recall; no migration, outage, browser setup or deletion proof.','No recalled content or credentials included.']}));
}catch{console.log(JSON.stringify({passed:false,liveProvider:'hindsight',requests,httpStatuses:statuses,error:'Live recall acceptance failed; inspect connection and expected fixture locally.'}));process.exitCode=1;}
