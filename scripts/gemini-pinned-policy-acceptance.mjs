/** Fetch a pinned official client and exercise its policy parser/engine without credentials. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const expected='B+flaYBNqX2zO71I5/gu7ZsnI38NlpOl654HWz+bK8I/P5sGILQsbkTOQ5a9V+w1Q6QO3wf9PlqtuMsl7XxpNQ==';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'agentforge-official-gemini-'));
try{
 const response=await fetch('https://registry.npmjs.org/@google/gemini-cli/-/gemini-cli-0.65.0.tgz',{signal:AbortSignal.timeout(60000),redirect:'error'});
 assert.equal(response.status,200);
 const bytes=Buffer.from(await response.arrayBuffer());
 assert.equal(createHash('sha512').update(bytes).digest('base64'),expected,'Official package integrity mismatch');
 const archive=path.join(root,'client.tgz');await fs.writeFile(archive,bytes);
 execFileSync('tar',['-xzf',archive,'-C',root],{timeout:30000,windowsHide:true});
 const moduleFile=path.join(root,'package','bundle','chunk-DKZARV6U.js');
 const env={HOME:root,USERPROFILE:root,TEMP:root,TMP:root,GEMINI_CLI_HOME:root};
 for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(process.env[key])env[key]=process.env[key];
 const output=execFileSync(process.execPath,['scripts/gemini-policy-engine-acceptance.mjs',moduleFile],{env,timeout:30000,windowsHide:true,encoding:'utf8',maxBuffer:1048576});
 console.log(output.trim());
 if(process.argv.includes('--native')){
  for(const script of ['gemini-native-policy-acceptance.mjs','gemini-broker-transport-acceptance.mjs']){
   const args=['--import','tsx','scripts/'+script,moduleFile];
   if(process.argv.includes('--docker')&&script==='gemini-broker-transport-acceptance.mjs')args.push('--docker');
   console.log(execFileSync(process.execPath,args,{env,timeout:90000,windowsHide:true,encoding:'utf8',maxBuffer:1048576}).trim());
  }
 }
 console.log(JSON.stringify({officialClientVersion:'0.65.0',verifiedIntegrity:'sha512-'+expected,accountUsed:false}));
}finally{await fs.rm(root,{recursive:true,force:true});}
