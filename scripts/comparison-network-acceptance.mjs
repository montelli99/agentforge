import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

// Synthetic topology acceptance, never a scored model comparison.
const output=process.argv[2];
if(!output)throw Error('Supply a new evidence output path');
const handle=await fs.open(output,'wx');
const prefix=`af-network-${crypto.randomUUID()}`;
const network=`${prefix}-internal`,gateway=`${prefix}-gateway`;
const image=JSON.parse(await fs.readFile('docs/evidence/p09-deepseek-container-startup.json','utf8')).imageId;
const proxySource=await fs.readFile('scripts/comparison-proxy.mjs','utf8');
const usageSource=await fs.readFile('scripts/reported-provider-usage.mjs','utf8');
const token=crypto.randomBytes(24).toString('hex');
const syntheticSecret=crypto.randomBytes(24).toString('hex');
const run=(args,input)=>{
 const result=spawnSync('docker',args,{input,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 if(result.status!==0)throw Error(`Docker operation failed: ${args[0]} (${result.status})`);
 return result.stdout;
};
const limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','64','--memory','128m','--cpus','1','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=16777216'];
let madeNetwork=false,madeContainer=false;
try{
 run(['network','create','--internal',network]);madeNetwork=true;
 const program=`${usageSource}\n${proxySource.replace("import {reportedUsage} from './reported-provider-usage.mjs';",'')}
 const proxy=comparisonProxy({token:${JSON.stringify(token)},apiKey:${JSON.stringify(syntheticSecret)},endpoint:'https://synthetic.invalid',model:'fixed-model',maxRequests:1,maxOutputTokens:12,fetchImpl:async(url,options)=>{
 const body=JSON.parse(options.body);
 if(options.headers.Authorization!==${JSON.stringify('Bearer '+syntheticSecret)}||body.model!=='fixed-model'||body.n!==1)throw Error('Boundary mismatch');
 return new Response(JSON.stringify({choices:[{message:{content:'OK'}}],usage:{prompt_tokens:3,completion_tokens:1}}),{headers:{'content-type':'application/json'}});
 }});proxy.server.listen(19999,'0.0.0.0');`;
 // Source and synthetic secret travel over stdin; never client environment/mounts.
 run(['create','--name',gateway,'--network',network,'--network-alias','accounting',...limits,'-i','--entrypoint','node',image,'--input-type=module','-e',"let code='';for await(const chunk of process.stdin)code+=chunk;await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));" ]);madeContainer=true;
 run(['network','connect','bridge',gateway]);
 run(['start',gateway]);
 // Docker attach keeps stdin open by default; exec receives finite stdin instead.
 run(['exec','-i',gateway,'node','--input-type=module','-e',"let code='';for await(const chunk of process.stdin)code+=chunk;await import('node:fs/promises').then(fs=>fs.writeFile('/tmp/proxy.mjs',code));"],program);
 run(['exec','-d',gateway,'node','/tmp/proxy.mjs']);
 const client=`import assert from 'node:assert/strict';
 let first;for(let i=0;i<30;i++){try{first=await fetch('http://accounting:19999/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+${JSON.stringify(token)},'content-type':'application/json'},body:JSON.stringify({model:'wrong',n:5,messages:[]}),signal:AbortSignal.timeout(1000)});break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.equal(first?.status,200);assert.equal((await first.json()).choices[0].message.content,'OK');
 const capped=await fetch('http://accounting:19999/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+${JSON.stringify(token)}},body:JSON.stringify({messages:[]})});assert.equal(capped.status,429);
 const denied=await fetch('http://accounting:19999/v1/chat/completions',{method:'POST',body:'{}'});assert.equal(denied.status,401);
 let externalBlocked=false;try{await fetch('http://1.1.1.1',{signal:AbortSignal.timeout(1500)});}catch{externalBlocked=true;}assert.ok(externalBlocked);
 assert.ok(!process.env.MIMO_API_KEY);assert.ok(!process.env.OPENAI_API_KEY);
 console.log(JSON.stringify({proxyResponse:200,overBudget:429,unauthenticated:401,externalBlocked,providerCredentialInEnvironment:false}));`;
 const observed=JSON.parse(run(['run','--rm','--network',network,...limits,'-i','--entrypoint','node',image,'--input-type=module'],client));
 const state=JSON.parse(run(['inspect',gateway]))[0];
 assert.deepEqual(state.HostConfig.PortBindings,{});
 const evidence={recordedAt:new Date().toISOString(),status:'passed',syntheticOnly:true,realProviderRequests:0,imageId:image,proxySha256:crypto.createHash('sha256').update(proxySource).digest('hex'),observed,publishedPorts:0,clientNetwork:'internal-only',gatewayNetworks:2,limitations:['Synthetic upstream only; no live provider or matched model score.','One direct external address tested; Docker internal-network configuration supplies the broader isolation boundary.']};
 await handle.writeFile(JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}finally{
 await handle.close();
 if(madeContainer)run(['rm','-f',gateway]);
 if(madeNetwork)run(['network','rm',network]);
}
