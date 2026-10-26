import {expect,it,vi} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {WorkspaceStore} from '../store/workspaceStore.js';
import {configureHermesRunConnection} from '../../providers/channels/hermesRunConnection.js';
import {prepareExternalTurnApproval,dispatchExternalTurn,observeExternalTurn,stopExternalTurn,readExternalTurnOutput} from './externalTurnDispatch.js';
it('real Hermes credential binding refuses all receipt operations after rotation and preserves saved output',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'af-hermes-binding-'));const file=path.join(dir,'state.json');
 const network=vi.fn(()=>{throw Error('No network operation is permitted in binding rejection');});vi.stubGlobal('fetch',network);
 try{
  const env={AGENTFORGE_HERMES_URL:'http://127.0.0.1:1',AGENTFORGE_HERMES_API_KEY:'synthetic-original'};
  const original=configureHermesRunConnection(env)!;const rotated=configureHermesRunConnection({...env,AGENTFORGE_HERMES_API_KEY:'synthetic-rotated'})!;expect(rotated.id).not.toBe(original.id);
  const store=new WorkspaceStore(file);const task=store.createTask({title:'Synthetic credential binding',priority:'medium',status:'ready'});const request={connectionId:original.id,sessionKey:'synthetic-session',message:'Synthetic request'};
  const approval=prepareExternalTurnApproval(store,task.id,'synthetic-owner',request);store.resolveApproval({approvalId:approval.id,status:'approved',approverUserId:'synthetic-owner',decisionOrigin:'web'});
  await dispatchExternalTurn(store,task.id,approval.id,request,{...original,submitSessionTurn:async()=>({runId:'run_synthetic'})});
  await readExternalTurnOutput(store,task.id,{...original,readRunOutput:async()=>({runId:'run_synthetic',content:'Synthetic saved result'})});
  const reopened=new WorkspaceStore(file);const before=fs.readFileSync(file,'utf8');
  await expect(observeExternalTurn(reopened,task.id,rotated)).rejects.toThrow();
  await expect(stopExternalTurn(reopened,task.id,'synthetic-owner',rotated)).rejects.toThrow();
  await expect(readExternalTurnOutput(reopened,task.id,rotated)).rejects.toThrow();
  await expect(dispatchExternalTurn(reopened,task.id,approval.id,request,rotated)).rejects.toThrow();
  expect(network).not.toHaveBeenCalled();expect(fs.readFileSync(file,'utf8')).toBe(before);
  const restored=configureHermesRunConnection(env)!;expect(restored.id).toBe(original.id);expect(await readExternalTurnOutput(reopened,task.id,restored)).toMatchObject({source:'saved',content:'Synthetic saved result'});expect(network).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();fs.rmSync(dir,{recursive:true,force:true});}
});
