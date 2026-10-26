/** Exercise the installed official hook runner, without accounts or model calls. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const moduleFile=process.argv[2];
if(!moduleFile||!path.isAbsolute(moduleFile))throw Error('Absolute official bundle required');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-hook-faults-'));
// Never expose host credentials to hook children.
const saved={...process.env};
for(const key of Object.keys(process.env))delete process.env[key];
for(const key of ['SystemRoot','WINDIR','PATH','Path','COMSPEC','PATHEXT'])if(saved[key])process.env[key]=saved[key];
Object.assign(process.env,{HOME:root,USERPROFILE:root,TEMP:root,TMP:root,GEMINI_CLI_HOME:root});
try{
 const {HookRunner,HookAggregator}=await import(pathToFileURL(moduleFile).href);
 const runner=new HookRunner({sanitizationConfig:{enableEnvironmentVariableRedaction:false},isTrustedFolder:()=>true,storage:{getPlansDir:()=>root}});
 const aggregator=new HookAggregator();const results=[];
 for(const [name,script,timeout] of [
  ['explicit-denial','console.log(JSON.stringify({decision:"deny"}))',5000],
  ['blocking-exit','console.error("synthetic denial");process.exit(2)',5000],
  ['crash','console.error("synthetic crash");process.exit(1)',5000],
  ['malformed-output','console.log("{invalid")',5000],
  ['timeout','setTimeout(()=>{},10000)',1000],
 ]){
  const file=path.join(root,name+'.cjs');await fs.writeFile(file,script);
  const command=process.platform==='win32'?`& '${process.execPath.replaceAll("'","''")}' '${file.replaceAll("'","''")}'`:`'${process.execPath}' '${file}'`;
  const result=await runner.executeHook({type:'command',command,timeout,name},'BeforeTool',{cwd:root,session_id:'synthetic',hook_event_name:'BeforeTool',tool_name:'write_file',tool_input:{file_path:'synthetic.txt',content:'fixture'}});
  const merged=aggregator.mergeOutputs(result.output?[result.output]:[],'BeforeTool');
  const blocking=merged?.decision==='deny'||merged?.decision==='block'||merged?.continue===false;
  results.push({name,hookSucceeded:result.success,exitCode:result.exitCode??null,decision:merged?.decision??null,blocking});
 }
 assert.equal(results[0].blocking,true);assert.equal(results[1].blocking,true);
 for(const result of results.slice(2))assert.equal(result.blocking,false);
 console.log(JSON.stringify({scope:'official hook runner and aggregator only; no tool dispatch',moduleSha256:createHash('sha256').update(await fs.readFile(moduleFile)).digest('hex'),results,hookAloneFailsClosed:false,modelRequests:0,toolsExecuted:0}));
}finally{await fs.rm(root,{recursive:true,force:true});}

