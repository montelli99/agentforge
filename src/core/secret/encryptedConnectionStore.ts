import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';

/** Portable credential persistence. Unlock material is supplied by the owner, never persisted. */
export class EncryptedConnectionStore {
  constructor(private readonly file: string) {
    if (!path.isAbsolute(file)) throw Error('Credential store requires an absolute private path');
  }

  private async checkLocation() {
    let directory=path.dirname(this.file);
    while(true){
      try{if((await fs.lstat(directory)).isSymbolicLink())throw Error('Credential store cannot use a linked directory');}
      catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
      try { await fs.access(path.join(directory,'.git')); throw Error('Credential store cannot be inside a repository'); }
      catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
      const parent=path.dirname(directory);if(parent===directory)break;directory=parent;
    }
    try{const entry=await fs.lstat(this.file);if(!entry.isFile()||entry.isSymbolicLink()||entry.size>131072)throw Error('Invalid credential store file');}
    catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }

  async save(credentials: Record<string,string>, passphrase:string):Promise<void>{
    if(passphrase.length<16||passphrase.length>1024)throw Error('Use an unlock passphrase of 16–1024 characters');
    if(Object.entries(credentials).some(([key,value])=>!/^AGENTFORGE_KEY_[A-Z0-9_]+$/.test(key)||typeof value!=='string'||!value||value.length>16384))throw Error('Invalid dedicated credential entry');
    const plain=Buffer.from(JSON.stringify(credentials));if(plain.length>65536)throw Error('Credential store exceeds size limit');
    await this.checkLocation();
    const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(passphrase,salt,32);
    let envelope:string;
    try{const cipher=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(plain),cipher.final()]);envelope=JSON.stringify({version:1,salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')});}
    finally{key.fill(0);plain.fill(0);}
    await fs.mkdir(path.dirname(this.file),{recursive:true,mode:0o700});
    const temporary=this.file+'.'+randomBytes(12).toString('hex')+'.tmp';
    try{const handle=await fs.open(temporary,'wx',0o600);try{await handle.writeFile(envelope);await handle.sync();}finally{await handle.close();}await this.checkLocation();await fs.rename(temporary,this.file);}
    finally{await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
  }

  async unlock(passphrase:string):Promise<Record<string,string>>{
    if(passphrase.length>1024)throw Error('Unlock passphrase exceeds size limit');
    await this.checkLocation();
    const raw=await fs.readFile(this.file,'utf8');
    let key:Buffer|undefined,plain:Buffer|undefined;
    try{
      const value=JSON.parse(raw);if(value.version!==1||typeof value.data!=='string')throw Error();
      const salt=Buffer.from(value.salt,'base64'),iv=Buffer.from(value.iv,'base64'),tag=Buffer.from(value.tag,'base64');
      if(salt.length!==16||iv.length!==12||tag.length!==16)throw Error();
      key=scryptSync(passphrase,salt,32);const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);
      plain=Buffer.concat([decipher.update(Buffer.from(value.data,'base64')),decipher.final()]);
      const result=JSON.parse(plain.toString('utf8'));
      if(!result||typeof result!=='object'||Array.isArray(result)||Object.entries(result).some(([k,v])=>!/^AGENTFORGE_KEY_[A-Z0-9_]+$/.test(k)||typeof v!=='string'))throw Error();
      return result;
    }catch{throw Error('Unable to unlock credentials: incorrect passphrase or damaged store');}
    finally{key?.fill(0);plain?.fill(0);}
  }
}
