/** Real HTTP, filesystem and restart verification against an isolated generic folder. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkspaceStore } from '../dist/core/store/workspaceStore.js';
import { AgentForgeWebServer } from '../dist/server/webServer.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-files-'));
const repository=path.join(dir,'project');fs.mkdirSync(repository);fs.mkdirSync(path.join(repository,'src'));
fs.writeFileSync(path.join(repository,'src','hello.ts'),'export const message = "Hello, world";\n');
fs.writeFileSync(path.join(repository,'.env'),'EXAMPLE_SECRET=not-visible');
fs.writeFileSync(path.join(repository,'large.txt'),'x'.repeat(256*1024+1));
fs.writeFileSync(path.join(repository,'binary.bin'),Buffer.from([0,1,2]));
const outside=path.join(dir,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'private.txt'),'outside project');
fs.symlinkSync(outside,path.join(repository,'linked'),'junction');
fs.linkSync(path.join(outside,'private.txt'),path.join(repository,'hardlink.txt'));
const storeFile=path.join(dir,'workspace.json');let server=new AgentForgeWebServer(new WorkspaceStore(storeFile),0);
let base;
async function request(route,method='GET',body){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',Connection:'close'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};}
try{
 await server.start();base=server.getBaseUrl();
 const project=(await request('/api/projects','POST',{name:'File browser acceptance',repositoryPath:repository})).body;
 const route='/api/projects/'+project.id;
 assert.equal((await request(route+'/files')).status,409,'reference path must not grant access');
 assert.equal((await request(route+'/repository','POST',{path:repository,mode:'write'})).status,400);
 assert.equal((await request(route+'/repository','POST',{path:repository,mode:'read'})).status,200);
 const listing=await request(route+'/files');assert.equal(listing.status,200);assert(!listing.body.entries.some(e=>e.name==='.env'||e.name==='linked'));
 const preview=await request(route+'/file?path=src%2Fhello.ts');assert.equal(preview.body.content,'export const message = "Hello, world";\n');
 for(const invalid of ['../outside/private.txt','.env','linked/private.txt','hardlink.txt','C:/Windows/test','src/../../outside/private.txt'])assert.equal((await request(route+'/file?path='+encodeURIComponent(invalid))).status,invalid.includes(':')?400:403,invalid);
 assert.equal((await request(route+'/file?path=large.txt')).status,413);
 assert.equal((await request(route+'/file?path=binary.bin')).status,415);
 await request(route,'PATCH',{archived:true});assert.equal((await request(route+'/files')).status,409);await request(route,'PATCH',{archived:false});
 await server.stop();server=new AgentForgeWebServer(new WorkspaceStore(storeFile),0);await server.start();base=server.getBaseUrl();
 assert.equal((await request(route+'/file?path=src%2Fhello.ts')).body.content,preview.body.content,'connection survives restart');
 await request(route+'/repository','DELETE');assert.equal((await request(route+'/files')).status,409);
 await request(route+'/repository','POST',{path:repository,mode:'read'});await request(route,'PATCH',{repositoryPath:outside});assert.equal((await request(route+'/files')).status,409,'reference changes revoke access');
 console.log('PASS: explicit connection, bounded preview, path/linked-file denial, excluded files, archive guard, restart persistence, disconnect and changed-path revocation.');
}finally{await server.stop();}
