import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const protocolBytes=await fs.readFile(new URL('./fixtures/release-evaluation-v3/protocol.json',import.meta.url));
const protocol=JSON.parse(protocolBytes),hash=b=>createHash('sha256').update(b).digest('hex');
const records=[];
for(const task of protocol.taskOrder)for(let trial=1;trial<=3;trial++)for(const arm of trial%2?['agentforge','direct']:['direct','agentforge']){
 const attempt=`${task}-${trial}-${arm}`,file=`p09-v3-${attempt}.json`;
 const bytes=await fs.readFile(new URL('../docs/evidence/'+file,import.meta.url));
 const evidence=JSON.parse(bytes),r=evidence.result;
 assert.equal(evidence.attempt,attempt);assert.equal(r.protocolSha256,hash(protocolBytes));
 const af=arm==='agentforge';
 const usages=af?[...(r.chatAccounting??[]).map(x=>x.usage),r.providerUsage]:[r.usage];
 let inputTokens=0,outputTokens=0;
 for(const u of usages){assert(u,'Missing reported usage');inputTokens+=u.inputTokens??u.prompt_tokens;outputTokens+=u.outputTokens??u.completion_tokens;}
 assert(Number.isFinite(inputTokens)&&Number.isFinite(outputTokens));
 records.push({attempt,task,trial,arm,evidence:file,evidenceSha256:hash(bytes),archiveSha256:evidence.package.archiveSha256.toLowerCase(),
  artifactPassed:af?r.independentEvaluation?.passed===true:r.score?.passed===true,
  journeyPassed:af?r.passed===true:null,error:r.error??null,
  requests:af?r.providerRequests:r.requests,inputTokens,outputTokens,cost:null,
  elapsedMs:af?r.totalElapsedMs:r.wallElapsedMs??r.planningElapsedMs,providerMs:r.providerElapsedMs,reviewMs:r.reviewWaitMs??0});
}
assert.equal(records.length,18);assert.equal(new Set(records.map(r=>r.archiveSha256)).size,1);
const summary=Object.fromEntries(['agentforge','direct'].map(arm=>{const rows=records.filter(r=>r.arm===arm);return [arm,{
 attempts:rows.length,artifactPasses:rows.filter(r=>r.artifactPassed).length,
 journeyPasses:arm==='agentforge'?rows.filter(r=>r.journeyPassed).length:null,
 requests:rows.reduce((n,r)=>n+r.requests,0),inputTokens:rows.reduce((n,r)=>n+r.inputTokens,0),outputTokens:rows.reduce((n,r)=>n+r.outputTokens,0),
 totalElapsedMs:rows.reduce((n,r)=>n+r.elapsedMs,0),providerMs:rows.reduce((n,r)=>n+r.providerMs,0),reviewMs:rows.reduce((n,r)=>n+r.reviewMs,0),cost:null}];}));
const report={protocolSha256:hash(protocolBytes),summary,limitations:[
 'Three synthetic tasks with three repeats each; repeats are not independent task samples. No population reliability or superiority inference.',
 'AgentForge first ledger attempt failed because Git changed input line endings. Fixture harness repaired at 8ad0611; later attempts use that repair. Runtime archive unchanged, but this is not an unchanged-harness experiment.',
 'Artifact accuracy and full AgentForge journey are separate outcomes; the direct baseline has no recovery or artifact-chat requirement.',
 'Equal maximum request budget, unequal actual requests. Token totals and provider time include all attempts; monetary cost unavailable.',
 'Final chat failed to read the artifact in shipment trial 3 despite correct execution. Failure retained; runtime repair is separate.',
 'Recorded timing includes manual review; raw elapsed, provider and review time are reported separately.'],records};
await fs.writeFile(new URL('../docs/evidence/p09-v3-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
