import type {Task} from '../core/types/task.js';

function mentions(prompt:string,value:string){
 const escaped=value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return new RegExp(`(?<![\\w./\\\\-])${escaped}(?![\\w/\\\\-]|\\.[\\w])`).test(prompt);
}

/** Select only explicitly named, recorded outputs; never guess between tasks. */
export function requestedArtifactReads(tasks:Task[],prompt:string){
 const named=tasks.filter(task=>mentions(prompt,task.id));
 const candidates=(named.length?named:tasks).flatMap(task=>(task.evidencePack?.artifacts??[])
  .filter(artifact=>mentions(prompt,artifact.path)&&/\.(json|txt|md|csv)$/i.test(artifact.path))
  .map(artifact=>({taskId:task.id,path:artifact.path})));
 const unique=[...new Map(candidates.map(item=>[item.taskId+'\0'+item.path,item])).values()];
 if(unique.length>3)throw Error('Choose at most three task outputs per request.');
 if(new Set(unique.map(item=>item.path)).size!==unique.length)throw Error('Name the task ID to distinguish outputs with the same path.');
 return unique;
}
