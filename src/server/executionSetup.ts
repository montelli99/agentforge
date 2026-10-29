import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {readRepositoryBaseline} from '../core/runtime/repositoryBaseline.js';
export type ExecutionSetup = {version:1;mode:'off'} | {version:1;mode:'approved-docker';repository:string};
export function validateExecutionSetup(value:unknown):ExecutionSetup {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Select an execution mode');
  const v=value as Record<string,unknown>;
  if(v.version!==1||!['off','approved-docker'].includes(String(v.mode)))throw Error('Unsupported execution configuration');
  const keys=v.mode==='off'?['version','mode']:['version','mode','repository'];
  if(Object.keys(v).some(k=>!keys.includes(k)))throw Error('Unexpected execution configuration field');
  if(v.mode==='off')return {version:1,mode:'off'};
  if(typeof v.repository!=='string'||!path.isAbsolute(v.repository)||v.repository.length>2000)throw Error('Choose an absolute repository folder');
  const repository=fs.realpathSync(v.repository);
  readRepositoryBaseline(repository,repository);
  return {version:1,mode:'approved-docker',repository};
}
export function readExecutionSetup(file:string):ExecutionSetup {
  let stat;try{stat=fs.lstatSync(file);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {version:1,mode:'off'};throw e;}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>8192)throw Error('Invalid execution configuration file');
  return validateExecutionSetup(JSON.parse(fs.readFileSync(file,'utf8')));
}
export function saveExecutionSetup(file:string,value:unknown):ExecutionSetup {
  const selected=validateExecutionSetup(value);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if(fs.existsSync(file)){const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw Error('Invalid execution configuration target');}
  const temporary=file+'.'+crypto.randomUUID()+'.tmp';
  try{fs.writeFileSync(temporary,JSON.stringify(selected,null,2),{flag:'wx',mode:0o600});fs.renameSync(temporary,file);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  return selected;
}
