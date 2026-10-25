import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, expect, it} from 'vitest';
import {prepareNonDeletingFileMounts} from './nonDeletingFileMounts.js';
import {prepareScopedWritableDirectories} from './scopedDockerMounts.js';
const roots: string[] = [];
async function root() {const value=await fs.mkdtemp(path.join(os.tmpdir(),'agentforge-mount-proof-'));roots.push(value);return value;}
afterEach(async()=>{await Promise.all(roots.splice(0).map(value=>fs.rm(value,{recursive:true,force:true})));});
const protectedPaths=['.env','.env.*','.git/**'];
it('prepares declared outputs with default protections and cleans unwritten placeholders',async()=>{
 const directory=await root();await fs.writeFile(path.join(directory,'.env.local'),'synthetic sentinel');
 const mount=await prepareNonDeletingFileMounts(directory,{allowedPaths:['artifacts/**'],protectedPaths},['artifacts/result.txt']);
 expect(mount.writableFiles).toEqual(['artifacts/result.txt']);
 expect(await fs.readFile(path.join(directory,'.env.local'),'utf8')).toBe('synthetic sentinel');
 await mount.discardUnwrittenPlaceholders();
 await expect(fs.stat(path.join(directory,'artifacts/result.txt'))).rejects.toMatchObject({code:'ENOENT'});
});
it('rejects a literal protected output before creating placeholders',async()=>{
 const directory=await root();
 await expect(prepareNonDeletingFileMounts(directory,{allowedPaths:['.env.local'],protectedPaths},['.env.local'])).rejects.toThrow('overlaps');
 expect(await fs.readdir(directory)).toEqual([]);
});
it('rejects a directory containing protected files before creating it',async()=>{
 const directory=await root();
 await expect(prepareScopedWritableDirectories(directory,{allowedPaths:['config/**'],protectedPaths:['config/.env.*']})).rejects.toThrow('overlaps');
 expect(await fs.readdir(directory)).toEqual([]);
});
