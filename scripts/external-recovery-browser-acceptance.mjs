import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {chromium} from 'playwright';
import {builtModule} from './built-package-under-test.mjs';
const {WorkspaceStore}=await builtModule('core/store/workspaceStore.js');
const {AgentForgeWebServer}=await builtModule('server/webServer.js');
process.env.AGENTFORGE_AUTH_STRICT='1';
const root=await mkdtemp(path.join(os.tmpdir(),'agentforge-external-browser-'));
const store=new WorkspaceStore(path.join(root,'state.json'));
const workspace=store.createWorkspace({name:'Synthetic external workspace'});
const project=store.createSpace({workspaceId:workspace.id,name:'Synthetic project',provider:'web'});
const task=store.createTask({projectId:project.id,title:'Synthetic delegated task',priority:'medium',status:'paused'});
store.updateTask(task.id,{externalTurnReceipts:[{requestId:'synthetic-request',requestDigest:'synthetic-digest',approvalId:'synthetic-approval',connectionId:'synthetic-runtime',sessionKey:'synthetic-session',status:'accepted',runId:'synthetic-run',createdAt:new Date().toISOString()}]});
const server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(root,'settings.json')});
let reads=0;server.registerExternalRunConnection({id:'synthetic-runtime',inspectRun:async runId=>{assert.equal(runId,'synthetic-run');reads++;return {runId,status:'timeout'};}});
let browser;
try{
 await server.start();browser=await chromium.launch({headless:true,executablePath:process.env.AGENTFORGE_BROWSER_EXECUTABLE});
 const page=await browser.newPage();
 await page.goto(server.getBaseUrl());
 await page.locator('input[name=displayName]').fill('Synthetic reviewer');await page.locator('input[name=password]').fill('Synthetic reviewer password');await page.getByRole('button',{name:'Secure & continue',exact:true}).click();
 await page.getByLabel('Tasks and runs',{exact:true}).click();
 await page.getByRole('button').filter({has:page.getByText('Synthetic delegated task',{exact:true})}).click();
 const dialog=page.getByRole('dialog',{name:'Task review',exact:true});
 assert.equal(await dialog.getByRole('button',{name:'Resume',exact:true}).count(),0);
 await dialog.getByRole('button',{name:'Check external run',exact:true}).click();
 await dialog.getByText('External status: timeout. This does not verify task completion.',{exact:true}).waitFor();
 assert.equal(reads,1);assert.equal(store.getTask(task.id).status,'paused');
 await page.reload();await page.getByLabel('Tasks and runs',{exact:true}).click();
 await page.getByRole('button').filter({has:page.getByText('Synthetic delegated task',{exact:true})}).click();
 await page.getByRole('dialog',{name:'Task review',exact:true}).getByText('Last external status: timeout · completion not verified',{exact:true}).waitFor();
 assert.equal(reads,1); // Reload must not submit work or silently poll the remote agent.
 assert.equal(await page.getByRole('dialog',{name:'Task review',exact:true}).getByRole('button',{name:'Resume',exact:true}).count(),0);
 console.log(JSON.stringify({passed:true,runReads:reads,taskStatus:'paused',modelCalls:0}));
}finally{await browser?.close();await server.stop();}
