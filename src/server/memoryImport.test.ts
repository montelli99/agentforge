import {expect, it} from 'vitest';
import {WorkspaceStore} from '../core/store/workspaceStore.js';
import {reviewMemoryImport} from './memoryImport.js';

function fixture() {
  const record={id:'fixture-memory',namespace:'fixture',category:'general_fact',title:'Fixture',content:'Synthetic note',tags:[],createdAt:'2026-01-01T00:00:00.000Z'};
  return {format:'agentforge-memory',schemaVersion:1,namespace:'fixture',exportedAt:'2026-01-02T00:00:00.000Z',records:[record]};
}
it.each([
  ['coerced category',{category:['general_fact']}],
  ['invalid tags',{tags:[false]}],
  ['invalid creation date',{createdAt:'not a date'}],
  ['fractional version',{version:1.5}],
  ['invalid archive flag',{archived:'false'}],
  ['cross collection',{namespace:'other'}],
  ['unsupported record field',{credential:'synthetic-unused'}],
  ['malformed history',{revisions:[{version:1}]}],
  ['array metadata',{metadata:[]}],
] as const)('rejects %s without changing the store', (_name, patch) => {
  const store=new WorkspaceStore();const input=fixture();
  Object.assign(input.records[0],patch);
  expect(()=>reviewMemoryImport(input,'fixture',store)).toThrow();
  expect(store.listOperationalMemories('fixture')).toEqual([]);
});
it('bounds archive size, count, format and duplicate identities',()=>{
  const store=new WorkspaceStore(),input=fixture();
  for(const archive of [
    {...input,schemaVersion:2}, {...input,records:[]}, {...input,records:[input.records[0],input.records[0]]},
    {...input,records:Array.from({length:101},(_,i)=>({...input.records[0],id:String(i)}))},
    {...input,records:[{...input.records[0],metadata:{large:'x'.repeat(1048576)}}]},
  ]) expect(()=>reviewMemoryImport(archive,'fixture',store)).toThrow();
});
it('owns its reviewed snapshot and treats object key ordering as equivalent on replay',()=>{
  const store=new WorkspaceStore(),input=fixture();
  const review=reviewMemoryImport(input,'fixture',store);
  input.records[0].content='changed externally';
  expect(review.records[0].content).toBe('Synthetic note');
  store.importOperationalMemoryBatch(review.records,'fixture-owner');
  const reordered={...fixture(),records:[Object.fromEntries(Object.entries(review.records[0]).reverse())]};
  const replay=reviewMemoryImport(reordered,'fixture',store);
  expect(replay.unchanged).toBe(1);
  expect(store.importOperationalMemoryBatch(replay.records,'fixture-owner')).toEqual({imported:0,unchanged:1});
});
it('requires explicit active-project mapping and retains the original scope as provenance',()=>{
 const store=new WorkspaceStore();
 const workspace=store.createWorkspace({name:'Fixture'});
 const destination=store.createSpace({workspaceId:workspace.id,name:'Destination',provider:'web'});
 const other=store.createSpace({workspaceId:workspace.id,name:'Other',provider:'web'});
 const input={...fixture(),records:[{...fixture().records[0],projectId:'old-installation-project',metadata:{source:'fixture'}}]};
 expect(()=>reviewMemoryImport(input,'fixture',store)).toThrow(/missing or archived/);
 const reviewed=reviewMemoryImport(input,'fixture',store,{'old-installation-project':destination.id});
 expect(reviewed.items[0]).toMatchObject({sourceProjectId:'old-installation-project',projectId:destination.id});
 expect(reviewed.records[0].metadata).toEqual({source:'fixture',agentforgeProjectRemap:{from:'old-installation-project',to:destination.id,previous:null}});
 expect(input.records[0].projectId).toBe('old-installation-project');
 expect(reviewMemoryImport(input,'fixture',store,{'old-installation-project':other.id}).digest).not.toBe(reviewed.digest);
 store.importOperationalMemoryBatch(reviewed.records,'fixture-owner');
 expect(reviewMemoryImport(input,'fixture',store,{'old-installation-project':destination.id}).unchanged).toBe(1);
 expect(()=>reviewMemoryImport(input,'fixture',store,{'old-installation-project':other.id})).toThrow(/conflicts/);
 expect(()=>reviewMemoryImport(input,'fixture',store,{'old-installation-project':''})).toThrow();
 expect(()=>reviewMemoryImport(input,'fixture',store,{'unknown-source':destination.id})).toThrow();
 expect(reviewMemoryImport(fixture(),'fixture',new WorkspaceStore()).records[0].projectId).toBeUndefined();
});
