import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
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

/** Publish one immutable outcome. A reserved slot without this file is unfinished,
 * never a successful attempt; a retry must not replace its outcome. */
export async function finalizeComparisonAttempt(directory,outcome){
 const keys=['status','artifactPassed','workflowPassed','elapsedMs','requests','usage'];
 if(!outcome||Object.keys(outcome).some(key=>!keys.includes(key))||!['passed','failed','timed_out','interrupted'].includes(outcome.status)
  ||typeof outcome.artifactPassed!=='boolean'||typeof outcome.workflowPassed!=='boolean'
  ||!Number.isFinite(outcome.elapsedMs)||outcome.elapsedMs<0||!Number.isSafeInteger(outcome.requests)||outcome.requests<0
  ||(outcome.status==='passed'&&(!outcome.artifactPassed||!outcome.workflowPassed)))throw Error('Invalid comparison outcome');
 if(outcome.usage!==null&&(!outcome.usage||Object.keys(outcome.usage).sort().join(',')!=='inputTokens,outputTokens'||Object.values(outcome.usage).some(n=>!Number.isSafeInteger(n)||n<0)))throw Error('Invalid comparison usage');
 const reservationFile=path.join(directory,'reservation.json');
 const bytes=await fs.readFile(reservationFile);const reservation=JSON.parse(bytes);
 if(reservation.status!=='reserved'||path.basename(directory)!==reservation.id||! /^[a-f0-9]{64}$/.test(reservation.protocolSha256))throw Error('Invalid attempt reservation');
 const record={...reservation,...structuredClone(outcome),finishedAt:new Date().toISOString(),reservationSha256:digest(bytes)};
 const temp=path.join(directory,randomUUID()+'.outcome.tmp');
 const handle=await fs.open(temp,'wx',0o600);
 try{await handle.writeFile(JSON.stringify(record,null,2)+'\n');await handle.sync();}finally{await handle.close();}
 try{
  // Link publishes the complete flushed file atomically and refuses replacement.
  await fs.link(temp,path.join(directory,'outcome.json'));
 }finally{await fs.unlink(temp);}
 return record;
}
