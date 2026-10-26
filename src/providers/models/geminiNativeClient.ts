import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {GovernedNativeClient} from '../../core/runtime/nativeClientExecutionBackend.js';
import {runBoundedChild} from './boundedCliProcess.js';
import {inspectGeminiCliCapabilities} from './geminiCliCapabilities.js';
import {geminiNativeBrokerPolicy} from './geminiNativePolicy.js';

/** Explicit dedicated OAuth profile only. This adapter never imports browser
 * cookies, reads token contents or falls back to a billed API key. */
export class GeminiNativeClient implements GovernedNativeClient {
 private ready=false;
 private bundleDigest:string|undefined;
 constructor(private config:{bundlePath:string;homeDirectory:string;model:string}){
  if(!path.isAbsolute(config.bundlePath)||!path.isAbsolute(config.homeDirectory)||!/^gemini-[a-zA-Z0-9._-]{1,120}$/.test(config.model))throw Error('Explicit Gemini client, home and model required');
  this.config=Object.freeze({...config});
 }
 private async profile(){
  // Inspect the supplied path before canonicalizing: realpath hides junctions.
  let current=path.resolve(this.config.homeDirectory);
  for(;;){
   const stat=await fs.lstat(current);
   if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Linked native profile rejected');
   const parent=path.dirname(current);if(parent===current)break;current=parent;
  }
  const home=this.config.homeDirectory;
  for(const file of [home,path.join(home,'.gemini'),path.join(home,'.gemini','settings.json'),path.join(home,'.gemini','oauth_creds.json')]){
   const stat=await fs.lstat(file);if(stat.isSymbolicLink())throw Error('Linked native profile rejected');
  }
  const settingsPath=path.join(home,'.gemini','settings.json');const stat=await fs.stat(settingsPath);if(!stat.isFile()||stat.size>65536)throw Error('Invalid dedicated settings');
  const settings=JSON.parse(await fs.readFile(settingsPath,'utf8'));
  if(settings.security?.auth?.selectedType!=='oauth-personal'||settings.security?.auth?.enforcedType!=='oauth-personal'||settings.security?.auth?.useExternal!==false||settings.hooksConfig?.enabled!==false
   ||settings.admin?.extensions?.enabled!==false||settings.admin?.skills?.enabled!==false||Object.keys(settings.mcpServers??{}).length)throw Error('Dedicated OAuth profile with hooks, extensions and skills disabled required');
  if(!(await fs.stat(path.join(home,'.gemini','oauth_creds.json'))).isFile())throw Error('Official client sign-in required');
 }
 private async fingerprintBundle(){
  const bundle=path.resolve(this.config.bundlePath);let current=bundle;
  for(;;){
   const stat=await fs.lstat(current);
   if(stat.isSymbolicLink()||(current===bundle?!stat.isFile():!stat.isDirectory()))throw Error('Linked or invalid native bundle rejected');
   const parent=path.dirname(current);if(parent===current)break;current=parent;
  }
  return createHash('sha256').update(await fs.readFile(this.config.bundlePath)).digest('hex');
 }
 async initialize(){
  this.ready=false;this.bundleDigest=undefined;await this.profile();
  const before=await this.fingerprintBundle();
  const capabilities=await inspectGeminiCliCapabilities(this.config.bundlePath);
  if(capabilities.version!=='0.65.0'||!capabilities.controlsAvailable)throw Error('Verified Gemini 0.65.0 controls required');
  if(before!==await this.fingerprintBundle())throw Error('Native bundle changed during inspection');
  this.bundleDigest=before;this.ready=true;return this.getReadiness();
 }
 getReadiness(){return {ready:this.ready,blocker:this.ready?undefined:'Initialize the pinned Gemini client and dedicated signed-in profile'};}
 run:GovernedNativeClient['run']=async input=>{
  if(!this.ready)throw Error('Native client has not been initialized');await this.profile();
  try{if(await this.fingerprintBundle()!==this.bundleDigest)throw Error('Native bundle changed; initialize again');}
  catch(error){this.ready=false;this.bundleDigest=undefined;throw error;}
  const endpoint=new URL(input.connection.endpoint);
  if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||endpoint.pathname!=='/mcp'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!/^[a-f0-9]{64}$/.test(input.connection.token))throw Error('Invalid host broker connection');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'agentforge-native-gemini-'));
  try{
   const policy=path.join(directory,'broker.toml');await fs.writeFile(policy,geminiNativeBrokerPolicy,{mode:0o600});
   const settings=path.join(directory,'system.json');await fs.writeFile(settings,JSON.stringify({security:{auth:{selectedType:'oauth-personal',enforcedType:'oauth-personal',useExternal:false}},hooksConfig:{enabled:false},telemetry:{enabled:false},admin:{extensions:{enabled:false},skills:{enabled:false},mcp:{enabled:true}},mcpServers:{'agentforge-broker':{url:input.connection.endpoint,type:'http',headers:{Authorization:'Bearer '+input.connection.token}}}}),{mode:0o600});
   const env:NodeJS.ProcessEnv={HOME:directory,USERPROFILE:directory,TEMP:directory,TMP:directory,GEMINI_CLI_HOME:this.config.homeDirectory,GEMINI_CLI_SYSTEM_SETTINGS_PATH:settings,GEMINI_CLI_SYSTEM_DEFAULTS_PATH:path.join(directory,'absent-defaults.json'),NO_BROWSER:'true'};
   for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(process.env[key])env[key]=process.env[key];
   const prompt='Use only agentforge-broker. Request owner review for this exact operation: '+JSON.stringify(input.request)+'. Execute only after approval. If approval is pending, report that and stop; never substitute another call ID. Read the saved result after execution. A receipt is not final task acceptance.';
   const result=await runBoundedChild(process.execPath,[this.config.bundlePath,'--model',this.config.model,'--prompt',prompt,'--admin-policy',policy,'--extensions','none','--allowed-mcp-server-names','agentforge-broker','--output-format','stream-json'],{cwd:directory,env,signal:input.signal,timeoutMs:600000,maxOutputBytes:2097152});
   if(result.code!==0)throw Error('Native Gemini client failed; reconcile task before retry');
  }finally{await fs.rm(directory,{recursive:true,force:true});}
 };
}
