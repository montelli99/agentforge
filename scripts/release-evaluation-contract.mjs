import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const sha=value=>createHash('sha256').update(value).digest('hex');
export async function loadEvaluationCase(directory,id){
 const protocol=JSON.parse(await fs.readFile(path.join(directory,'protocol.json'),'utf8'));
 if(!protocol.taskOrder.includes(id)||!Object.hasOwn(protocol.fixtureHashes,id))throw Error('Unknown frozen case');
 const bytes=await fs.readFile(path.join(directory,id+'.json'));
 if(sha(bytes)!==protocol.fixtureHashes[id])throw Error('Frozen fixture hash mismatch');
 const task=JSON.parse(bytes);if(task.id!==id)throw Error('Mismatched case identity');
 const input=Buffer.from(JSON.stringify(task.input,null,2)+'\n');
 return {id,prompt:task.prompt,input:Buffer.from(input),inputSha256:sha(input),
  async stage(directory){await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'input.json'),input,{flag:'wx'});},
  async score(directory){
   let actualInput;try{actualInput=await fs.readFile(path.join(directory,'input.json'));}catch{return {passed:false,reason:'missing-input'};}
   if(sha(actualInput)!==sha(input))return {passed:false,reason:'input-modified'};
   const output=path.join(directory,'result.json');let stat;try{stat=await fs.lstat(output);}catch{return {passed:false,reason:'missing-output'};}
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)return {passed:false,reason:'invalid-output-file'};
   let raw,result;try{raw=await fs.readFile(output);result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{return {passed:false,reason:'invalid-json'};}
   return {passed:isDeepStrictEqual(result,task.expected),reason:isDeepStrictEqual(result,task.expected)?'match':'mismatch',outputSha256:sha(raw)};
  }};
}
