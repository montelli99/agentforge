import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {BoundedChildFailure,runBoundedChild} from './boundedCliProcess.js';
import type {PlatformProtectedCredentialBackend} from './chatgptDirectTokenStore.js';
import type {DirectCredentials} from './chatgptDirectOAuth.js';

/** Windows DPAPI CurrentUser storage. Not an isolation boundary against this user's processes. */
export class WindowsDirectCredentialBackend implements PlatformProtectedCredentialBackend {
  readonly protection='platform-user-protected' as const;
  constructor(private readonly directory:string){
    if(process.platform!=='win32'||!path.isAbsolute(directory))throw Error('Windows private credential directory required');
  }
  private async target(key:string){
    if(!/^AgentForge\/chatgpt-direct\/[a-f0-9]{64}$/.test(key))throw Error('Invalid credential namespace');
    let current=path.resolve(this.directory);
    while(true){
      try{if((await fs.lstat(current)).isSymbolicLink())throw Error('Linked credential directory rejected');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
      try{await fs.lstat(path.join(current,'.git'));throw Error('Credentials cannot be saved in a repository');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
      const parent=path.dirname(current);if(parent===current)break;current=parent;
    }
    const file=path.join(this.directory,key.split('/').at(-1)!+'.dpapi');
    try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>131072)throw Error('Invalid credential file');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    return file;
  }
  private async transform(mode:'Protect'|'Unprotect',bytes:Buffer,key:string):Promise<Buffer>{
    const root=process.env.SystemRoot;
    if(!root||!path.isAbsolute(root))throw Error('Windows system runtime unavailable');
    const executable=path.join(root,'System32','WindowsPowerShell','v1.0','powershell.exe');
    const entropy=Buffer.from(key).toString('base64');
    // Only fixed code and nonsecret namespace entropy enter argv. Secret bytes use stdin.
    const script=`$ErrorActionPreference='Stop'; [Console]::Error.WriteLine('AF_STAGE:started'); try { [void][Reflection.Assembly]::Load('System.Security, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'); [Console]::Error.WriteLine('AF_STAGE:assembly'); $data=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Error.WriteLine('AF_STAGE:input'); $entropy=[Convert]::FromBase64String('${entropy}'); $result=[Security.Cryptography.ProtectedData]::${mode}($data,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Error.WriteLine('AF_STAGE:protected'); [Console]::Out.Write([Convert]::ToBase64String($result)); } catch { exit 1 }`;
    let stage='launch';
    const observedStage=(stderr:string)=>stderr.match(/AF_STAGE:(started|assembly|input|protected)/g)?.at(-1)?.slice(9)??'launch';
    try{
      const result=await runBoundedChild(executable,['-NoProfile','-NonInteractive','-Command',script],{input:bytes.toString('base64'),timeoutMs:15000,maxOutputBytes:262144,env:{SystemRoot:root,WINDIR:root}});
      stage=observedStage(result.stderr);
      if(result.code!==0||!result.stdout||!/^[A-Za-z0-9+/]+={0,2}$/.test(result.stdout))throw Error();
      return Buffer.from(result.stdout,'base64');
    }catch(error){
      // Never expose child output: it may contain credentials or provider details.
      // Fixed stage labels and the bounded runner's classification diagnose hangs safely.
      const classification=error instanceof BoundedChildFailure?error.classification:'operation-error';
      if(error instanceof BoundedChildFailure)stage=observedStage(error.result.stderr);
      throw Error(`Windows credential protection failed (${classification}; stage=${stage})`);
    }
  }
  async read(key:string):Promise<DirectCredentials|undefined>{
    const file=await this.target(key);let encrypted:Buffer;
    try{encrypted=await fs.readFile(file);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw Error('Credential read failed');}
    const plain=await this.transform('Unprotect',encrypted,key);
    try{return JSON.parse(plain.toString('utf8')) as DirectCredentials;}catch{throw Error('Invalid protected credential record');}finally{plain.fill(0);}
  }
  async replace(key:string,credentials:DirectCredentials):Promise<void>{
    const file=await this.target(key),plain=Buffer.from(JSON.stringify(credentials));
    if(plain.length>65536){plain.fill(0);throw Error('Credential record too large');}
    let encrypted:Buffer;try{encrypted=await this.transform('Protect',plain,key);}finally{plain.fill(0);}
    await fs.mkdir(this.directory,{recursive:true});await this.target(key);
    const temporary=file+'.'+randomUUID()+'.tmp';
    try{const handle=await fs.open(temporary,'wx',0o600);try{await handle.writeFile(encrypted);await handle.sync();}finally{await handle.close();}await this.target(key);await fs.rename(temporary,file);}
    finally{await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
  }
  async remove(key:string):Promise<void>{const file=await this.target(key);await fs.unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
