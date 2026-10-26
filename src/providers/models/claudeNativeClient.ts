import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {GovernedNativeClient} from '../../core/runtime/nativeClientExecutionBackend.js';
import {inspectClaudeCliAuthentication,inspectClaudeCliCapabilities} from './claudeCliCapabilities.js';
import {runBoundedChild} from './boundedCliProcess.js';

/** Governed MCP worker. Not enabled by server startup until live isolation
 * acceptance passes. CLI permissions alone are not an OS isolation boundary. */
export class ClaudeNativeClient implements GovernedNativeClient {
 private ready=false;
 private config:Readonly<{executablePath:string;configurationDirectory:string;model:string}>;
 constructor(config:{executablePath:string;configurationDirectory:string;model:string}){
  if(!path.isAbsolute(config.executablePath)||!path.isAbsolute(config.configurationDirectory)||!/^claude-[a-zA-Z0-9._-]{1,120}$/.test(config.model))throw Error('Explicit Claude executable, dedicated profile and model required');
  this.config=Object.freeze({...config});
 }
 private async profile(){
  let current=path.resolve(this.config.configurationDirectory);
  for(;;){const stat=await fs.lstat(current);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Linked or invalid Claude profile');const parent=path.dirname(current);if(parent===current)break;current=parent;}
 }
 async initialize(signal?:AbortSignal){
  this.ready=false;await this.profile();
  const capabilities=await inspectClaudeCliCapabilities(this.config.executablePath,signal);
  if(capabilities.version!=='2.1.310'||!capabilities.controlsAvailable)throw Error('Verified Claude 2.1.310 controls required');
  const auth=await inspectClaudeCliAuthentication(this.config.executablePath,this.config.configurationDirectory,signal);
  if(auth.connectionKind!=='subscription')throw Error('Official subscription sign-in required; no API fallback');
  signal?.throwIfAborted();this.ready=true;return this.getReadiness();
 }
 getReadiness(){return {ready:this.ready,blocker:this.ready?undefined:'Initialize the pinned Claude client with a dedicated subscription profile'};}
 run:GovernedNativeClient['run']=async input=>{
  if(!this.ready)throw Error('Native client has not been initialized');
  input.signal.throwIfAborted();
  // Recheck account type and client version before every launch.
  await this.initialize(input.signal);
  const endpoint=new URL(input.connection.endpoint);
  if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||endpoint.pathname!=='/mcp'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!/^[a-f0-9]{64}$/.test(input.connection.token))throw Error('Invalid host broker connection');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'agentforge-native-claude-'));
  try{
   const mcp=path.join(directory,'mcp.json');
   await fs.writeFile(mcp,JSON.stringify({mcpServers:{'agentforge-broker':{type:'http',url:endpoint.href,headers:{Authorization:'Bearer '+input.connection.token}}}}),{mode:0o600});
   const env:NodeJS.ProcessEnv={HOME:directory,USERPROFILE:directory,TEMP:directory,TMP:directory,CLAUDE_CONFIG_DIR:this.config.configurationDirectory,DISABLE_UPDATES:'1',DISABLE_TELEMETRY:'1'};
   for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(process.env[key])env[key]=process.env[key];
   const prompt='Use only agentforge-broker for this exact operation: '+JSON.stringify(input.request)+'. Request its review, execute only the approved operation, then read_result. Never change its call ID. If approval is unavailable stop. Your final text cannot declare host task acceptance.';
   const result=await runBoundedChild(this.config.executablePath,['--print','--restricted','--tools','','--strict-mcp-config','--mcp-config',mcp,'--setting-sources','','--settings',JSON.stringify({disableAllHooks:true,autoMemoryEnabled:false}),'--allowedTools','mcp__agentforge-broker__request_review,mcp__agentforge-broker__execute_reviewed,mcp__agentforge-broker__read_result','--no-session-persistence','--verbose','--output-format','stream-json','--model',this.config.model,'--max-turns','8'],{cwd:directory,env,input:prompt,signal:input.signal,timeoutMs:600000,maxOutputBytes:2097152});
   if(result.code!==0)throw Error('Native Claude client failed; reconcile before retry');
  }finally{await fs.rm(directory,{recursive:true,force:true});}
 };
}
