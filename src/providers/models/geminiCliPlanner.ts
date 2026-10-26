import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {runBoundedChild} from './boundedCliProcess.js';
import {inspectGeminiCliCapabilities} from './geminiCliCapabilities.js';
import {encodeGeminiPlannerPrompt} from './geminiCliPrompt.js';
import {inspectGeminiCliTranscript} from './geminiCliTranscript.js';
import {validateCliPlan} from './subscriptionCliModel.js';
import {ModelProviderError,type GenerativeModelProvider,type ModelRequestOptions,type ModelResponse,type StreamChunk} from '../../core/providers/model.js';

async function requireUnlinkedPath(target:string):Promise<void>{
 let current=path.resolve(target);
 for(;;){
  const stat=await fs.lstat(current);
  if(stat.isSymbolicLink())throw Error('Linked Gemini profile paths are not allowed');
  const parent=path.dirname(current);if(parent===current)return;current=parent;
 }
}
export interface GeminiCliPlannerConfiguration {bundlePath:string;homeDirectory:string;model:string;}
export async function readGeminiCliPlannerConfiguration(file:string):Promise<GeminiCliPlannerConfiguration>{
 if(!path.isAbsolute(file))throw Error('Select an absolute Gemini planner configuration');
 const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>32768)throw Error('Invalid Gemini configuration file');
 const config=JSON.parse(await fs.readFile(file,'utf8'));
 if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).some(key=>!['bundlePath','homeDirectory','model'].includes(key)))throw Error('Gemini configuration contains only bundlePath, homeDirectory and model');
 new GeminiCliPlanner(config);return {...config};
}
/** Official client, explicitly selected dedicated profile, drafts only. Client
 * policy controls are not an OS sandbox; live enforcement needs separate proof. */
export class GeminiCliPlanner implements GenerativeModelProvider {
 readonly id='gemini-subscription-cli';readonly name='Gemini CLI planner';readonly defaultTier=1 as const;
 private config:Readonly<GeminiCliPlannerConfiguration>;
 constructor(config:GeminiCliPlannerConfiguration){
  if(!config||!path.isAbsolute(config.bundlePath??'')||!path.isAbsolute(config.homeDirectory??'')||!/^gemini-[a-zA-Z0-9._-]{1,120}$/.test(config.model??''))throw Error('Explicit Gemini bundle, dedicated home and model required');
  this.config=Object.freeze({...config});
 }
 private async checkProfile(){
  await requireUnlinkedPath(path.join(this.config.homeDirectory,'.gemini'));
  const home=await fs.lstat(this.config.homeDirectory);
  if(!home.isDirectory()||home.isSymbolicLink())throw Error('Dedicated Gemini home must be a regular directory');
  const settingsFile=path.join(this.config.homeDirectory,'.gemini','settings.json');
  const stat=await fs.lstat(settingsFile);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw Error('Invalid dedicated Gemini settings');
  const settings=JSON.parse(await fs.readFile(settingsFile,'utf8'));
  if(settings.security?.auth?.selectedType!=='oauth-personal'||settings.security?.auth?.enforcedType!=='oauth-personal'||settings.hooksConfig?.enabled!==false)throw Error('Dedicated Google-login profile with hooks disabled required');
  if(settings.security?.auth?.useExternal!==false||settings.admin?.extensions?.enabled!==false||settings.admin?.mcp?.enabled!==false||settings.admin?.skills?.enabled!==false)throw Error('Dedicated Gemini profile must disable external auth, extensions, MCP and skills');
  const credential=await fs.lstat(path.join(this.config.homeDirectory,'.gemini','oauth_creds.json'));
  if(!credential.isFile()||credential.isSymbolicLink())throw Error('Official client sign-in required');
  // Presence is not authentication proof. Only the official client consumes it.
 }
 async isAvailable(){try{await this.checkProfile();return (await inspectGeminiCliCapabilities(this.config.bundlePath)).controlsAvailable;}catch{return false;}}
 async listModels(){return [this.config.model];}
 async generate(options:ModelRequestOptions):Promise<ModelResponse>{
  if(options.signal?.aborted)throw Error('Gemini planning cancelled before launch');
  if(options.model!==this.config.model||options.tools?.length||options.stream||options.responseFormat!=='json'||options.maxTokens!==undefined)throw Error('Unsupported Gemini planner request; no hard token-cap claim');
  const prompt=encodeGeminiPlannerPrompt(options.messages);
  await this.checkProfile();
  if(!(await inspectGeminiCliCapabilities(this.config.bundlePath,options.signal)).controlsAvailable)throw Error('Required Gemini controls unavailable');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'agentforge-gemini-plan-'));
  let usage;
  try{
   const policy=path.join(directory,'deny-tools.toml');
   await fs.writeFile(policy,'[[rule]]\ntoolName = "*"\ndecision = "deny"\npriority = 999\n\n[[rule]]\nmcpName = "*"\ndecision = "deny"\npriority = 999\n');
   const env:NodeJS.ProcessEnv={HOME:directory,USERPROFILE:directory,TEMP:directory,TMP:directory,GEMINI_CLI_HOME:this.config.homeDirectory,GEMINI_CLI_SYSTEM_SETTINGS_PATH:path.join(directory,'absent-system.json'),GEMINI_CLI_SYSTEM_DEFAULTS_PATH:path.join(directory,'absent-defaults.json'),GEMINI_CLI_SURFACE:'agentforge-planner',NO_BROWSER:'true'};
   for(const key of ['SystemRoot','WINDIR','PATH','Path'])if(process.env[key])env[key]=process.env[key];
   const result=await runBoundedChild(process.execPath,[this.config.bundlePath,'--model',this.config.model,'--prompt',prompt,'--approval-mode','default','--admin-policy',policy,'--policy',policy,'--extensions','none','--allowed-mcp-server-names','agentforge-no-mcp','--output-format','stream-json'],{cwd:directory,env,signal:options.signal,timeoutMs:120000,maxOutputBytes:2097152});
   const transcript=inspectGeminiCliTranscript(result.stdout,this.config.model,prompt);usage=transcript.usage;
   if(result.code!==0||!transcript.valid||!transcript.content)throw Error('Invalid Gemini completion');
   validateCliPlan(transcript.content);
   return {id:randomUUID(),model:this.config.model,content:transcript.content,usage,finishReason:'stop'};
  }catch{throw new ModelProviderError('Gemini planning failed or was cancelled; no automatic retry or API fallback',usage);}
  finally{await fs.rm(directory,{recursive:true,force:true});}
 }
 async *stream(_options:ModelRequestOptions):AsyncIterable<StreamChunk>{throw Error('Gemini CLI supports planning drafts only');}
}
