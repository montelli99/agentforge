import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {Task} from '../types/task.js';
import type {TaskExecutionOutput} from './taskWorkerRuntime.js';
import {requestDigest} from './executionReceipt.js';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Host-only directory: must never be mounted into an execution container. */
export class ExecutionResultJournal {
 constructor(private directory:string){if(!path.isAbsolute(directory))throw Error('Result journal requires an absolute host directory');}
 private file(operationId:string){if(!/^[a-f0-9-]{36}$/i.test(operationId))throw Error('Invalid operation identity');return path.join(this.directory,operationId+'.json');}
 async validatePlacement(worktreePath:string){
  const outside=(worktree:string,directory:string)=>{
   const relative=path.relative(worktree,directory);
   if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Result journal must be outside execution worktree');
  };
  outside(path.resolve(worktreePath),path.resolve(this.directory));
  await fs.mkdir(this.directory,{recursive:true,mode:0o700});
  outside(await fs.realpath(worktreePath),await fs.realpath(this.directory));
 }
 async save(task:Task,operationId:string,worktreePath:string,output:TaskExecutionOutput){
  const file=this.file(operationId);await this.validatePlacement(worktreePath);
  const body={version:1,operationId,taskId:task.id,requestDigest:requestDigest(task),worktreePath:path.resolve(worktreePath),output};
  const record=JSON.stringify({body,sha256:digest(body)});if(Buffer.byteLength(record)>8*1024*1024)throw Error('Execution result exceeds journal limit');
  await fs.mkdir(this.directory,{recursive:true,mode:0o700});
  const handle=await fs.open(file,'wx',0o600);
  try{await handle.writeFile(record);await handle.sync();}finally{await handle.close();}
 }
 async read(task:Task,operationId:string,worktreePath:string):Promise<TaskExecutionOutput>{
  await this.validatePlacement(worktreePath);
  const handle=await fs.open(this.file(operationId),'r');let raw:Buffer;
  try{const stat=await handle.stat();if(!stat.isFile()||stat.size>8*1024*1024)throw Error('Invalid result journal size');raw=Buffer.alloc(stat.size);let offset=0;while(offset<raw.length){const chunk=await handle.read(raw,offset,raw.length-offset,offset);if(!chunk.bytesRead)throw Error('Incomplete result journal');offset+=chunk.bytesRead;}}finally{await handle.close();}
  const record=JSON.parse(raw.toString('utf8'));const body=record.body;
  if(!body||body.version!==1||record.sha256!==digest(body)||body.operationId!==operationId||body.taskId!==task.id||body.requestDigest!==requestDigest(task)||body.worktreePath!==path.resolve(worktreePath))throw Error('Execution result journal identity/integrity mismatch');
  return body.output;
 }
}
