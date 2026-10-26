import {it,expect} from 'vitest';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {WorkspaceStore} from '../store/workspaceStore.js';
import type {ContractedDockerExecutionBackend} from './contractedDockerExecutionBackend.js';
import {NativeClientExecutionBackend} from './nativeClientExecutionBackend.js';
it('requires an operation receipt and rejects client completion without verified execution output',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-native-worker-'));try{
 const work=path.join(root,'work');await fs.mkdir(work);const store=new WorkspaceStore(path.join(root,'workspace.json'));
 const task=store.createTask({title:'Synthetic native task',status:'ready',priority:'medium'});task.contract.workspace.requireIsolatedWorktree=true;
 let launches=0;let endpoint='';let recoveries=0;
 const docker={getReadiness:()=>({ready:true,blockers:[],capabilities:{modelPlanning:true,isolatedCompute:true,realVerification:true,evidenceCollection:true}}),recoverResult:async()=>{recoveries++;throw Error('No verified execution result');}} as unknown as ContractedDockerExecutionBackend;
 const backend=new NativeClientExecutionBackend(docker,{getReadiness:()=>({ready:true}),run:async input=>{launches++;endpoint=input.connection.endpoint;}},store,path.join(root,'host'));
 const input={task,worktreePath:work,signal:new AbortController().signal};
 await expect(backend.execute(input)).rejects.toThrow('operation receipt');expect(launches).toBe(0);
 await expect(backend.execute({...input,operationId:'operation'})).rejects.toThrow('No verified execution result');
 expect(launches).toBe(1);expect(recoveries).toBe(1);
 await expect(fetch(endpoint,{signal:AbortSignal.timeout(1000)})).rejects.toThrow();
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
