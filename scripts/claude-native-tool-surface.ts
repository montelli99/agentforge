import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runBoundedChild} from '../src/providers/models/boundedCliProcess.js';
import {WorkspaceStore} from '../src/core/store/workspaceStore.js';
import {NativeToolAuthorization} from '../src/core/runtime/nativeToolAuthorization.js';
import {NativeToolBroker} from '../src/core/runtime/nativeToolBroker.js';
import {NativeBrokerSession} from '../src/core/runtime/nativeBrokerSession.js';
import {prepareNativeToolReview,authorizeReviewedNativeTool} from '../src/core/runtime/nativeToolReview.js';
import {startNativeBrokerEndpoint} from '../src/providers/mcp/nativeBrokerEndpoint.js';
const executable=process.argv[2];
if(!executable||!path.isAbsolute(executable))throw Error('Supply the pinned official executable');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-claude-surface-'));
const tools=new Set<string>();let requests=0;
const negative=process.argv.includes('--negative');
const governed=process.argv.includes('--governed');
const store=new WorkspaceStore(path.join(root,'workspace.json'));
const task=store.createTask({title:'Synthetic native acceptance',priority:'medium',status:'ready'});
const work=path.join(root,'work');await fs.mkdir(work);
const gate=new NativeToolAuthorization(path.join(root,'host'),work);
let effects=0,duplicateRejected=false;
const session=new NativeBrokerSession({taskId:task.id,operationId:'synthetic-operation',sessionId:'synthetic-session'},new NativeToolBroker(gate,async()=>{effects++;await fs.appendFile(path.join(work,'result.txt'),'one\n');return {evidence:"synthetic"};}),{prepare:request=>prepareNativeToolReview(store,request),authorize:(id,request)=>authorizeReviewedNativeTool(store,gate,id,request)});
let connection:Awaited<ReturnType<typeof startNativeBrokerEndpoint>>|undefined;
const marker=path.join(root,'forbidden.txt');const brokerCalls:string[]=[];
let forbiddenRejected=false,toolRequests=0;
const api=http.createServer(async(req,res)=>{
 try{
 const chunks:Buffer[]=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>2097152)throw Error('Synthetic request too large');chunks.push(Buffer.from(chunk));}
 if(req.url?.split('?')[0]==='/v1/messages'){
  requests++;const body=JSON.parse(Buffer.concat(chunks).toString());
  if(requests>12)throw Error('Synthetic request budget exceeded');
  for(const message of body.messages??[])for(const block of Array.isArray(message.content)?message.content:[]){
   if(block.type==='tool_result'&&block.tool_use_id==='forbidden-call'&&block.is_error===true)forbiddenRejected=true;
   if(block.type==='tool_result'&&block.tool_use_id==='duplicate-call'&&block.is_error===true)duplicateRejected=true;
  }
  for(const tool of body.tools??[])tools.add(tool.name);
  const brokerTurn=(body.tools??[]).some((tool:{name:string})=>tool.name==='mcp__agentforge-broker__request_review');
  if(brokerTurn)toolRequests++;
  let content:unknown[]=negative&&brokerTurn&&toolRequests===1?[{type:'tool_use',id:'forbidden-call',name:'Bash',input:{command:'echo forbidden > forbidden.txt'}}]
   :negative&&brokerTurn&&toolRequests===2?[{type:'tool_use',id:'allowed-call',name:'mcp__agentforge-broker__read_result',input:{}}]
   :[{type:'text',text:'Synthetic inspection complete.'}];
  if(governed&&brokerTurn){
   const operation={callId:'write-once',tool:'write',input:{text:'synthetic'}};
   if(toolRequests===1)content=[{type:'tool_use',id:'review-call',name:'mcp__agentforge-broker__request_review',input:operation}];
   else if(toolRequests===2||toolRequests===3){
    const review=store.listApprovals()[0];
    if(!review)throw Error('Missing synthetic review');
    if(toolRequests===2){if(effects!==0)throw Error('Effect before approval');store.resolveApproval({approvalId:review.id,status:'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});}
    content=[{type:'tool_use',id:toolRequests===2?'execute-call':'duplicate-call',name:'mcp__agentforge-broker__execute_reviewed',input:{...operation,reviewId:review.id}}];
   }
  }
  const reply={id:'synthetic-message-'+requests,type:'message',role:'assistant',model:body.model,content,stop_reason:(content[0] as {type:string}).type==='tool_use'?'tool_use':'end_turn',stop_sequence:null,usage:{input_tokens:1,output_tokens:1}};
  if(body.stream){
   res.writeHead(200,{'content-type':'text/event-stream'});
   const event=(type:string,value:object)=>res.write('event: '+type+'\ndata: '+JSON.stringify({type,...value})+'\n\n');
   event('message_start',{message:{...reply,content:[],stop_reason:null}});
   const block=content[0] as {type:string;input?:unknown};
   event('content_block_start',{index:0,content_block:block.type==='tool_use'?{...block,input:{}}:block});
   if(block.type==='tool_use')event('content_block_delta',{index:0,delta:{type:'input_json_delta',partial_json:JSON.stringify(block.input)}});
   event('content_block_stop',{index:0});
   event('message_delta',{delta:{stop_reason:reply.stop_reason,stop_sequence:null},usage:{output_tokens:1}});
   event('message_stop',{});res.end();
  }else{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(reply));}
 }else{res.writeHead(404);res.end('{}');}
 }catch{res.writeHead(500);res.end('{"error":"synthetic acceptance protocol mismatch"}');}
});
const broker=http.createServer(async(req,res)=>{
 try{
 if(req.method!=='POST'){res.writeHead(405);res.end();return;}
 const chunks:Buffer[]=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)throw Error('Synthetic MCP request too large');chunks.push(Buffer.from(chunk));}
 const body=JSON.parse(Buffer.concat(chunks).toString());
 if(body.id===undefined){res.writeHead(202);res.end();return;}
 if(body.method==='tools/call')brokerCalls.push(body.params?.name);
 const result=body.method==='initialize'?{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'agentforge-broker',version:'test'}}
 :body.method==='tools/call'?{content:[{type:'text',text:'Synthetic saved result'}]}
 :{tools:['request_review','execute_reviewed','read_result'].map(name=>({name,description:'Synthetic inspection only',inputSchema:{type:'object',properties:{}}}))};
 res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({jsonrpc:'2.0',id:body.id,result}));
 }catch{res.writeHead(400);res.end('{}');}
});
const listen=(server:http.Server)=>new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const url=(server:http.Server)=>'http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port;
try{
 await listen(api);await listen(broker);
 if(governed)connection=await startNativeBrokerEndpoint(session);
 const mcp=path.join(root,'mcp.json');await fs.writeFile(mcp,JSON.stringify({mcpServers:{'agentforge-broker':{type:'http',url:connection?.endpoint??url(broker)+'/mcp',...(connection?{headers:{Authorization:'Bearer '+connection.token}}:{})}}}));
 const env:NodeJS.ProcessEnv={HOME:root,USERPROFILE:root,TEMP:root,TMP:root,CLAUDE_CONFIG_DIR:path.join(root,'profile'),ANTHROPIC_API_KEY:'synthetic-local-test',ANTHROPIC_BASE_URL:url(api),DISABLE_UPDATES:'1',DISABLE_TELEMETRY:'1',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1'};
 for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(process.env[key])env[key]=process.env[key];
 const result=await runBoundedChild(executable,['--print','--restricted','--tools','','--strict-mcp-config','--mcp-config',mcp,'--setting-sources','','--settings',JSON.stringify({disableAllHooks:true,autoMemoryEnabled:false}),'--allowedTools','mcp__agentforge-broker__request_review,mcp__agentforge-broker__execute_reviewed,mcp__agentforge-broker__read_result','--no-session-persistence','--verbose','--output-format','stream-json','--model','claude-sonnet-4-6','--max-turns','8'],{cwd:root,env,input:'Return a short synthetic completion. Do not execute tools.',timeoutMs:45000,maxOutputBytes:1048576});
 const names=[...tools].sort();
 const markerExists=await fs.stat(marker).then(()=>true,()=>false);
 const artifact=governed?await fs.readFile(path.join(work,'result.txt'),'utf8').catch(()=>null):undefined;
 const passed=result.code===0&&requests>0&&names.some(name=>name==='mcp__agentforge-broker__execute_reviewed')&&names.every(name=>name==='EndConversation'||name.startsWith('mcp__agentforge-broker__'))&&(!negative||(forbiddenRejected&&!markerExists&&brokerCalls.length===1&&brokerCalls[0]==='read_result'))&&(!governed||(effects===1&&artifact==='one\n'&&duplicateRejected));
 console.log(JSON.stringify({passed,exitCode:result.code,requests,tools:names,negative,governed,effects,duplicateRejected,forbiddenRejected,markerExists,brokerCalls,scope:'Installed CLI and host broker against local synthetic API; no subscription, Docker or OS isolation proof'}));
 if(!passed)process.exitCode=1;
}finally{
 try{await connection?.close();}
 finally{
  api.closeAllConnections();broker.closeAllConnections();
  await Promise.all([new Promise<void>(resolve=>api.close(()=>resolve())),new Promise<void>(resolve=>broker.close(()=>resolve()))]);
  await fs.rm(root,{recursive:true,force:true});
 }
}
