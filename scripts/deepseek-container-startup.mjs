import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const image=process.argv[2]??'agentforge-deepseek-baseline:0.2.1-rc.3';
function run(args){const r=spawnSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:1024*1024});assert.equal(r.status,0,r.stderr);return r.stdout;}
const identity=JSON.parse(run(['image','inspect',image]))[0];
assert.equal(identity.Config.User,'node');
const args=['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','128','--memory','512m','--cpus','1','--tmpfs','/tmp:rw,nosuid,nodev,size=134217728,mode=1777','--tmpfs','/tmp/node-addon-native-custom-loader-1000:rw,exec,nosuid,nodev,size=33554432,uid=1000,gid=1000,mode=0700',identity.Id,'headless','--help'];
const attempt=spawnSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
const output=attempt.stdout??'';
const passed=attempt.status===0&&/Answer one task and exit/.test(output);
const evidence={recordedAt:new Date().toISOString(),imageId:identity.Id,user:identity.Config.User,args,exitCode:attempt.status,error:attempt.stderr,passed,output,hostMounts:[],inheritedCredentials:false,taskSubmitted:false,limitations:['Help execution proves only container startup; provider loading, task execution and benchmark accuracy remain untested.']};
await fs.writeFile('docs/evidence/p09-deepseek-container-startup.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
if(!passed)process.exitCode=1;
