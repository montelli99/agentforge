import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prepareScopedWritableDirectories } from './scopedDockerMounts.js';
const safe = (p: string) => {
 if (!/^[a-zA-Z0-9_.][a-zA-Z0-9_./-]*$/.test(p) || p.split('/').some(x=>!x||x==='.'||x==='..') || /^(?:\.git|\.worktrees)(?:\/|$)/i.test(p)) throw new Error('Unsupported writable file path.');
 return p;
};
export async function validateWritableFiles(root: string, files: readonly string[]): Promise<void> {
 if(files.length>10000) throw new Error('Writable file inspection limit exceeded.');
 for(const file of files) {
  safe(file); let current=root;
  for(const [index,part] of file.split('/').entries()) {
   current=path.join(current,part); const info=await fs.lstat(current);
   if(info.isSymbolicLink() || (info.isFile()&&info.nlink>1)) throw new Error('Writable file links are forbidden.');
   if(index===file.split('/').length-1 ? !info.isFile() : !info.isDirectory()) throw new Error('Writable file mount is not regular.');
  }
 }
}
/** Closed namespace: existing scoped files may change; new files require exact completion declarations. */
export async function prepareNonDeletingFileMounts(root: string, scope: {allowedPaths:string[];protectedPaths:string[]}, declarations: readonly string[]) {
 const directoryGrants=scope.allowedPaths.filter(p=>p.endsWith('/**'));
 const literalGrants=scope.allowedPaths.filter(p=>!p.endsWith('/**')).map(safe);
 const protectedPaths=scope.protectedPaths.map(p=>safe(p.endsWith('/**')?p.slice(0,-3):p));
 for(const file of literalGrants) for(const protectedPath of protectedPaths) {const f=file.toLowerCase(),p=protectedPath.toLowerCase();if(f===p||f.startsWith(p+'/')||p.startsWith(f+'/'))throw new Error('Writable file grant overlaps a protected path.');}
 const dirs=await prepareScopedWritableDirectories(root,{...scope,allowedPaths:directoryGrants});
 const validateParents=async(file:string)=>{let current=root;for(const [index,part] of file.split('/').entries()){current=path.join(current,part);let info;try{info=await fs.lstat(current);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')break;throw e;}if(info.isSymbolicLink()||(info.isFile()&&info.nlink>1)|| (index===file.split('/').length-1?!info.isFile():!info.isDirectory()))throw new Error('Writable file grant has an unsafe parent or type.');}};
 for(const file of literalGrants) await validateParents(file);
 const files:string[]=[]; let visited=0;
 const walk=async(relative:string):Promise<void>=>{ for(const item of await fs.readdir(path.join(root,relative),{withFileTypes:true})) {
  if(++visited>10000) throw new Error('Writable file inspection limit exceeded.');
  const child=`${relative}/${item.name}`;
  if(item.isDirectory()) await walk(child); else if(item.isFile()) files.push(safe(child)); else throw new Error('Unsupported writable file type.');
 }};
 for(const dir of dirs) await walk(dir);
 for(const file of literalGrants){try{const info=await fs.lstat(path.join(root,file));if(info.isFile())files.push(file);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
 // Validate every declaration before creating any placeholders.
 const declared=[...new Set(declarations.map(safe))];
 for(const file of declared) if(!literalGrants.includes(file)&&!dirs.some(dir=>file.startsWith(dir+'/'))) throw new Error('Declared output is outside allowed scope.');
 if(files.length+declared.length>10000)throw new Error("Writable file inspection limit exceeded.");
 for(const file of declared) await validateParents(file);
 const placeholders=new Map<string,string>();
 const cleanup=async()=>{ for(const [file,marker] of placeholders) {
  const target=path.join(root,file); const current=await fs.readFile(target,'utf8').catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return undefined;throw e;});
  if(current===marker) await fs.unlink(target);
 }};
 try {
  for(const file of declared) {
   const target=path.join(root,file);
   try { await fs.lstat(target); } catch(e) {
    if((e as NodeJS.ErrnoException).code!=='ENOENT') throw e;
    await fs.mkdir(path.dirname(target),{recursive:true});
    const marker=`AGENTFORGE_UNWRITTEN_OUTPUT_${randomUUID()}`;
    await fs.writeFile(target,marker,{flag:'wx'}); placeholders.set(file,marker);
   }
   files.push(file);
  }
  const writableFiles=[...new Set(files)]; await validateWritableFiles(root,writableFiles);
  return {writableFiles,discardUnwrittenPlaceholders:cleanup};
 } catch(e) {await cleanup();throw e;}
}
