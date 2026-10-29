import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const baseline=path.resolve(process.argv[2]??'');
const pkg=JSON.parse(await fs.readFile(path.join(baseline,'node_modules/@deepseek-ai/dsh/package.json'),'utf8'));
assert.equal(pkg.version,'0.2.1-rc.3');
const home=await fs.mkdtemp(path.join(os.tmpdir(),'af-dsh-config-'));
const overlay=`- id: session-telemetry-otel
  disabled: true
- id: session-title-llm
  disabled: true
- id: agent-default-model
  config:
    provider: evaluation
    model: mimo-v2.6-flash
- id: llm-pi-ai
  config:
    providers:
      evaluation:
        apiKeyEnv: AF_EVALUATION_PROXY_KEY
        api: openai-completions
        baseURL: http://127.0.0.1:19999/v1
        retryPolicy:
          mode: normal
          maxRetries: 0
        models:
          - id: mimo-v2.6-flash
            contextWindow: 65536
        defaultMaxTokens: 2000
`;
const file=path.join(home,'comparison.yml');await fs.writeFile(file,overlay);
const env=Object.fromEntries(['SystemRoot','WINDIR','PATH','PATHEXT','COMSPEC'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
Object.assign(env,{HOME:home,USERPROFILE:home,APPDATA:home,LOCALAPPDATA:home,TEMP:home,TMP:home,DSH_HOME:home,NO_COLOR:'1'});
const result=spawnSync(process.execPath,[path.join(baseline,'node_modules/@deepseek-ai/dsh/lib/bin.js'),'headless','--patch',file,'--dump-config'],{cwd:home,env,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
assert.equal(result.status,0,result.stderr);
const output=result.stdout;
const telemetry=output.split(/(?=^- id: )/m).find(row=>row.startsWith('- id: session-telemetry-otel\n')||row.startsWith('- id: session-telemetry-otel\r\n'));
assert(telemetry, 'Telemetry entry missing');assert.match(telemetry,/^  disabled: true$/m);
for(const pattern of [/id: session-telemetry-otel\r?\n(?:[^\n]*\n)*?  disabled: true/,/provider: evaluation/,/baseURL: http:\/\/127\.0\.0\.1:19999\/v1/,/maxRetries: 0/,/defaultMaxTokens: 2000/])assert.match(output,pattern);
const evidence={recordedAt:new Date().toISOString(),packageVersion:pkg.version,overlaySha256:createHash('sha256').update(overlay).digest('hex'),overlay,configurationComposed:true,isolatedHome:true,inheritedCredentials:false,providerRequests:0,taskSubmitted:false,limitations:['Composition check only: provider schema loading and isolated execution are not yet proven.','Endpoint is a deliberately inactive placeholder, not a live provider.']};
await fs.writeFile('docs/evidence/p09-deepseek-comparison-config.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
