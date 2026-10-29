import type {MemoryProvider,MemoryQuery,MemorySearchResult,OperationalMemoryRecord} from '../../core/providers/memory.js';

/** Read-only Hindsight Cloud recall. One explicitly selected bank belongs to one project. */
export class HindsightMemoryProvider implements MemoryProvider {
 readonly id='hindsight';readonly name='Hindsight Cloud recall';
 constructor(private readonly bank:string,private readonly namespace:string,private readonly projectId:string,private readonly apiKey:string,private readonly request:typeof fetch=fetch){
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(bank)||!namespace||!projectId||!apiKey||apiKey.length>8192||/[\r\n]/.test(apiKey))throw Error('Explicit Hindsight bank, project, namespace and API key required');
 }
 async query(query:MemoryQuery):Promise<MemorySearchResult[]>{
  if(query.namespace!==this.namespace||query.projectId!==this.projectId||query.globalOnly)return [];
  if(query.categories?.length&&!query.categories.includes('general_fact'))return [];
  // This read-only adapter exposes only the explicitly selected chat-context tag.
  if(query.tags?.some(tag=>tag!=='chat-context'))return [];
  if(!query.queryText?.trim())return [];
  if(query.queryText.length>2000)throw Error('Memory query exceeds limit');
  const signal=AbortSignal.any([AbortSignal.timeout(15000),...(query.signal?[query.signal]:[])]);signal.throwIfAborted();
  try{
   const response=await this.request('https://api.hindsight.vectorize.io/v1/default/banks/'+encodeURIComponent(this.bank)+'/memories/recall',{
    method:'POST',redirect:'error',signal,headers:{Authorization:'Bearer '+this.apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({query:query.queryText,budget:'low',max_tokens:2048,tags:['chat-context'],tags_match:'all_strict',trace:false}),
   });
   if(!response.ok){await response.body?.cancel();throw Error('Recall failed');}
   const reader=response.body?.getReader();if(!reader)throw Error('Missing response');
   const chunks:Uint8Array[]=[];let size=0;
   try{for(;;){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>262144)throw Error('Response exceeds limit');chunks.push(item.value);}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!Array.isArray(body.results)||body.results.length>1000)throw Error('Invalid recall response');
   const results:MemorySearchResult[]=[];
   for(const value of body.results){
    if(!value||typeof value.id!=='string'||value.id.length>256||typeof value.text!=='string'||value.text.length>16000||!Array.isArray(value.tags)||!value.tags.includes('chat-context')||typeof value.mentioned_at!=='string'||!Number.isFinite(Date.parse(value.mentioned_at)))continue;
    const record:OperationalMemoryRecord={id:value.id,namespace:this.namespace,projectId:this.projectId,category:'general_fact',title:'Hindsight '+value.id,content:value.text,tags:['chat-context'],createdAt:value.mentioned_at,metadata:{providerId:this.id,bankId:this.bank,readOnly:true,...(typeof value.document_id==='string'?{documentId:value.document_id}:{}),...(typeof value.type==='string'?{factType:value.type}:{})}};
    results.push({record,score:1/(results.length+1)});
   }
   signal.throwIfAborted();return results.slice(0,Math.max(0,Math.min(query.limit??8,24)));
  }catch{throw Error('Hindsight recall unavailable; check the selected bank and connection');}
 }
 async get():Promise<OperationalMemoryRecord|null>{throw Error('Direct fact lookup is not supported by this recall adapter');}
 async record():Promise<OperationalMemoryRecord>{throw Error('Hindsight connection is read-only');}
 async delete():Promise<boolean>{throw Error('Hindsight connection is read-only');}
 async getDoNotRepeatRules():Promise<OperationalMemoryRecord[]>{return [];}
}
