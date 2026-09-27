/** Local HTTP protocol acceptance. Fixture provider, never a paid model or account. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentForgeWebServer } from '../dist/server/webServer.js';
import { WorkspaceStore } from '../dist/core/store/workspaceStore.js';
import { OpenAIModelProvider } from '../dist/providers/models/openaiModel.js';

let captured;
let providerDisconnected=false;
const upstream=http.createServer(async(req,res)=>{
  let body='';for await(const part of req)body+=part;captured=JSON.parse(body);
  const prompt=captured.messages.at(-1).content;
  if(prompt==='fail'){res.writeHead(503);res.end('Fixture failure');return;}
  res.writeHead(200,{'Content-Type':'text/event-stream'});
  res.write('data: '+JSON.stringify({id:'fixture',choices:[{delta:{content:'Fixture response: '}}]})+'\n\n');
  const timer=setTimeout(()=>{res.write('data: '+JSON.stringify({id:'fixture',choices:[{delta:{content:'completed'},finish_reason:'stop'}]})+'\n\n');res.end('data: [DONE]\n\n');},prompt==='cancel'?10000:50);
  res.on('close',()=>{clearTimeout(timer);providerDisconnected=true;});
});
await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
const upstreamPort=upstream.address().port;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-stream-'));
const store=new WorkspaceStore(path.join(directory,'workspace.json'));
const project=store.createSpace({workspaceId:'ws-default',name:'Stream fixture',instructions:'Use concise explanations.'});
const channel=store.createChannel({spaceId:project.id,name:'Fixture channel',visibility:'private',provider:'web'});
for(const [id,projectId,tags,archived] of [['included',project.id,['chat-context'],false],['other','another-project',['chat-context'],false],['untagged',project.id,[],false],['archived',project.id,['chat-context'],true],['unscoped',undefined,['chat-context'],false]])store.saveOperationalMemory({id,namespace:'fixture-chat',projectId,tags,archived,category:'general_fact',title:id,content:'MEMORY_'+id,version:2,createdAt:new Date().toISOString()});
const provider=new OpenAIModelProvider('fixture-key',`http://127.0.0.1:${upstreamPort}`,'fixture','Local protocol fixture');
const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const server=new AgentForgeWebServer(store,port,undefined,undefined,{conversation:{provider,models:['fixture-stream'],memoryNamespace:'fixture-chat'}});
const base=`http://127.0.0.1:${port}`;
const post=(route,body,method='POST')=>fetch(base+route,{method,headers:{'Content-Type':'application/json','Connection':'close'},body:JSON.stringify(body)});
const read=route=>fetch(base+route,{headers:{Connection:'close'}}).then(r=>r.json());
async function prompt(text){const thread=await(await post('/api/threads',{channelId:channel.id,title:'Fixture '+text})).json();const message=await(await post('/api/messages',{channelId:channel.id,threadId:thread.id,content:text})).json();return {thread,message};}
try{
  await server.start();
  if(process.argv.includes('--preview')){
    console.log('FIXTURE PREVIEW '+base+' — explicit local protocol fixture, not a real model.');
    await new Promise(resolve=>process.once('SIGINT',resolve));
  }else{
  const normal=await prompt('hello');
  const response=await post('/api/threads/'+normal.thread.id+'/respond',{messageId:normal.message.id,model:'fixture-stream'});
  assert.equal(response.status,200);const events=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(events.at(-1).status,'complete');assert.equal(captured.messages[0].content.includes('Use concise explanations.'),true);
  const supplied=JSON.stringify(captured.messages);assert.ok(supplied.includes('MEMORY_included'));for(const excluded of ['other','untagged','archived','unscoped'])assert.ok(!supplied.includes('MEMORY_'+excluded));
  const messages=await read('/api/threads/'+normal.thread.id+'/messages');assert.equal(messages.at(-1).content,'Fixture response: completed');assert.equal(messages.at(-1).generation.status,'complete');
  assert.deepEqual(messages.at(-1).generation.contextMemories,[{id:'included',title:'included',version:2}]);
  assert.equal((await post('/api/threads/'+normal.thread.id+'/respond',{messageId:normal.message.id,model:'fixture-stream'})).status,409);
  const preserved=await read('/api/threads/'+normal.thread.id+'/messages');
  const copied=await(await post('/api/threads/'+normal.thread.id+'/branch',{throughMessageId:preserved.at(-1).id})).json();
  const copiedHistory=await read('/api/threads/'+copied.id+'/messages');
  assert.equal(copiedHistory.at(-1).generation.promptMessageId,copiedHistory[0].id,'branched response references the copied prompt');
  const alternative=await(await post('/api/threads/'+copied.id+'/branch',{throughMessageId:copiedHistory.at(-1).generation.promptMessageId})).json();
  const alternativePrompt=(await read('/api/threads/'+alternative.id+'/messages')).at(-1);
  const alternateResponse=await post('/api/threads/'+alternative.id+'/respond',{messageId:alternativePrompt.id,model:'fixture-stream'});
  assert.equal(JSON.parse((await alternateResponse.text()).trim().split('\n').at(-1)).status,'complete');
  assert.deepEqual(await read('/api/threads/'+normal.thread.id+'/messages'),preserved,'regeneration leaves original unchanged');
  const slow=await prompt('cancel');providerDisconnected=false;
  const running=await post('/api/threads/'+slow.thread.id+'/respond',{messageId:slow.message.id,model:'fixture-stream'});
  const reader=running.body.getReader();let output='';while(!output.includes('delta'))output+=new TextDecoder().decode((await reader.read()).value);
  assert.equal((await post('/api/threads/'+slow.thread.id+'/respond',{messageId:slow.message.id,model:'fixture-stream'})).status,409);
  assert.equal((await post('/api/threads/'+slow.thread.id,{archived:true},'PATCH')).status,409);
  assert.equal((await post('/api/threads/'+slow.thread.id+'/messages/'+slow.message.id,{content:'changed',expectedContent:'cancel'},'PATCH')).status,409);
  assert.equal((await(await post('/api/threads/'+slow.thread.id+'/stop',{})).json()).stopped,true);
  while(true){const part=await reader.read();if(part.done)break;output+=new TextDecoder().decode(part.value);}reader.releaseLock();
  assert.equal(JSON.parse(output.trim().split('\n').at(-1)).status,'stopped');
  assert.equal((await read('/api/threads/'+slow.thread.id+'/messages')).at(-1).generation.status,'stopped');
  const failed=await prompt('fail');const failure=await post('/api/threads/'+failed.thread.id+'/respond',{messageId:failed.message.id,model:'fixture-stream'});assert.equal(JSON.parse((await failure.text()).trim().split('\n').at(-1)).status,'failed');
  assert.equal((await read('/api/threads/'+failed.thread.id+'/messages')).length,1);
  const restarted=new WorkspaceStore(path.join(directory,'workspace.json'));assert.equal(restarted.listThreadMessages(slow.thread.id).at(-1).generation.status,'stopped');
  assert.equal(providerDisconnected,true);
  console.log('PASS: HTTP provider streaming, project context, persistence, duplicate-run guard, edit/archive guard, stop and upstream cancellation, provider failure. Fixture only; paid-provider and browser streaming acceptance remain separate.');
  }
}finally{await server.stop();upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));}
