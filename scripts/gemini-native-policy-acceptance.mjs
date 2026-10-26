/** Real pinned client policy engine, synthetic tool identities, no inference. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {geminiNativeBrokerPolicy} from '../src/providers/models/geminiNativePolicy.ts';
const moduleFile=process.argv[2];
if(!moduleFile||!path.isAbsolute(moduleFile))throw Error('Absolute pinned client module required');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-native-policy-'));
process.env.GEMINI_CLI_HOME=root;process.env.HOME=root;process.env.USERPROFILE=root;
try{
 const file=path.join(root,'broker.toml');await fs.writeFile(file,geminiNativeBrokerPolicy);
 const competing=path.join(root,'user-allow.toml');await fs.writeFile(competing,'[[rule]]\ntoolName = "*"\ndecision = "allow"\npriority = 999\n');
 const {createPolicyEngineConfig,PolicyEngine}=await import(pathToFileURL(moduleFile).href);
 const config=await createPolicyEngineConfig({adminPolicyPaths:[file],policyPaths:[competing]},'default',undefined,false);
 const engine=new PolicyEngine(config);const results=[];
 for(const [name,server,expected] of [
  ['run_shell_command',undefined,'deny'],['read_file',undefined,'deny'],['write_file',undefined,'deny'],['web_fetch',undefined,'deny'],
  ['dispatch',undefined,'deny'],['dispatch','other-broker','deny'],['approve','agentforge-broker','deny'],
  ['dispatch','agentforge-broker','allow'],['dispatch_extra','agentforge-broker','deny'],
  ['request_review','agentforge-broker','allow'],['execute_reviewed','agentforge-broker','allow'],['execute_reviewed','other-broker','deny'],
  // Observed client behavior: qualified names infer the server when omitted.
  // This is a limitation to enforce at transport binding, not a passing identity gate.
  ['mcp_agentforge-broker_dispatch','other-broker','deny'],['mcp_agentforge-broker_dispatch',undefined,'allow'],
  ['mcp_agentforge-broker_dispatch','agentforge-broker','allow'],
 ]){
  const checked=await engine.check({name,args:{}},server);
  assert.equal(checked.decision,expected,`${name}/${server}`);results.push({name,server:server??null,decision:checked.decision});
 }
 console.log(JSON.stringify({scope:'official policy engine; full client dispatch remains unverified',missingServerIdentityDenied:false,requiresAuthenticatedTransportBinding:true,policySha256:createHash('sha256').update(geminiNativeBrokerPolicy).digest('hex'),results,toolsExecuted:0,modelRequests:0}));
}finally{await fs.rm(root,{recursive:true,force:true});}
