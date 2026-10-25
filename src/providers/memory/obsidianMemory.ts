import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {MemoryProvider,MemoryQuery,OperationalMemoryRecord,MemorySearchResult} from '../../core/providers/memory.js';

/** Explicitly selected Markdown files only. Never scans a user's vault or writes notes. */
export class ObsidianMemoryProvider implements MemoryProvider {
  readonly id='obsidian';readonly name='Obsidian selected notes';
  private readonly files:readonly string[];
  constructor(private readonly root:string,private readonly namespace:string,private readonly projectId:string,files:readonly string[]){
    if(!path.isAbsolute(root)||!namespace||!projectId||files.length>100)throw Error('Explicit vault, project, namespace and at most 100 notes required');
    for(const file of files)if(!file||file.includes('\\')||file.includes(':')||file.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('.'))||!file.endsWith('.md'))throw Error('Select relative Markdown note paths');
    this.files=Object.freeze([...new Set(files)]);
  }
  private async read(file:string):Promise<OperationalMemoryRecord>{
    const root=path.resolve(this.root),target=path.join(root,file);
    // Reject links in the selected path, including the configured root's ancestors.
    let current=target;
    for(;;){const stat=await fs.lstat(current);if(stat.isSymbolicLink())throw Error('Linked memory paths are not supported');const parent=path.dirname(current);if(parent===current)break;current=parent;}
    const resolved=await fs.realpath(target),relative=path.relative(await fs.realpath(root),resolved);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Memory path escaped the selected vault');
    const handle=await fs.open(target,'r');
    try{
      const stat=await handle.stat();if(!stat.isFile()||stat.size>65536)throw Error('Selected note exceeds the 64 KB limit');
      const bytes=Buffer.alloc(65537);let bytesRead=0;
      while(bytesRead<bytes.length){const next=await handle.read(bytes,bytesRead,bytes.length-bytesRead,bytesRead);if(!next.bytesRead)break;bytesRead+=next.bytesRead;}
      if(bytesRead>65536)throw Error('Selected note exceeds the 64 KB limit');
      const content=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,bytesRead));
      return {id:createHash('sha256').update(file).digest('hex'),namespace:this.namespace,projectId:this.projectId,category:'general_fact',title:path.basename(file,'.md'),content,tags:['chat-context'],createdAt:stat.birthtime.toISOString(),updatedAt:stat.mtime.toISOString(),metadata:{providerId:this.id,relativePath:file,contentSha256:createHash('sha256').update(content).digest('hex'),readOnly:true}};
    }finally{await handle.close();}
  }
  async query(query:MemoryQuery):Promise<MemorySearchResult[]>{
    query.signal?.throwIfAborted();
    if(query.namespace!==this.namespace||query.projectId!==this.projectId||query.globalOnly)return [];
    if(query.categories&&!query.categories.includes('general_fact'))return [];
    if(query.tags?.length&&!query.tags.includes('chat-context'))return [];
    const terms=(query.queryText??'').toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches:MemorySearchResult[]=[];
    for(const file of this.files){query.signal?.throwIfAborted();const record=await this.read(file);query.signal?.throwIfAborted();const text=(record.title+'\n'+record.content).toLocaleLowerCase();const score=terms.filter(term=>text.includes(term)).length;if(!terms.length||score)matches.push({record,score});}
    return matches.sort((a,b)=>b.score-a.score).slice(0,Math.max(0,Math.min(query.limit??20,100)));
  }
  async get(namespace:string,id:string):Promise<OperationalMemoryRecord|null>{
    if(namespace!==this.namespace)return null;
    const file=this.files.find(value=>createHash('sha256').update(value).digest('hex')===id);
    return file?this.read(file):null;
  }
  async record():Promise<OperationalMemoryRecord>{throw Error('Selected Obsidian notes are read-only; edit them in your vault');}
  async delete():Promise<boolean>{throw Error('Selected Obsidian notes are read-only; disconnect a note to stop sharing it');}
  async getDoNotRepeatRules():Promise<OperationalMemoryRecord[]>{return [];}
}
