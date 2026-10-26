import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {randomUUID,createHash} from 'node:crypto';
if(process.env.AGENTFORGE_LIVE_PLANNING_PROOF!=='1'||!process.env.MIMO_API_KEY)throw Error('Explicit live proof opt-in required');
const invoice=process.env.AGENTFORGE_OPENCLAW_INVOICE_PROOF==='1';
const exec=promisify(execFile),image='sha256:cd39617de1e1675bfe786ea54d5ec375b38101b9493c98f2c99f93a6054944f0';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-openclaw-live-')),name='af-openclaw-live-'+randomUUID().slice(0,8),token=randomUUID();let requests=0,created=false;
const docker=async args=>(await exec('docker',args,{timeout:180000,windowsHide:true,maxBuffer:1048576})).stdout.trim();
const proxy=http.createServer(async(req,res)=>{try{
 if(req.headers.authorization!=='Bearer '+token||req.url!=='/v1/chat/completions'||requests>=(invoice?8:4)){res.writeHead(403);res.end();return;}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>500000)throw Error('Request too large');}
 const body=JSON.parse(raw);requests++;body.model='mimo-v2.6-flash';body.max_tokens=invoice?1500:600;body.thinking={type:'disabled'};
 const upstream=await fetch('https://token-plan-sgp.xiaomimimo.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.MIMO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json'});res.end(await upstream.text());
 }catch{res.writeHead(502);res.end('{}');}});
await new Promise(r=>proxy.listen(0,'0.0.0.0',r));
try{
 const config={gateway:{mode:'local',auth:{mode:'token',token}},agents:{defaults:{model:{primary:'proof/mimo-v2.6-flash'}}},models:{providers:{proof:{baseUrl:'http://host.docker.internal:'+proxy.address().port+'/v1',apiKey:token,api:'openai-completions',models:[{id:'mimo-v2.6-flash',name:'Synthetic proof',reasoning:false,input:['text'],contextWindow:32000,maxTokens:1500}]}}}};
 const prompt=invoice?(await fs.readFile('scripts/fixtures/useful-task/PROTOCOL.txt','utf8')).split('Acceptance:')[0].replaceAll('inputs/invoices.json','/tmp/invoices.json').replaceAll('artifacts/report.json','/tmp/report.json'):'Synthetic accounting task: paid 1200 cents, refunded 250 cents, paid 300 cents. Return only the net cents and explain the calculation. Do not use tools or access any files.';
 const hashes={};for(const file of ['invoices.json','verify.mjs','PROTOCOL.txt'])hashes[file]=createHash('sha256').update(await fs.readFile('scripts/fixtures/useful-task/'+file)).digest('hex');await fs.writeFile(path.join(root,'fixture-hashes.json'),JSON.stringify(hashes));
 await fs.writeFile(path.join(root,'config.json'),JSON.stringify(config));
 await fs.writeFile(path.join(root,'probe.mjs'),`import fs from 'node:fs/promises';import {OpenClawGatewayTransport} from './transport.mjs';const config=JSON.parse(await fs.readFile('/tmp/config.json','utf8'));const c=new OpenClawGatewayTransport({url:'ws://127.0.0.1:18789',token:config.gateway.auth.token,identityPath:'/tmp/proof-identity.json',enableTaskDelegation:true});try{await c.connectWhenReady(30000);const session='agent:main:agentforge-live-synthetic';const receipt=await c.submitSessionTurn(session,${JSON.stringify(prompt)}, 'proof-'+Date.now());let result;for(let i=0;i<90;i++){result=await c.inspectRun(receipt.runId);if(result.status!=='timeout')break;await new Promise(r=>setTimeout(r,1000));}const history=await c.readSessionHistory(session);console.log(JSON.stringify({receipt,result,history}));}finally{c.stop();}`);
 await docker(['create','--name',name,'--user','node','--cap-drop=ALL','--security-opt=no-new-privileges','--memory=2g','--pids-limit=256','-e','OPENCLAW_CONFIG_PATH=/tmp/config.json','-e','HOME=/tmp/af-home',image,'gateway','run','--allow-unconfigured','--bind','loopback','--port','18789','--auth','token']);created=true;
 for(const file of ['config.json','probe.mjs'])await docker(['cp',path.join(root,file),name+':/tmp/'+file]);
 await docker(['cp','dist/providers/channels/openClawGatewayTransport.js',name+':/tmp/transport.mjs']);
 if(invoice)await docker(['cp','scripts/fixtures/useful-task/invoices.json',name+':/tmp/invoices.json']);
 await docker(['start',name]);console.log('Evidence directory: '+root);
 const output=await docker(['exec',name,'node','/tmp/probe.mjs']);await fs.writeFile(path.join(root,'result.txt'),output);
 const observed=JSON.parse(output);if(observed.result?.status!=='ok'||(!invoice&&!(/\b1250\b/.test(observed.result?.terminalReply?.text??''))))throw Error('OpenClaw result did not pass the independent arithmetic check'); console.log(JSON.stringify({container:name,requests,runId:observed.receipt.runId,status:observed.result.status,response:observed.result.terminalReply.text,evidenceDirectory:root}));
 if(invoice){await docker(['cp',name+':/tmp/report.json',path.join(root,'report.json')]);const checked=await exec(process.execPath,['scripts/fixtures/useful-task/verify.mjs',path.join(root,'report.json')],{timeout:10000,windowsHide:true});await fs.writeFile(path.join(root,'invoice-check.txt'),checked.stdout);console.log('Independent invoice check passed');}
}catch(error){await fs.writeFile(path.join(root,'failure.json'),JSON.stringify({message:error.message,requests}));console.log('Failed proof retained: '+root);throw error;}
finally{if(created)await docker(['stop','--time','5',name]);proxy.closeAllConnections();await new Promise(r=>proxy.close(r));}



