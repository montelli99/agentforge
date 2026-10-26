import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
for(const script of ['release-evaluation-v2-direct.mjs','release-evaluation-v2-execute.mjs','execution-setup-browser-acceptance.mjs'])test(script+' refuses invalid protocol before starting external work',()=>{
 const result=spawnSync(process.execPath,['scripts/'+script],{encoding:'utf8',windowsHide:true,env:{...process.env,AGENTFORGE_EVALUATION_CASE:'stock-transfer-balances'}});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Live evaluation scoring disabled/);assert.doesNotMatch(result.stdout,/evidenceDirectory|awaiting-review/);
});
