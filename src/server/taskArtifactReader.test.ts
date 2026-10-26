import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {afterEach,expect,it} from 'vitest';
import type {Task} from '../core/types/task.js';
import {readVerifiedTaskArtifact} from './taskArtifactReader.js';
const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>fs.rm(root,{recursive:true,force:true})));});
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'artifact-reader-'));roots.push(root);
 const content='{"total":950}';await fs.mkdir(path.join(root,'artifacts'));await fs.writeFile(path.join(root,'artifacts/report.json'),content);
 const task={worktree:{worktreePath:root},evidencePack:{verifiedPassed:true,artifacts:[{path:'artifacts/report.json',sizeBytes:Buffer.byteLength(content),sha256:createHash('sha256').update(content).digest('hex')}]}} as Task;
 return {root,content,task};
}
it('returns only the hash-verified recorded output as reference data',async()=>{const f=await fixture();expect(await readVerifiedTaskArtifact(f.task,'artifacts/report.json')).toMatchObject({content:f.content,referenceDataOnly:true});});
it('rejects same-size changes after verification',async()=>{const f=await fixture();await fs.writeFile(path.join(f.root,'artifacts/report.json'),'{"total":951}');await expect(readVerifiedTaskArtifact(f.task,'artifacts/report.json')).rejects.toThrow('changed');});
it('rejects unrecorded inputs, traversal and unverified results',async()=>{const f=await fixture();for(const name of ['inputs/private.json','../private.json',path.join(f.root,'artifacts/report.json')])await expect(readVerifiedTaskArtifact(f.task,name)).rejects.toThrow();f.task.evidencePack!.verifiedPassed=false;await expect(readVerifiedTaskArtifact(f.task,'artifacts/report.json')).rejects.toThrow();});
it('rejects oversized recorded output before reading it',async()=>{const f=await fixture();f.task.evidencePack!.artifacts[0].sizeBytes=60001;await expect(readVerifiedTaskArtifact(f.task,'artifacts/report.json')).rejects.toThrow('60 KB');});

it('blocks reading an output from another conversation',async()=>{
 const {WorkspaceStore}=await import('../core/store/workspaceStore.js');
 const {invokeConversationTool}=await import('./conversationTools.js');
 const f=await fixture();const store=new WorkspaceStore();
 const workspace=store.createWorkspace({name:'Synthetic'});
 const project=store.createSpace({name:'Synthetic',workspaceId:workspace.id,provider:'web'});
 const channel=store.createChannel({workspaceId:workspace.id,spaceId:project.id,name:'Test',visibility:'private',archived:false,provider:'web'});
 const thread=store.createThread(channel.id,'Output');
 const other=store.createThread(channel.id,'Other');
 const task=store.createTask({projectId:project.id,title:'Invoice',description:'Synthetic',priority:'medium',status:'completed',originThreadId:thread.id}); store.updateTask(task.id,{worktree:f.task.worktree,evidencePack:f.task.evidencePack});
 const args=JSON.stringify({taskId:task.id,path:'artifacts/report.json'});
 expect(await invokeConversationTool(store,undefined,thread.id,'prompt','read_task_artifact',args,new AbortController().signal)).toMatchObject({content:f.content});
 await expect(invokeConversationTool(store,undefined,other.id,'prompt','read_task_artifact',args,new AbortController().signal)).rejects.toThrow('not in this conversation');
});


