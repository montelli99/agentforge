import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex');
/** Refuse unfrozen/changed inputs before reserving any scored attempt. */
export async function reserveComparisonAttempt({manifestFile,sourceRoot,attemptRoot,task,arm,trial}){
 const bytes=await fs.readFile(manifestFile);const manifest=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
 if(manifest.status!=='frozen'||manifest.liveScoringAllowed!==true)throw Error('Comparison is not frozen for live scoring');
 if(!Number.isSafeInteger(manifest.trialsPerTask)||manifest.trialsPerTask<1)throw Error('Invalid repeat count');
 if(!['agentforge','deepseek'].includes(arm)||!manifest.tasks?.includes(task)||!/^[a-z0-9-]+$/.test(task)||!Number.isSafeInteger(trial)||trial<1||trial>manifest.trialsPerTask)throw Error('Invalid comparison attempt');
 if(!Array.isArray(manifest.files)||!manifest.files.length)throw Error('Missing frozen files');
 const root=await fs.realpath(sourceRoot);
 for(const entry of manifest.files){
  if(typeof entry.path!=='string'||path.isAbsolute(entry.path)||! /^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Invalid frozen file');
  const file=await fs.realpath(path.resolve(root,entry.path));const relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Frozen file escapes source root');
  if(digest(await fs.readFile(file))!==entry.sha256)throw Error('Frozen file changed: '+entry.path);
 }
 if(!path.isAbsolute(attemptRoot))throw Error('Absolute attempt directory required');
 await fs.mkdir(attemptRoot,{recursive:true});
 const id=`${task}-${trial}-${arm}`;const directory=path.join(attemptRoot,id);
 // Atomic reservation; existing partial/failed runs are never replaced.
 await fs.mkdir(directory);
 const receipt={id,task,arm,trial,status:'reserved',recordedAt:new Date().toISOString(),protocolSha256:digest(bytes)};
 await fs.writeFile(path.join(directory,'reservation.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return {directory,receipt,manifest};
}
