import {expect,it} from 'vitest';
import type {Task} from '../core/types/task.js';
import {requestedArtifactReads} from './artifactGrounding.js';
const task=(id:string)=>({id,evidencePack:{artifacts:[{path:'artifacts/output.json'}]}} as Task);
it('selects explicitly named output without guessing another file',()=>{
 expect(requestedArtifactReads([task('task-one')],'Read artifacts/output.json')).toEqual([{taskId:'task-one',path:'artifacts/output.json'}]);
 expect(requestedArtifactReads([task('task-one')],'Hello')).toEqual([]);
 expect(requestedArtifactReads([task('task-one')],'Read private.json')).toEqual([]);
});
it('requires task identity for ambiguous paths',()=>{
 const tasks=[task('task-one'),task('task-two')];
 expect(()=>requestedArtifactReads(tasks,'Read artifacts/output.json')).toThrow('task ID');
 expect(requestedArtifactReads(tasks,'Read task-two artifacts/output.json')).toEqual([{taskId:'task-two',path:'artifacts/output.json'}]);
});
it('does not treat longer filenames or task IDs as exact references',()=>{
 const tasks=[task('task-one'),task('task-one-extra')];
 expect(requestedArtifactReads(tasks,'Read task-one-extra `artifacts/output.json`.')).toEqual([{taskId:'task-one-extra',path:'artifacts/output.json'}]);
 for(const prompt of ['Read artifacts/output.json.bak','Read other/artifacts/output.json','Read artifacts/output.json/child'])expect(requestedArtifactReads(tasks,prompt)).toEqual([]);
});
