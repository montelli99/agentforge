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
it('reports an outage, retries only on a new query, and preserves provenance after recovery',async()=>{
 const request=vi.fn<typeof fetch>()
  .mockResolvedValueOnce(new Response('private provider diagnostic',{status:503}))
  .mockResolvedValueOnce(Response.json({results:[{id:'restored',text:'Synthetic restored fact',tags:['chat-context'],mentioned_at:'2026-01-01T00:00:00Z',document_id:'synthetic-document'}]}));
 const provider=new HindsightMemoryProvider('fixture-bank','workspace','project','synthetic-key',request);
 const query={namespace:'workspace',projectId:'project',queryText:'fact'};
 await expect(provider.query(query)).rejects.toThrow('Hindsight recall unavailable');
 expect(request).toHaveBeenCalledTimes(1);
 await expect(provider.query({...query,projectId:'other-project'})).resolves.toEqual([]);
 expect(request).toHaveBeenCalledTimes(1);
 const results=await provider.query(query);
 expect(request).toHaveBeenCalledTimes(2);
 expect(results[0].record).toMatchObject({id:'restored',namespace:'workspace',projectId:'project',metadata:{providerId:'hindsight',bankId:'fixture-bank',readOnly:true,documentId:'synthetic-document'}});
});

it('distinguishes valid empty recall from malformed and oversized responses',async()=>{
 const request=vi.fn<typeof fetch>()
  .mockResolvedValueOnce(Response.json({results:[]}))
  .mockResolvedValueOnce(Response.json({error:'synthetic-private-detail'}))
  .mockResolvedValueOnce(new Response('x'.repeat(262145)));
 const provider=new HindsightMemoryProvider('fixture-bank','workspace','project','synthetic-key',request);
 const query={namespace:'workspace',projectId:'project',queryText:'fact'};
 await expect(provider.query(query)).resolves.toEqual([]);
 for(let i=0;i<2;i++)await expect(provider.query(query)).rejects.toThrow('Hindsight recall unavailable');
 expect(request).toHaveBeenCalledTimes(3);
});
