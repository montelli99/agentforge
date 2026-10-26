import {it,expect} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {readExecutionSetup,saveExecutionSetup} from './executionSetup.js';
it('persists explicit selection, rejects invalid repositories without replacing it, and supports off',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'af-execution-setup-'));try{
 const repo=path.join(root,'repository');fs.mkdirSync(repo);const git=(args:string[])=>execFileSync('git',args,{cwd:repo,stdio:'pipe',windowsHide:true});git(['init']);fs.writeFileSync(path.join(repo,'README.md'),'synthetic');git(['add','.']);git(['-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','-m','fixture']);
 const file=path.join(root,'setup.json');expect(readExecutionSetup(file)).toEqual({version:1,mode:'off'});
 const selected=saveExecutionSetup(file,{version:1,mode:'approved-docker',repository:repo});expect(readExecutionSetup(file)).toEqual(selected);
 for(const value of [{version:1,mode:'approved-docker',repository:'.'},{version:1,mode:'approved-docker',repository:root},{version:1,mode:'approved-docker',repository:repo,automaticDispatch:true},{version:1,mode:'unsafe'}]){expect(()=>saveExecutionSetup(file,value)).toThrow();expect(readExecutionSetup(file)).toEqual(selected);}
 saveExecutionSetup(file,{version:1,mode:'off'});expect(readExecutionSetup(file)).toEqual({version:1,mode:'off'});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
it('rejects malformed and linked configuration files',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'af-execution-invalid-'));try{const file=path.join(root,'setup.json');fs.writeFileSync(file,'not json');expect(()=>readExecutionSetup(file)).toThrow();fs.writeFileSync(file,JSON.stringify({version:1,mode:'off'}));const link=path.join(root,'linked.json');fs.linkSync(file,link);expect(()=>readExecutionSetup(file)).toThrow();expect(()=>saveExecutionSetup(link,{version:1,mode:'off'})).toThrow();}finally{fs.rmSync(root,{recursive:true,force:true});}
});
