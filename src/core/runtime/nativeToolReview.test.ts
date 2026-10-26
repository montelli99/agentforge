import {it,expect} from 'vitest';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {WorkspaceStore} from '../store/workspaceStore.js';
import {NativeToolAuthorization} from './nativeToolAuthorization.js';
import {prepareNativeToolReview,authorizeReviewedNativeTool} from './nativeToolReview.js';
it('requires exact owner review and recovers issuance without resetting consumed permission',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'af-native-review-'));try{
 const work=path.join(root,'work');await fs.mkdir(work);const file=path.join(root,'workspace.json');const store=new WorkspaceStore(file);
 const task=store.createTask({title:'Synthetic native review',priority:'medium',status:'ready'});
 const request={taskId:task.id,operationId:'operation',sessionId:'session',callId:'call',tool:'write',input:{content:'synthetic'}};
 const gate=new NativeToolAuthorization(path.join(root,'host'),work);const review=prepareNativeToolReview(store,request);
 expect(prepareNativeToolReview(store,request).id).toBe(review.id);
 await expect(authorizeReviewedNativeTool(store,gate,review.id,request)).rejects.toThrow('owner review');
 store.resolveApproval({approvalId:review.id,status:'approved',approverUserId:'owner',decisionOrigin:'web'});
 await expect(authorizeReviewedNativeTool(store,gate,review.id,{...request,input:{content:'changed'}})).rejects.toThrow('owner review');
 const granted=await authorizeReviewedNativeTool(store,gate,review.id,request);
 const reopened=new WorkspaceStore(file);
 expect(await authorizeReviewedNativeTool(reopened,gate,review.id,request)).toEqual(granted);
 await gate.consume(granted.approvalId,request);
 await expect(authorizeReviewedNativeTool(reopened,gate,review.id,request)).rejects.toThrow('reconcile');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
