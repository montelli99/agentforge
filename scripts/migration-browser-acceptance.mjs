import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {chromium} from 'playwright';
import {WorkspaceStore} from '../dist/core/store/workspaceStore.js';
import {AgentForgeWebServer} from '../dist/server/webServer.js';
const executable=process.env.AGENTFORGE_BROWSER_EXECUTABLE;if(!executable||!path.isAbsolute(executable))throw Error('Select an absolute Chromium executable');
process.env.AGENTFORGE_AUTH_STRICT='1';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-migration-browser-')),file=path.join(root,'state.json');
const store=new WorkspaceStore(file),server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(root,'settings.json')});let browser;
const manifest={version:'1',sourceSystem:'synthetic',agents:[{id:'synthetic-import',name:'Synthetic imported agent',role:'reviewer',description:'Fixture only',tools:['shell'],permissions:['*']}],channels:[],tasks:[]};
try{
 await server.start();browser=await chromium.launch({headless:true,executablePath:executable});const page=await browser.newPage();
 await page.goto(server.getBaseUrl());await page.locator('input[name=displayName]').fill('Synthetic reviewer');await page.locator('input[name=password]').fill('Synthetic reviewer password');await page.getByRole('button',{name:'Secure & continue',exact:true}).click();
 await page.locator('.nav-group-title').filter({hasText:'Playbooks'}).click();await page.getByLabel('Migration',{exact:true}).click();
 await page.locator('[data-id="GENERIC"]').click();await page.locator('#migration-manifest').fill(JSON.stringify(manifest));
 await page.getByRole('button',{name:'Review uploaded import',exact:true}).click();
 const confirm=page.getByRole('button',{name:'Confirm staging import',exact:true});await confirm.waitFor();assert.equal(await confirm.isDisabled(),true);assert.equal(store.getAgent('synthetic-import'),undefined);
 await page.getByLabel('I reviewed these offline staging records and want to import them.',{exact:false}).check();await confirm.click();
 await page.getByText('Saved records verified.',{exact:false}).waitFor();
 const agent=store.getAgent('synthetic-import');assert.equal(agent.status,'offline');assert.deepEqual(agent.tools,[]);assert.deepEqual(agent.permissions,[]);
 const restored=new WorkspaceStore(file);assert.equal(restored.getAgent('synthetic-import').status,'offline');
 const rollback=page.getByRole('button',{name:'Roll back this import',exact:true});assert.equal(await rollback.isDisabled(),true);
 await page.getByLabel('Remove this import if its agents remain unchanged and unused.',{exact:false}).check();await rollback.click();
 await page.getByText('Import rolled back. Original source data was not changed.',{exact:true}).waitFor();assert.equal(store.getAgent('synthetic-import'),undefined);assert.equal(new WorkspaceStore(file).getAgent('synthetic-import'),undefined);
 console.log(JSON.stringify({passed:true,syntheticOnly:true,reviewBeforeWrite:true,explicitConfirmation:true,offlineImport:true,noSourcePrivilegesGranted:true,durableImport:true,confirmedRollback:true,durableRollback:true}));
}finally{await browser?.close();await server.stop();}
