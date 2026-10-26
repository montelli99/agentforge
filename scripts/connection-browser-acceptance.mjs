import {builtModule} from './built-package-under-test.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {chromium} from 'playwright';
const {WorkspaceStore}=await builtModule('core/store/workspaceStore.js');
const {AgentForgeWebServer}=await builtModule('server/webServer.js');
const executable=process.env.AGENTFORGE_BROWSER_EXECUTABLE;
if(!executable||!path.isAbsolute(executable))throw Error('Select an absolute Chromium executable.');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-connections-browser-'));
process.env.AGENTFORGE_AUTH_STRICT='1';
const options={settingsFilePath:path.join(root,'settings.json')};
const workspaceFile=path.join(root,'workspace.json');
const store=new WorkspaceStore(workspaceFile);
const workspace=store.createWorkspace({name:'Synthetic chat workspace'});
const project=store.createSpace({workspaceId:workspace.id,name:'Synthetic chat project',provider:'web'});
store.createChannel({workspaceId:workspace.id,spaceId:project.id,name:'General',provider:'agentforge',visibility:'private'});
const taskId='connected-planner-proof',stamp=new Date().toISOString();
store.createTask({id:taskId,projectId:project.id,title:'Draft using restored connection',description:'Generate a Node command that prints a synthetic greeting.',priority:'medium',status:'ready',createdAt:stamp,updatedAt:stamp,contract:{id:'connected-planner-contract',taskId,version:1,repository:{baseBranch:'main',baseSha:'a'.repeat(40)},workspace:{requireIsolatedWorktree:true},scope:{allowedPaths:['artifacts/**'],protectedPaths:['.env'],maxFilesChanged:1},authority:{externalMessage:false,productionWrite:false,deployment:false,forcePush:false,deleteFiles:false,networkOutbound:false},requiredChecks:[],completion:{requireEvidencePack:true,requireHumanApproval:true},createdAt:stamp}});
const plannedCommands=[{checkName:'custom_script',command:'node -e "console.log(123)"',timeoutMs:10000}];
let server=new AgentForgeWebServer(store,0,undefined,undefined,options),browser;
const local=process.env.AGENTFORGE_BROWSER_LOCAL==='1';const route=local?'local':'compatible';
const key='synthetic-credential-not-a-real-provider-key';
const passphrase='Synthetic connection vault password';
let requests=0;const received=[];
const provider=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk;
 received.push({url:req.url,authorization:req.headers.authorization,body:JSON.parse(raw)});requests++;
 if(!JSON.parse(raw).stream){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{role:'assistant',content:JSON.stringify({commands:plannedCommands})},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:20,total_tokens:30}}));return;}
 res.writeHead(200,{'Content-Type':'text/event-stream'});
 res.write('data: '+JSON.stringify({choices:[{delta:{content:'Synthetic response '},finish_reason:null}]})+'\n\n');
 await new Promise(resolve=>setTimeout(resolve,1500));
 res.end('data: '+JSON.stringify({choices:[{delta:{content:'after vault recovery'},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');
});
await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));
try{
 await server.start();browser=await chromium.launch({headless:true,executablePath:executable});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.getBaseUrl());
 await page.locator('input[name=displayName]').fill('Synthetic owner');
 await page.locator('input[name=password]').fill('Synthetic owner password');
 await page.getByRole('button',{name:'Secure & continue',exact:true}).click();
 if(!await page.getByLabel('Models and routing',{exact:true}).isVisible())await page.locator('.nav-group-title').filter({hasText:'Connections'}).click();await page.getByLabel('Models and routing',{exact:true}).click();
 for(const label of [/Use a subscription/,local?/Run a local model/:/Use an API key/]){
  await page.getByRole('button',{name:label}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-pressed')),'true','Selected route retains keyboard focus after redraw');
 }

 await page.getByRole('button',{name:'Continue',exact:true}).click();
 if(!local){await page.locator('.sg-body label').filter({hasText:'Provider'}).locator('select').selectOption('compatible');assert.equal(await page.evaluate(()=>document.activeElement?.tagName),'SELECT','Provider selection retains focus');}
 await page.getByLabel('API base URL',{exact:true}).fill('http://127.0.0.1:'+provider.address().port+'/v1');
 await page.getByLabel('Model name',{exact:true}).fill('synthetic-model');
 if(!local)await page.getByLabel('Dedicated API key',{exact:true}).fill(key);
 await page.getByLabel('Private connection-store passphrase',{exact:true}).fill(passphrase);
 await page.getByLabel('Private connection-store passphrase',{exact:true}).focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Save and connect');await page.keyboard.press('Enter');
 await page.getByText('Web chat connection configured. No paid request was sent.',{exact:false}).waitFor();
 await page.waitForFunction(()=>document.activeElement?.textContent==='Save and connect');
 if(!local)assert.equal(await page.getByLabel('Dedicated API key',{exact:true}).inputValue(),'');
 assert.equal(await page.getByLabel('Private connection-store passphrase',{exact:true}).inputValue(),'');
 const vault=fs.readFileSync(path.join(root,'connections.encrypted.json'),'utf8');
 assert.ok(!vault.includes(key)&&!vault.includes(passphrase));
 assert.ok(!fs.readFileSync(workspaceFile,'utf8').includes(key));
 const oldUrl=server.getBaseUrl();await server.stop();
 server=new AgentForgeWebServer(new WorkspaceStore(workspaceFile),Number(new URL(oldUrl).port),undefined,undefined,options);
 await server.start();await page.reload();

 if(await page.locator('input[name=username]').isVisible()){
  await page.locator('input[name=username]').fill('owner');await page.locator('input[name=password]').fill('Synthetic owner password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 }
 if(!await page.getByLabel('Models and routing',{exact:true}).isVisible())await page.locator('.nav-group-title').filter({hasText:'Connections'}).click();await page.getByLabel('Models and routing',{exact:true}).click();
  const before=await page.request.get(oldUrl+'/api/chat/status');assert.equal((await before.json()).configured,false);
 await page.getByLabel('Private connection-store passphrase',{exact:true}).fill(passphrase);
 await page.getByRole('button',{name:'Unlock saved connections',exact:true}).focus();await page.keyboard.press('Enter');
 await page.getByText('Web chat connection configured. No paid request was sent.',{exact:false}).waitFor();
 await page.waitForFunction(()=>document.activeElement?.textContent==='Unlock saved connections');
 const after=await page.request.get(oldUrl+'/api/chat/status');const status=await after.json();assert.equal(status.configured,true);assert.ok(status.models.includes(route+'::synthetic-model'));
 const storage=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));assert.ok(!storage.includes(key)&&!storage.includes(passphrase));
 assert.equal(requests,0);
 await page.getByRole('button',{name:'Next step',exact:true}).click();
 await page.getByRole('region',{name:'Guided setup'}).getByRole('button',{name:'Open conversations',exact:true}).click();
 await page.locator('#new-conversation').click();
 await page.locator('dialog input[name=title]').fill('Synthetic recovery conversation');
 await page.getByRole('button',{name:'Create conversation',exact:true}).click();
 await page.getByLabel('Response model',{exact:true}).selectOption(route+'::synthetic-model');
 await page.getByLabel('Message',{exact:true}).fill('Please reply to this synthetic recovery check.');
 await page.locator('.conversation-composer button[type=submit]').click();
 await page.locator('#conversation-feed').getByText('Synthetic response',{exact:true}).waitFor();
 await page.reload();
 await page.locator('#conversation-feed').getByText('Synthetic response after vault recovery',{exact:true}).waitFor();
 assert.equal(requests,1);assert.equal(received[0].url,'/v1/chat/completions');
 assert.equal(received[0].authorization,'Bearer '+(local?'local-not-a-secret':key));assert.equal(received[0].body.model,'synthetic-model');
 await page.reload();await page.locator('#conversation-feed').getByText('Synthetic response after vault recovery',{exact:true}).waitFor();
 assert.equal(requests,1);
 const snapshot=JSON.parse(fs.readFileSync(workspaceFile,'utf8'));
 assert.ok(JSON.stringify(snapshot).includes('Synthetic response after vault recovery'));
 await page.getByLabel('Tasks and runs',{exact:true}).click();
 await page.getByRole('button').filter({has:page.getByText('Draft using restored connection',{exact:true})}).click();
 await page.getByRole('button',{name:'Execution plan',exact:true}).click();
 await page.locator('label').filter({hasText:'Planning model (provider usage may be billed)'}).locator('select').selectOption(route+'::synthetic-model');
 await page.getByRole('button',{name:'Draft plan with model',exact:true}).click();
 await page.getByText('Model draft · human approval still required',{exact:true}).waitFor();
 const savedTask=new WorkspaceStore(workspaceFile).getTask(taskId);
 assert.deepEqual(savedTask.executionPlanDraft.commands,plannedCommands);
 assert.equal(savedTask.approvedExecutionPlan,undefined);assert.equal(savedTask.executionReceipts?.length||0,0);
 assert.equal(requests,2);assert.equal(savedTask.planningAudits.at(-1).status,'completed');
 console.log(JSON.stringify({restoredConnectionDraftsPlan:true,draftingDidNotApproveOrExecute:true}));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,connectionKind:route,syntheticOnly:true,realBrowser:true,encryptedSave:true,restartLocked:true,explicitUnlockRestoresRoute:true,streamedResponse:true,midStreamReload:true,reloadWithoutReplay:true,liveProviderVerified:false}));
}finally{await browser?.close();await server.stop();await new Promise(resolve=>provider.close(resolve));}
