/** Executes the official client's policy engine with synthetic tool requests; no tools or inference run. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const moduleFile=process.argv[2];
if(!moduleFile||!path.isAbsolute(moduleFile))throw Error('Supply the inspected official policy module');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'agentforge-gemini-policy-proof-'));
process.env.GEMINI_CLI_HOME=root;
process.env.HOME=root;process.env.USERPROFILE=root;
try{
 const source=await fs.readFile(new URL('../src/providers/models/geminiCliPlanner.ts',import.meta.url),'utf8');
 const literal=source.match(/await fs\.writeFile\(policy,'([^']+)'\)/)?.[1];
 assert.ok(literal,'Planner policy must be found, never substitute another policy');
 const policy=path.join(root,'deny.toml');
 await fs.writeFile(policy,literal.replaceAll('\\n','\n'));
 const {createPolicyEngineConfig,PolicyEngine}=await import(pathToFileURL(moduleFile).href);
 const config=await createPolicyEngineConfig({adminPolicyPaths:[policy],policyPaths:[policy]},'default',undefined,false);
 const engine=new PolicyEngine(config);
 const results=[];
 for(const [name,server] of [['run_shell_command',undefined],['read_file',undefined],['write_file',undefined],['web_fetch',undefined],['mcp__synthetic__read','synthetic']]){
  const result=await engine.check({name,args:{}},server);
  assert.equal(result.decision,'deny',name+' must be denied');
  results.push({tool:name,decision:result.decision});
 }
 console.log(JSON.stringify({passed:true,scope:'official policy engine only',results,toolsExecuted:0,inferencePerformed:false,fullCliEnforcementVerified:false}));
}finally{await fs.rm(root,{recursive:true,force:true});}
