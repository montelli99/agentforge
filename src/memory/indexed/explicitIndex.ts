import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {ensureMemoryIndexSchema} from './memory-schema.js';
import {chunkMarkdown,hashText} from './primitives.js';
import {searchVector,searchKeyword} from './manager-search.js';
import {buildFtsQuery,bm25RankToScore,mergeHybridResults} from './hybrid.js';
import {buildContextPacket, type ContextPacket} from '../../contextPacket.js';
import type {ModelPlanDraftProvider} from '../../core/runtime/modelPlanDraftProvider.js';
import type {Task} from '../../core/types/task.js';

export interface IndexedEmbeddingProvider {identity:string;dimensions:number;embed(text:string):Promise<number[]>}
export interface ExplicitIndexOptions {userId:string;projectRoot:string;indexPath:string;inputFiles?:readonly string[];provider:IndexedEmbeddingProvider}
/** Adapts original OpenClaw schema/chunk/search algorithms; never its discovery factory.
 * No global cache, session discovery, credential resolution, background watcher, or provider fallback.
 * The embedding provider is a caller-owned explicit trust boundary.
 */
export class ExplicitIndexedMemory {
 private readonly db:DatabaseSync;private readonly root:string;private readonly inputs:readonly string[];private readonly identity:string;
 constructor(private readonly options:ExplicitIndexOptions){
  if(!options.userId.trim()||!options.provider.identity.trim()||!Number.isSafeInteger(options.provider.dimensions)||options.provider.dimensions<1)throw Error('Explicit user/provider identity required');
  if(!path.isAbsolute(options.projectRoot)||!path.isAbsolute(options.indexPath))throw Error('Absolute explicit paths required');
  this.root=path.resolve(options.projectRoot);this.noLinks(this.root);if(!fs.statSync(this.root).isDirectory())throw Error('Project root must exist');
  const index=this.resolve(options.indexPath);this.noLinks(path.dirname(index));if(!fs.statSync(path.dirname(index)).isDirectory())throw Error('Index parent must exist');
  if(fs.existsSync(index))this.noLinks(index);
  this.inputs=[...(options.inputFiles??[])];if(this.inputs.length>128||new Set(this.inputs).size!==this.inputs.length)throw Error('Invalid input allowlist');
  for(const file of this.inputs){if(path.isAbsolute(file)||!file.endsWith('.md'))throw Error('Explicit relative Markdown inputs required');this.resolve(file);}
  if(this.inputs.some(f=>this.resolve(f)===index))throw Error('Index cannot be an input');
  this.identity=JSON.stringify({version:'original-index-explicit-v1',userId:options.userId,root:this.root,inputs:[...this.inputs].sort(),provider:options.provider.identity,dimensions:options.provider.dimensions});
  const existed=fs.existsSync(index);this.db=new DatabaseSync(index);
  try{
   if(existed){const stored=this.db.prepare("SELECT value FROM meta WHERE key='explicit_identity'").get() as {value:string}|undefined;if(stored?.value!==this.identity)throw Error('Index identity mismatch; refusing adoption');}
   const schema=ensureMemoryIndexSchema({db:this.db,embeddingCacheTable:'embedding_cache',ftsTable:'chunks_fts',ftsEnabled:true});if(!schema.ftsAvailable)throw Error('FTS unavailable: '+schema.ftsError);
   this.db.exec("CREATE TABLE IF NOT EXISTS explicit_receipts(operation_id TEXT PRIMARY KEY, receipt TEXT NOT NULL)");
   this.db.exec("CREATE TABLE IF NOT EXISTS continuous_controls(operation_id TEXT PRIMARY KEY, receipt TEXT NOT NULL)");
   this.db.prepare("INSERT OR IGNORE INTO meta(key,value) VALUES ('explicit_identity',?)").run(this.identity);
  }catch(error){this.db.close();throw error;}
 }
 private resolve(input:string){const resolved=path.resolve(this.root,input),rel=path.relative(this.root,resolved);if(rel===''||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Path escapes project root');return resolved;}
 private noLinks(target:string){const parsed=path.parse(target);let current=parsed.root;for(const part of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){current=path.join(current,part);const stat=fs.lstatSync(current);if(stat.isSymbolicLink()||(stat.isFile()&&stat.nlink>1))throw Error('Link boundary rejected');}}
 private vector(v:number[]){if(!Array.isArray(v)||v.length!==this.options.provider.dimensions||v.some(n=>!Number.isFinite(n)))throw Error('Embedding profile mismatch');return v;}
 lifecycleState():string|undefined{return (this.db.prepare("SELECT value FROM meta WHERE key='lifecycle_state'").get() as {value:string}|undefined)?.value;}
 lifecycleReceipt(operationId:string):string|undefined{return (this.db.prepare("SELECT receipt FROM explicit_receipts WHERE operation_id=?").get(operationId) as {receipt:string}|undefined)?.receipt;}
 controlReceipt(operationId:string):string|undefined{return (this.db.prepare("SELECT receipt FROM continuous_controls WHERE operation_id=?").get(operationId) as {receipt:string}|undefined)?.receipt;}
 documentCount(){return (this.db.prepare('SELECT COUNT(*) AS count FROM files').get() as {count:number}).count;}
 assertSourcePresent(source:string){if(!this.inputs.includes(source))throw Error('Unapproved source');const absolute=this.resolve(source);this.noLinks(absolute);if(!fs.statSync(absolute).isFile())throw Error('Source must exist as regular file');}
 async sync(inputFiles:readonly string[]=this.inputs,lifecycleState?:string|((sources:Array<{path:string;hash:string}>)=>string),control?:{operationId:string;receipt:string}){
  if(inputFiles.some(file=>!this.inputs.includes(file))||new Set(inputFiles).size!==inputFiles.length)throw Error('Unapproved ingestion source');
  if(typeof lifecycleState==="string"&&lifecycleState.length>262144)throw Error('Lifecycle state exceeds bounds');
  const documents:Array<{rel:string;hash:string;mtime:number;size:number;chunks:Array<{startLine:number;endLine:number;text:string;hash:string;vector:number[]}>}>=[];
  for(const rel of inputFiles){const absolute=this.resolve(rel);if(!fs.existsSync(absolute))continue;this.noLinks(absolute);const fd=fs.openSync(absolute,'r');let content:string;let stat:fs.Stats;
   try{stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size>1048576)throw Error('Input must be bounded regular file');content=fs.readFileSync(fd,'utf8');this.noLinks(absolute);const after=fs.statSync(absolute);if(after.ino!==stat.ino||after.dev!==stat.dev||after.size!==stat.size||after.mtimeMs!==stat.mtimeMs)throw Error('Input changed during read');}finally{fs.closeSync(fd);}
   const chunks=[];for(const chunk of chunkMarkdown(content,{tokens:256,overlap:32})){chunks.push({...chunk,vector:this.vector(await this.options.provider.embed(chunk.text))});}
   documents.push({rel,hash:hashText(content),mtime:Math.floor(stat.mtimeMs),size:stat.size,chunks});
  }
  // Embed everything before transaction: provider failure preserves prior durable snapshot.
  this.db.exec('BEGIN IMMEDIATE');try{this.db.exec('DELETE FROM chunks_fts; DELETE FROM chunks; DELETE FROM files;');const addFile=this.db.prepare("INSERT INTO files(path,source,hash,mtime,size) VALUES (?,'memory',?,?,?)"),addChunk=this.db.prepare("INSERT INTO chunks(id,path,source,start_line,end_line,hash,model,text,embedding,updated_at) VALUES (?,?,'memory',?,?,?,?,?,?,?)"),addFts=this.db.prepare("INSERT INTO chunks_fts(text,id,path,source,model,start_line,end_line) VALUES (?,?,?,'memory',?,?,?)");
   for(const doc of documents){addFile.run(doc.rel,doc.hash,doc.mtime,doc.size);for(const [i,c]of doc.chunks.entries()){const id=hashText(JSON.stringify([doc.rel,doc.hash,i]));addChunk.run(id,doc.rel,c.startLine,c.endLine,c.hash,this.options.provider.identity,c.text,JSON.stringify(c.vector),Date.now());addFts.run(c.text,id,doc.rel,this.options.provider.identity,c.startLine,c.endLine);}}
   if(typeof lifecycleState==="function")lifecycleState=lifecycleState(documents.map(doc=>({path:doc.rel,hash:doc.hash})));
   if(lifecycleState!==undefined&&lifecycleState.length>262144)throw Error("Lifecycle state exceeds bounds");
   if(lifecycleState!==undefined){const state=JSON.parse(lifecycleState) as {receipts?:Array<{operationId:string}>};const receipt=state.receipts?.at(-1);if(receipt){const encoded=JSON.stringify(receipt);const existing=this.lifecycleReceipt(receipt.operationId);if(existing!==undefined&&existing!==encoded)throw Error('Lifecycle receipt identity conflict');this.db.prepare("INSERT OR IGNORE INTO explicit_receipts(operation_id,receipt) VALUES (?,?)").run(receipt.operationId,encoded);}}
   if(lifecycleState!==undefined)this.db.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES ('lifecycle_state',?)").run(lifecycleState);
   if(control)this.db.prepare('INSERT INTO continuous_controls(operation_id,receipt) VALUES (?,?)').run(control.operationId,control.receipt);
   this.db.exec('COMMIT');return {documents:documents.length,chunks:documents.reduce((n,d)=>n+d.chunks.length,0)};
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 async search(query:string,maxResults=6){if(query.length>8192||!Number.isSafeInteger(maxResults)||maxResults<1||maxResults>32)throw Error('Query bounds exceeded');const queryVec=this.vector(await this.options.provider.embed(query));
  const vector=await searchVector({db:this.db,vectorTable:'chunks_vec',providerModel:this.options.provider.identity,queryVec,limit:maxResults,snippetMaxChars:700,ensureVectorReady:async()=>false,sourceFilterVec:{sql:'',params:[]},sourceFilterChunks:{sql:'',params:[]}});
  const keyword=await searchKeyword({db:this.db,ftsTable:'chunks_fts',providerModel:this.options.provider.identity,query,limit:maxResults,snippetMaxChars:700,sourceFilter:{sql:'',params:[]},buildFtsQuery,bm25RankToScore});
  return (await mergeHybridResults({vector:vector.map(r=>({...r,vectorScore:r.score})),keyword,vectorWeight:0.7,textWeight:0.3,temporalDecay:{enabled:false},mmr:{enabled:false}})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,maxResults);
 }
 async planningContext(query:string,maxTokens=2048):Promise<ContextPacket>{if(maxTokens>12000)throw Error('Context bounds exceeded');const hits=await this.search(query);return buildContextPacket(hits.map(hit=>({id:hashText(JSON.stringify([this.identity,hit.path,hit.startLine,hit.snippet])),kind:'memory' as const,text:`${hit.path}:${hit.startLine}-${hit.endLine}\n${hit.snippet}`})),maxTokens);}
 async draftWithMemory(planner:ModelPlanDraftProvider,task:Task,signal?:AbortSignal){return planner.draft(task,signal,await this.planningContext(task.description));}
 close(){this.db.close();}
}
