/** Full pinned CLI with a local synthetic model service. Never a subscription proof. */
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import http from 'node:http';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
import {WorkspaceStore} from '../src/core/store/workspaceStore.ts';
import {NativeToolAuthorization} from '../src/core/runtime/nativeToolAuthorization.ts';
import {NativeToolBroker} from '../src/core/runtime/nativeToolBroker.ts';
import {NativeBrokerSession} from '../src/core/runtime/nativeBrokerSession.ts';
import {prepareNativeToolReview,authorizeReviewedNativeTool} from '../src/core/runtime/nativeToolReview.ts';
import {startNativeBrokerEndpoint} from '../src/providers/mcp/nativeBrokerEndpoint.ts';
import {geminiNativeBrokerPolicy} from '../src/providers/models/geminiNativePolicy.ts';
const bundle=process.argv[2];if(!bundle||!path.isAbsolute(bundle))throw Error('Absolute pinned CLI entry required');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-full-gemini-'));let connection,model;
try{
 const work=path.join(root,'work');await fs.mkdir(work);const home=path.join(root,'home');await fs.mkdir(path.join(home,'.gemini'),{recursive:true});
 const store=new WorkspaceStore(path.join(root,'workspace.json'));const task=store.createTask({title:'Synthetic',priority:'medium',status:'ready'});
 const gate=new NativeToolAuthorization(path.join(root,'host'),work);const artifact=path.join(work,'result.txt');let effects=0;
 const session=new NativeBrokerSession({taskId:task.id,operationId:'operation',sessionId:'session'},new NativeToolBroker(gate,async()=>{effects++;await fs.appendFile(artifact,'one\n');return {evidence:'synthetic'};}),{prepare:request=>prepareNativeToolReview(store,request),authorize:(id,request)=>authorizeReviewedNativeTool(store,gate,id,request)});
 connection=await startNativeBrokerEndpoint(session);let requests=0;const phases=[];
 model=http.createServer(async(req,res)=>{try{
  let body='';for await(const chunk of req){body+=chunk;if(body.length>1048576)throw Error('Request too large');}
  const payload=JSON.parse(body);requests++;if(requests>6)throw Error('Synthetic model request limit');
  const declarations=(payload.tools??[]).flatMap(tool=>tool.functionDeclarations??[]);
  const findTool=suffix=>{const tool=declarations.find(item=>item.name===suffix||item.name.endsWith('_'+suffix));assert.ok(tool,'Missing broker tool '+suffix);return tool.name;};
  let parts;
  if(phases.length===0){phases.push('review');parts=[{functionCall:{name:findTool('request_review'),args:{callId:'call',tool:'write',input:{text:'synthetic'}}}}];}
  else if(phases.length===1){const review=store.listApprovals()[0];assert.equal(review?.status,'pending');assert.equal(effects,0);store.resolveApproval({approvalId:review.id,status:'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});phases.push('execute');parts=[{functionCall:{name:findTool('execute_reviewed'),args:{reviewId:review.id,callId:'call',tool:'write',input:{text:'synthetic'}}}}];}
  else{assert.equal(effects,1);phases.push('done');parts=[{text:'Synthetic approved task completed.'}];}
  const reply={candidates:[{content:{role:'model',parts},finishReason:'STOP',index:0}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,totalTokenCount:15}};
  if(req.url.includes('streamGenerateContent')){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify(reply)+'\n\n');}else{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(reply));}
 }catch{res.writeHead(500);res.end('Synthetic protocol mismatch');}});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 const policy=path.join(root,'broker.toml');await fs.writeFile(policy,geminiNativeBrokerPolicy);
 await fs.writeFile(path.join(home,'.gemini','settings.json'),JSON.stringify({security:{auth:{selectedType:'gemini-api-key'},folderTrust:{enabled:false}},telemetry:{enabled:false},hooksConfig:{enabled:false},mcpServers:{'agentforge-broker':{url:connection.endpoint,type:'http',headers:{Authorization:'Bearer '+connection.token}}}}));
 const env={HOME:home,USERPROFILE:home,TEMP:root,TMP:root,GEMINI_CLI_HOME:home,GEMINI_API_KEY:'synthetic-local-only',GOOGLE_GEMINI_BASE_URL:`http://127.0.0.1:${model.address().port}`,GEMINI_CLI_SYSTEM_SETTINGS_PATH:path.join(root,'absent.json'),GEMINI_CLI_SYSTEM_DEFAULTS_PATH:path.join(root,'absent-defaults.json'),NO_BROWSER:'true'};
 for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(process.env[key])env[key]=process.env[key];
 const child=spawn(process.execPath,[bundle,'--model','gemini-2.5-flash','--prompt','Complete the synthetic task using the broker review and execution tools.','--admin-policy',policy,'--extensions','none','--allowed-mcp-server-names','agentforge-broker','--output-format','stream-json'],{cwd:work,env,stdio:['ignore','pipe','pipe'],windowsHide:true});
 let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
 const timer=setTimeout(()=>child.kill(),45000);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});clearTimeout(timer);
 if(code!==0||effects!==1){await fs.writeFile(path.join(root,'failure.log'),output);throw Error(`Synthetic CLI failed: exit=${code}, effects=${effects}, requests=${requests}; diagnostics=${root}`);}
 assert.equal(await fs.readFile(artifact,'utf8'),'one\n');assert.deepEqual(phases,['review','execute','done']);
 console.log(JSON.stringify({passed:true,scope:'Full official CLI with synthetic local model and synthetic owner approval; no subscription or Docker proof',requests,effects,phases}));
}finally{await connection?.close();if(model)await new Promise(resolve=>model.close(resolve));}
