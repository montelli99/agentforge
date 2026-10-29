import fs from 'node:fs/promises';
import {EncryptedConnectionStore} from '../core/secret/encryptedConnectionStore.js';
export interface AgentConnectionProfile {provider:'openclaw'|'hermes';url:string;token:string;}
const key='AGENTFORGE_KEY_AGENT_CONNECTIONS';
export function validateAgentConnection(input:AgentConnectionProfile):AgentConnectionProfile{
 if(!input||!['openclaw','hermes'].includes(input.provider)||typeof input.url!=='string'||input.url.length>2048||typeof input.token!=='string'||!input.token.trim()||input.token.length>8192||/[\r\n]/.test(input.token))throw Error('Enter an agent type, endpoint and credential.');
 let url:URL;try{url=new URL(input.url);}catch{throw Error('Enter a valid agent endpoint.');}
 const secure=input.provider==='hermes'?'https:':'wss:',local=input.provider==='hermes'?'http:':'ws:';
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!(url.protocol===secure||(url.protocol===local&&['127.0.0.1','[::1]'].includes(url.hostname))))throw Error('Use a secure endpoint or a literal loopback address, without credentials, query or path.');
 return {provider:input.provider,url:url.origin,token:input.token};
}
/** Explicit encrypted restore only. Saving configuration never starts an agent or sends work. */
export class AgentConnectionSetup{
 private vault:EncryptedConnectionStore;private operation:Promise<unknown>=Promise.resolve();
 constructor(private file:string){this.vault=new EncryptedConnectionStore(file);}
 private serial<T>(action:()=>Promise<T>):Promise<T>{const result=this.operation.then(action);this.operation=result.catch(()=>{});return result;}
 async exists(){try{await fs.lstat(this.file);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}}
 private decode(values:Record<string,string>):AgentConnectionProfile[]{const data=JSON.parse(values[key]||'[]');if(!Array.isArray(data)||data.length>2)throw Error('Invalid saved agent connections.');const clean=data.map(validateAgentConnection);if(new Set(clean.map(p=>p.provider)).size!==clean.length)throw Error('Duplicate saved agent connection.');return clean;}
 restore(passphrase:string){return this.serial(async()=>this.decode(await this.vault.unlock(passphrase)));}
 save(input:AgentConnectionProfile,passphrase:string){return this.serial(async()=>{const profile=validateAgentConnection(input);const values=await this.exists()?await this.vault.unlock(passphrase):{};const profiles=this.decode(values).filter(p=>p.provider!==profile.provider);profiles.push(profile);await this.vault.save({[key]:JSON.stringify(profiles)},passphrase);return {provider:profile.provider,url:profile.url};});}
 forget(provider:AgentConnectionProfile['provider'],passphrase:string){return this.serial(async()=>{if(!['openclaw','hermes'].includes(provider))throw Error('Unknown agent type.');const profiles=this.decode(await this.vault.unlock(passphrase)).filter(p=>p.provider!==provider);await this.vault.save({[key]:JSON.stringify(profiles)},passphrase);return {forgotten:provider};});}
}
