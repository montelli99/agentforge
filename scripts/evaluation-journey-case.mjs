import {comparisonCase} from './comparison-case.mjs';
import {evaluationDirectory} from './evaluation-directory.mjs';
import {evaluationExecutionInstructions} from './evaluation-execution-instructions.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEvaluationCase} from './release-evaluation-contract.mjs';
export async function evaluationJourneyCase(id,version=process.env.AGENTFORGE_EVALUATION_VERSION||'2'){
 if(version==='4'){
  const item=await comparisonCase(id);
  return {id,inputSha256:item.inputSha256,artifactPath:'artifacts/result.json',prompt:item.prompt+'\n'+evaluationExecutionInstructions,stage:root=>item.stage(root),verify:root=>item.score(root)};
 }
 const directory=evaluationDirectory();
 const item=await loadEvaluationCase(directory,id);
 return {id,inputSha256:item.inputSha256,artifactPath:'artifacts/result.json',prompt:item.prompt.replaceAll('result.json','artifacts/result.json')+'\n'+evaluationExecutionInstructions,stage:repo=>item.stage(repo),
 async verify(worktree){
  // The worker must be stopped before scoring. Reject links before copying so
  // normalization cannot turn an invalid submitted file into valid evidence.
  for(const [relative,directory,max] of [['input.json',false,item.input.length],['artifacts',true,Infinity],['artifacts/result.json',false,65536]]){
   let info;try{info=await fs.lstat(path.join(worktree,relative));}catch{return {passed:false,reason:'missing-submission-file'};}
   if(info.isSymbolicLink()||(directory?!info.isDirectory():!info.isFile())||(!directory&&info.size>max))return {passed:false,reason:'invalid-submission-file'};
  }
  const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'af-eval-score-'));
  try{await fs.copyFile(path.join(worktree,'input.json'),path.join(scratch,'input.json'));await fs.copyFile(path.join(worktree,'artifacts/result.json'),path.join(scratch,'result.json'));return await item.score(scratch);}finally{await fs.rm(scratch,{recursive:true,force:true});}
 }};
}
