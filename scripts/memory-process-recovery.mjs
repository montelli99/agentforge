import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {WorkspaceStore} from '../dist/core/store/workspaceStore.js';
import {AgentForgeWebServer} from '../dist/server/webServer.js';
process.env.AGENTFORGE_AUTH_STRICT='1';
if(process.argv[2]==='child'){
 const root=process.argv[3];
 const server=new AgentForgeWebServer(new WorkspaceStore(path.join(root,'workspace.json')),0,undefined,undefined,{settingsFilePath:path.join(root,'settings.json')});
 await server.start();process.send({url:server.getBaseUrl()});
}else{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-memory-process-')));
 const file=path.join(root,'workspace.json'),store=new WorkspaceStore(file);
 const workspace=store.createWorkspace({name:'Synthetic recovery'});
 const project=store.createSpace({workspaceId:workspace.id,name:'Synthetic notes',provider:'web'});
 store.createUser({username:'synthetic-proof-owner',displayName:'Synthetic owner',role:'owner',password:'Synthetic login password'});
 const vault=path.join(root,'notes');await fs.mkdir(vault);await fs.writeFile(path.join(vault,'selected.md'),'Synthetic memory survives process death.');
 let child;
 const start=async()=>{
  child=fork(fileURLToPath(import.meta.url),['child',root],{stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Server startup timed out')),30000);
   child.once('message',message=>{clearTimeout(timer);resolve(message.url);});
   child.once('exit',()=>{clearTimeout(timer);reject(Error('Server exited before readiness: '+stderr.slice(0,500)));});
  });
 };
 const stop=async()=>{if(child&&child.exitCode===null){const ended=once(child,'exit');child.kill('SIGKILL');await ended;}};
 const login=async url=>{const response=await fetch(url+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'synthetic-proof-owner',password:'Synthetic login password'})});assert.equal(response.status,200);return (await response.json()).token;};
 const request=async(url,token,route,body)=>fetch(url+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{
  let url=await start(),token=await login(url);
  const saved=await request(url,token,'/api/memory/connection',{action:'obsidian',namespace:'synthetic',projectId:project.id,root:vault,files:['selected.md'],confirmSharing:true,remember:true,passphrase:'Synthetic restore passphrase'});assert.equal(saved.status,200);
  const firstPid=child.pid;await stop();url=await start();assert.notEqual(child.pid,firstPid);token=await login(url);
  const before=await (await request(url,token,'/api/chat/status')).json();assert.deepEqual(before.projectMemoryConnections,[]);
  const wrong=await request(url,token,'/api/memory/connection',{action:'restore',projectId:project.id,passphrase:'Wrong synthetic passphrase'});assert.equal(wrong.status,400);
  const restored=await request(url,token,'/api/memory/connection',{action:'restore',projectId:project.id,passphrase:'Synthetic restore passphrase'});assert.equal(restored.status,200);
  assert.ok((await restored.json()).status.projectMemoryConnections.some(item=>item.projectId===project.id&&item.providerId==='obsidian'));
  assert.equal(await fs.readFile(path.join(vault,'selected.md'),'utf8'),'Synthetic memory survives process death.');
  const evidence={passed:true,requirement:'P07/P03',separateProcesses:true,forcedTermination:true,noAutomaticSharing:true,wrongPassphraseRefused:true,explicitRestore:true,noteUnchanged:true,limitations:['Authenticated HTTP acceptance; browser journey is covered separately.','No remote provider tested.']};
  const destination=process.argv[2]??path.join(root,'evidence.json');await fs.writeFile(destination,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
 }finally{await stop();}
}
