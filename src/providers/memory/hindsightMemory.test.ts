import {expect,it,vi} from 'vitest';
import {HindsightMemoryProvider} from './hindsightMemory.js';
it('honors standalone tag and category filters before contacting the selected bank',async()=>{
 const request=vi.fn<typeof fetch>(async()=>Response.json({results:[{id:'fixture',text:'Synthetic selected fact',tags:['chat-context'],mentioned_at:'2026-01-01T00:00:00Z'}]}));
 const provider=new HindsightMemoryProvider('fixture-bank','workspace','project','synthetic-key',request);
 const query={namespace:'workspace',projectId:'project',queryText:'fact'};
 await expect(provider.query({...query,tags:['unselected']})).resolves.toEqual([]);
 await expect(provider.query({...query,tags:['chat-context','unselected']})).resolves.toEqual([]);
 await expect(provider.query({...query,categories:['do_not_repeat']})).resolves.toEqual([]);
 expect(request).not.toHaveBeenCalled();
 for(const filters of [{tags:[]},{tags:['chat-context']},{categories:[]}]){
  const result=await provider.query({...query,...filters});expect(result).toHaveLength(1);expect(result[0].record.tags).toEqual(['chat-context']);
 }
 expect(request).toHaveBeenCalledTimes(3);
});
