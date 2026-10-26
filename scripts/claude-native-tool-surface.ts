import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runBoundedChild} from '../src/providers/models/boundedCliProcess.js';
const executable=process.argv[2];
if(!executable||!path.isAbsolute(executable))throw Error('Supply the pinned official executable');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-claude-surface-'));
const tools=new Set<string>();let requests=0;
const negative=process.argv.includes('--negative');
const marker=path.join(root,'forbidden.txt');const brokerCalls:string[]=[];
let forbiddenRejected=false,toolRequests=0;
const api=http.createServer(async(req,res)=>{
 const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
 if(req.url?.split('?')[0]==='/v1/messages'){
  requests++;const body=JSON.parse(Buffer.concat(chunks).toString());
  for(const message of body.messages??[])for(const block of Array.isArray(message.content)?message.content:[]){
   if(block.type==='tool_result'&&block.tool_use_id==='forbidden-call'&&block.is_error===true)forbiddenRejected=true;
  }
  for(const tool of body.tools??[])tools.add(tool.name);
  const brokerTurn=(body.tools??[]).some((tool:{name:string})=>tool.name==='mcp__agentforge-broker__read_result');
  if(brokerTurn)toolRequests++;
  const content=negative&&brokerTurn&&toolRequests===1?[{type:'tool_use',id:'forbidden-call',name:'Bash',input:{command:'echo forbidden > forbidden.txt'}}]
   :negative&&brokerTurn&&toolRequests===2?[{type:'tool_use',id:'allowed-call',name:'mcp__agentforge-broker__read_result',input:{}}]
   :[{type:'text',text:'Synthetic inspection complete.'}];
  const reply={id:'synthetic-message-'+requests,type:'message',role:'assistant',model:body.model,content,stop_reason:content[0].type==='tool_use'?'tool_use':'end_turn',stop_sequence:null,usage:{input_tokens:1,output_tokens:1}};
  if(body.stream){
   res.writeHead(200,{'content-type':'text/event-stream'});
   const event=(type:string,value:object)=>res.write('event: '+type+'\ndata: '+JSON.stringify({type,...value})+'\n\n');
   event('message_start',{message:{...reply,content:[],stop_reason:null}});
   event('content_block_start',{index:0,content_block:content[0]});
   event('content_block_stop',{index:0});
   event('message_delta',{delta:{stop_reason:reply.stop_reason,stop_sequence:null},usage:{output_tokens:1}});
   event('message_stop',{});res.end();
  }else{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(reply));}
 }else{res.writeHead(404);res.end('{}');}
});
const broker=http.createServer(async(req,res)=>{
 if(req.method!=='POST'){res.writeHead(405);res.end();return;}
 const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
 const body=JSON.parse(Buffer.concat(chunks).toString());
 if(body.id===undefined){res.writeHead(202);res.end();return;}
 if(body.method==='tools/call')brokerCalls.push(body.params?.name);
 const result=body.method==='initialize'?{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'agentforge-broker',version:'test'}}
 :body.method==='tools/call'?{content:[{type:'text',text:'Synthetic saved result'}]}
 :{tools:['request_review','execute_reviewed','read_result'].map(name=>({name,description:'Synthetic inspection only',inputSchema:{type:'object',properties:{}}}))};
 res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({jsonrpc:'2.0',id:body.id,result}));
});
const listen=(server:http.Server)=>new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=(server:http.Server)=>'http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port;
try{
 await listen(api);await listen(broker);
 const mcp=path.join(root,'mcp.json');await fs.writeFile(mcp,JSON.stringify({mcpServers:{'agentforge-broker':{type:'http',url:url(broker)+'/mcp'}}}));
 const env:NodeJS.ProcessEnv={HOME:root,USERPROFILE:root,TEMP:root,TMP:root,CLAUDE_CONFIG_DIR:path.join(root,'profile'),ANTHROPIC_API_KEY:'synthetic-local-test',ANTHROPIC_BASE_URL:url(api),DISABLE_UPDATES:'1',DISABLE_TELEMETRY:'1',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1'};
 for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(process.env[key])env[key]=process.env[key];
 const result=await runBoundedChild(executable,['--print','--restricted','--tools','','--strict-mcp-config','--mcp-config',mcp,'--setting-sources','','--settings',JSON.stringify({disableAllHooks:true,autoMemoryEnabled:false}),'--allowedTools','mcp__agentforge-broker__request_review,mcp__agentforge-broker__execute_reviewed,mcp__agentforge-broker__read_result','--no-session-persistence','--verbose','--output-format','stream-json','--model','claude-sonnet-4-6','--max-turns','8'],{cwd:root,env,input:'Return a short synthetic completion. Do not execute tools.',timeoutMs:45000,maxOutputBytes:1048576});
 const names=[...tools].sort();
 const markerExists=await fs.stat(marker).then(()=>true,()=>false);
 const passed=result.code===0&&requests>0&&names.some(name=>name==='mcp__agentforge-broker__execute_reviewed')&&names.every(name=>name==='EndConversation'||name.startsWith('mcp__agentforge-broker__'))&&(!negative||(forbiddenRejected&&!markerExists&&brokerCalls.length===1&&brokerCalls[0]==='read_result'));
 console.log(JSON.stringify({passed,exitCode:result.code,requests,tools:names,negative,forbiddenRejected,markerExists,brokerCalls,scope:'Installed CLI tool enforcement against local synthetic API; no subscription or OS isolation proof'}));
 if(!passed)process.exitCode=1;
}finally{
 api.closeAllConnections();broker.closeAllConnections();
 await Promise.all([new Promise<void>(resolve=>api.close(()=>resolve())),new Promise<void>(resolve=>broker.close(()=>resolve()))]);
 await fs.rm(root,{recursive:true,force:true});
}
