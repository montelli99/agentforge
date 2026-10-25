import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {ExplicitIndexedMemory,type IndexedEmbeddingProvider} from './explicitIndex.js';
import {RealEmbeddingProvider} from '../../embeddingAdapter.js';
import type {Task} from '../../core/types/task.js';
import type {ContextPacket} from '../../contextPacket.js';

export interface IndexedServerConfiguration {mode:'original-index-explicit-v1';userId:string;projectId:string;projectRoot:string;indexPath:string;inputFiles:readonly string[];embedding:{baseUrl:string;model:string;modelDigest:string;dimensions:number}}
export interface IndexedMemoryRuntime {
 readonly config:{userId:string;projectId:string};
 status():unknown;
 control(body:{operation:string;operationId:string;expectedRevision:number;source?:string}):Promise<unknown>;
 query(query:string):Promise<unknown>;
 planningContext(task:Task):Promise<ContextPacket>;
 close():void|Promise<void>;
}
type Receipt={operationId:string;operation:string;revision:number;priorRevision:number;source?:string;sourceDigest?:string;snapshotDigest?:string;atUtc:string;receiptDigest:string};
type State={revision:number;registered:string[];receipts:Receipt[]};
/** Per-user controlled registrations. Mutates the owned index, never source documents. */
export class IndexedServerMode implements IndexedMemoryRuntime {
 readonly index:ExplicitIndexedMemory;private busy=false;
 constructor(readonly config:IndexedServerConfiguration,provider:IndexedEmbeddingProvider){
  if(config.mode!=='original-index-explicit-v1'||!config.userId?.trim()||!config.projectId?.trim()||!Array.isArray(config.inputFiles)||!config.embedding?.modelDigest?.trim())throw Error('Incomplete explicit indexed configuration');
  const expected=JSON.stringify(['ollama',config.embedding.model,config.embedding.modelDigest]);if(provider.identity!==expected||provider.dimensions!==config.embedding.dimensions)throw Error('Configured embedding profile mismatch');
  this.index=new ExplicitIndexedMemory({...config,provider});
  if(!this.index.lifecycleState()&&this.index.documentCount()){this.index.close();throw Error("Unmanaged index cannot be adopted by controlled server mode");}
 }
 private state():State{const raw=this.index.lifecycleState();if(!raw)return {revision:0,registered:[],receipts:[]};const state=JSON.parse(raw) as State;if(!Number.isSafeInteger(state.revision)||!Array.isArray(state.registered)||state.registered.some(f=>!this.config.inputFiles.includes(f))||!Array.isArray(state.receipts))throw Error('Invalid durable lifecycle state');return state;}
 status(){const state=this.state();return {mode:this.config.mode,projectId:this.config.projectId,revision:state.revision,registered:state.registered,receipts:state.receipts,embeddingProfile:{model:this.config.embedding.model,modelDigest:this.config.embedding.modelDigest,dimensions:this.config.embedding.dimensions},automaticDiscovery:false,sourceWrites:false};}
 async control(body:{operation:string;operationId:string;expectedRevision:number;source?:string}){
  if(this.busy)throw Error('Indexed lifecycle operation already active');if(!['create','ingest','update','delete','rescan'].includes(body.operation)||!body.operationId?.match(/^[a-zA-Z0-9_-]{1,80}$/))throw Error('Invalid lifecycle operation');
  const old=this.state(),priorRaw=this.index.lifecycleReceipt(body.operationId),prior=priorRaw?JSON.parse(priorRaw) as Receipt:undefined;if(prior){if(prior.operation!==body.operation||prior.source!==body.source)throw Error('Operation ID conflict');return {...prior,replayed:false,alreadyCompleted:true};}
  
  if(body.expectedRevision!==old.revision)throw Error('Stale lifecycle revision');let registered=[...old.registered];const source=body.source;
  if(body.operation!=='rescan'){if(!source||!this.config.inputFiles.includes(source))throw Error('Source outside explicit allowlist');if(body.operation!=="delete")this.index.assertSourcePresent(source);const exists=registered.includes(source);if(body.operation==='create'&&exists)throw Error('Source already registered');if(['update','delete'].includes(body.operation)&&!exists)throw Error('Source is not registered');if(body.operation==='delete')registered=registered.filter(f=>f!==source);else if(!exists)registered.push(source);}
  this.busy=true;try{const receiptBase={operationId:body.operationId,operation:body.operation,revision:old.revision+1,priorRevision:old.revision,source,atUtc:new Date().toISOString()};const receipt:Receipt={...receiptBase,receiptDigest:crypto.createHash('sha256').update(JSON.stringify(receiptBase)).digest('hex')};const next={revision:receipt.revision,registered,receipts:[...old.receipts,receipt].slice(-128)};const observed=await this.index.sync(registered,sources=>{if(this.state().revision!==old.revision)throw Error("Concurrent lifecycle revision changed");receipt.sourceDigest=sources.find(s=>s.path===source)?.hash;receipt.snapshotDigest=crypto.createHash("sha256").update(JSON.stringify(sources)).digest("hex");const {receiptDigest,...evidence}=receipt;receipt.receiptDigest=crypto.createHash("sha256").update(JSON.stringify(evidence)).digest("hex");return JSON.stringify(next);});return {...receipt,observed,replayed:false};}finally{this.busy=false;}
 }
 async query(query:string){return this.index.search(query);}
 async planningContext(task:Task){if(task.projectId!==this.config.projectId)throw Error('Task outside configured indexed project');return this.index.planningContext(task.description);}
 close(){this.index.close();}
}

export async function configureIndexedServerMode(config:IndexedServerConfiguration,providerOverride?:IndexedEmbeddingProvider){
 if(providerOverride)return new IndexedServerMode(config,providerOverride);
 const url=new URL(config.embedding.baseUrl);if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash)throw Error('Explicit local embedding endpoint required');
 const verifyDigest=async()=>{const tagsResponse=await fetch(new URL("/api/tags",url),{signal:AbortSignal.timeout(10000),redirect:"error"});if(!tagsResponse.ok)throw Error("Local model inventory unavailable");const inventory=await tagsResponse.json() as {models?:Array<{name:string;model?:string;digest:string}>};if(!inventory.models?.some(m=>(m.name===config.embedding.model||m.model===config.embedding.model)&&m.digest===config.embedding.modelDigest))throw Error("Local embedding model digest mismatch");};await verifyDigest();
 const provider=new RealEmbeddingProvider({provider:'ollama',baseUrl:config.embedding.baseUrl,model:config.embedding.model,fallbackToHash:false,requestTimeoutMs:10000});await provider.initialize();const status=provider.getStatus();if(!status.active||status.mode!=='real'||status.dimension!==config.embedding.dimensions)throw Error('Configured local embedding provider unavailable/profile mismatch');
 return new IndexedServerMode(config,{identity:JSON.stringify(['ollama',config.embedding.model,config.embedding.modelDigest]),dimensions:config.embedding.dimensions,embed:async text=>{await verifyDigest();return provider.embed(text);}});
}
export function readIndexedServerConfiguration(filename:string):IndexedServerConfiguration{if(!path.isAbsolute(filename)||fs.lstatSync(filename).isSymbolicLink())throw Error('Explicit nonlinked configuration file required');if(fs.statSync(filename).size>32768)throw Error('Configuration exceeds bounds');return JSON.parse(fs.readFileSync(filename,'utf8')) as IndexedServerConfiguration;}
