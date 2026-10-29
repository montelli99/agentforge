import {verifyEvidencePackIntegrity} from '../core/evidence/evidencePackIntegrity.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {Task} from '../core/types/task.js';

export async function readVerifiedTaskArtifact(task:Task,requested:unknown){
  if(typeof requested!=='string'||!requested||path.isAbsolute(requested)||requested.split(/[\\/]/).some(part=>part==='..'||part==='.')||! /\.(json|txt|md|csv)$/i.test(requested))throw Error('Choose a recorded text artifact');
  if(!task.evidencePack||task.evidencePack.taskId!==task.id||!verifyEvidencePackIntegrity(task.evidencePack))throw Error('Verified evidence integrity mismatch');
  const artifact=task.evidencePack.verifiedPassed&&task.evidencePack.artifacts.find(item=>item.path===requested);
  if(!artifact||!task.worktree||!Number.isSafeInteger(artifact.sizeBytes)||artifact.sizeBytes<0||artifact.sizeBytes>60000)throw Error('Verified text artifact unavailable or exceeds 60 KB');
  const root=await fs.realpath(task.worktree.worktreePath);
  const target=await fs.realpath(path.resolve(root,requested));const relative=path.relative(root,target);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Artifact is outside its worktree');
  const handle=await fs.open(target,'r');
  try{
    const stat=await handle.stat();if(!stat.isFile()||stat.size!==artifact.sizeBytes)throw Error('Artifact changed since verification');
    const buffer=Buffer.alloc(60001);let bytesRead=0;
    while(bytesRead<buffer.length){const chunk=await handle.read(buffer,bytesRead,buffer.length-bytesRead,bytesRead);if(!chunk.bytesRead)break;bytesRead+=chunk.bytesRead;}
    const content=buffer.subarray(0,bytesRead);
    if(bytesRead!==artifact.sizeBytes||createHash('sha256').update(content).digest('hex')!==artifact.sha256)throw Error('Artifact changed since verification');
    return {path:requested,sha256:artifact.sha256,content:new TextDecoder('utf-8',{fatal:true}).decode(content),referenceDataOnly:true};
  }finally{await handle.close();}
}


