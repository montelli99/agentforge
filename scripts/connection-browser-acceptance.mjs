import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {chromium} from 'playwright';
import {WorkspaceStore} from '../dist/core/store/workspaceStore.js';
import {AgentForgeWebServer} from '../dist/server/webServer.js';
const executable=process.env.AGENTFORGE_BROWSER_EXECUTABLE;
if(!executable||!path.isAbsolute(executable))throw Error('Select an absolute Chromium executable.');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-connections-browser-'));
process.env.AGENTFORGE_AUTH_STRICT='1';
const options={settingsFilePath:path.join(root,'settings.json')};
const workspaceFile=path.join(root,'workspace.json');
let server=new AgentForgeWebServer(new WorkspaceStore(workspaceFile),0,undefined,undefined,options),browser;
const key='synthetic-credential-not-a-real-provider-key';
const passphrase='Synthetic connection vault password';
try{
 await server.start();browser=await chromium.launch({headless:true,executablePath:executable});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.getBaseUrl());
 await page.locator('input[name=displayName]').fill('Synthetic owner');
 await page.locator('input[name=password]').fill('Synthetic owner password');
 await page.getByRole('button',{name:'Secure & continue',exact:true}).click();
 if(!await page.getByLabel('Models and routing',{exact:true}).isVisible())await page.locator('.nav-group-title').filter({hasText:'Connections'}).click();await page.getByLabel('Models and routing',{exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Model name',{exact:true}).fill('synthetic-model');
 await page.getByLabel('Dedicated API key',{exact:true}).fill(key);
 await page.getByLabel('Private connection-store passphrase',{exact:true}).fill(passphrase);
 await page.getByRole('button',{name:'Save and connect',exact:true}).click();
 await page.getByText('Web chat connection configured. No paid request was sent.',{exact:false}).waitFor();
 assert.equal(await page.getByLabel('Dedicated API key',{exact:true}).inputValue(),'');
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
 await page.getByRole('button',{name:'Unlock saved connections',exact:true}).click();
 await page.getByText('Web chat connection configured. No paid request was sent.',{exact:false}).waitFor();
 const after=await page.request.get(oldUrl+'/api/chat/status');const status=await after.json();assert.equal(status.configured,true);assert.ok(status.models.includes('openai::synthetic-model'));
 const storage=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));assert.ok(!storage.includes(key)&&!storage.includes(passphrase));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,syntheticOnly:true,realBrowser:true,encryptedSave:true,restartLocked:true,explicitUnlockRestoresRoute:true,liveProviderVerified:false}));
}finally{await browser?.close();await server.stop();}


