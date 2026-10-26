import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {WorkspaceStore} from './workspaceStore.js';
import type {OperationalMemoryRecord} from '../providers/memory.js';

const directories: string[] = [];
const record = (id: string): OperationalMemoryRecord => ({id, namespace: 'synthetic', category: 'do_not_repeat', title: id, content: 'Keep this lesson', tags: ['fixture'], createdAt: '2026-01-01T00:00:00.000Z', version: 2, archived: false});
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agentforge-memory-import-'));
  directories.push(directory);
  const file = path.join(directory, 'workspace.json');
  return {file, store: new WorkspaceStore(file)};
}
afterEach(() => {vi.restoreAllMocks(); for (const directory of directories.splice(0)) fs.rmSync(directory, {recursive: true, force: true});});

it('persists the full batch and receipt across restart, and replay does not write again', () => {
  const {file, store} = fixture();
  const records = [record('a'), record('b')];
  expect(store.importOperationalMemoryBatch(records, 'fixture-owner')).toEqual({imported: 2, unchanged: 0});
  const reopened = new WorkspaceStore(file);
  expect(reopened.listOperationalMemories('synthetic')).toEqual(records);
  expect(reopened.listAuditEntries().filter(entry => entry.action === 'memory_batch_imported')).toHaveLength(1);
  const before = fs.readFileSync(file, 'utf8');
  expect(reopened.importOperationalMemoryBatch(records, 'fixture-owner')).toEqual({imported: 0, unchanged: 2});
  expect(fs.readFileSync(file, 'utf8')).toBe(before);
});

it('rejects a conflicting batch before importing any additions', () => {
  const {file, store} = fixture();
  store.importOperationalMemoryBatch([record('a')], 'fixture-owner');
  const before = fs.readFileSync(file, 'utf8');
  expect(() => store.importOperationalMemoryBatch([record('b'), {...record('a'), content: 'conflict'}], 'fixture-owner')).toThrow(/conflicts/);
  expect(store.listOperationalMemories('synthetic')).toEqual([record('a')]);
  expect(fs.readFileSync(file, 'utf8')).toBe(before);
});

it('rolls back records and audit without notifications when persistence fails', () => {
  const {file, store} = fixture();
  const before = fs.readFileSync(file, 'utf8');
  const audit = store.listAuditEntries();
  const listener = vi.fn();
  store.subscribe(listener);
  vi.spyOn(store, 'saveToFile').mockImplementation(() => {throw new Error('synthetic disk failure');});
  expect(() => store.importOperationalMemoryBatch([record('a'), record('b')], 'fixture-owner')).toThrow('synthetic disk failure');
  expect(store.listOperationalMemories('synthetic')).toEqual([]);
  expect(store.listAuditEntries()).toEqual(audit);
  expect(listener).not.toHaveBeenCalled();
  expect(fs.readFileSync(file, 'utf8')).toBe(before);
});

it('owns imported values and tolerates failed notification after a durable commit', () => {
  const {file, store} = fixture();
  store.subscribe(() => {throw new Error('synthetic listener failure');});
  const input = record('a');
  expect(store.importOperationalMemoryBatch([input], 'fixture-owner').imported).toBe(1);
  input.tags.push('mutated');
  input.content = 'mutated';
  expect(store.listOperationalMemories('synthetic')).toEqual([record('a')]);
  expect(new WorkspaceStore(file).listOperationalMemories('synthetic')).toEqual([record('a')]);
});

it('refuses a stale writer without erasing a concurrently saved batch', () => {
  const {file, store} = fixture();
  const stale = new WorkspaceStore(file);
  const notices = vi.fn();
  stale.subscribe(notices);
  store.importOperationalMemoryBatch([record('first')], 'fixture-owner');
  expect(() => stale.importOperationalMemoryBatch([record('second')], 'fixture-owner')).toThrow(/snapshot changed/i);
  expect(stale.listOperationalMemories('synthetic')).toEqual([]);
  expect(notices).not.toHaveBeenCalled();
  expect(new WorkspaceStore(file).listOperationalMemories('synthetic')).toEqual([record('first')]);
});

it('rolls back deletion on disk failure and only notifies after durable removal',()=>{
 const {file,store}=fixture();store.importOperationalMemoryBatch([record('delete-me')],'owner');
 const listener=vi.fn();store.subscribe(listener);const before=fs.readFileSync(file,'utf8');
 const save=vi.spyOn(store,'saveToFile').mockImplementation(()=>{throw Error('disk failure');});
 expect(()=>store.deleteOperationalMemory('synthetic','delete-me')).toThrow('disk failure');
 expect(store.listOperationalMemories('synthetic')).toEqual([record('delete-me')]);
 expect(fs.readFileSync(file,'utf8')).toBe(before);expect(listener).not.toHaveBeenCalled();
 save.mockRestore();store.subscribe(()=>{throw Error('notification failure');});
 expect(store.deleteOperationalMemory('synthetic','delete-me')).toBe(true);
 expect(new WorkspaceStore(file).listOperationalMemories('synthetic')).toEqual([]);
 expect(listener).toHaveBeenCalledTimes(1);
 expect(store.deleteOperationalMemory('synthetic','delete-me')).toBe(false);
});

it('rolls back failed creation and editing without publishing phantom memories',()=>{
 const {file,store}=fixture();store.saveOperationalMemory(record('existing'));
 const notice=vi.fn();store.subscribe(notice);const before=fs.readFileSync(file,'utf8');
 const save=vi.spyOn(store,'saveToFile').mockImplementation(()=>{throw Error('disk failure');});
 expect(()=>store.saveOperationalMemory(record('new'))).toThrow('disk failure');
 expect(()=>store.saveOperationalMemory({...record('existing'),content:'changed'})).toThrow('disk failure');
 expect(store.listOperationalMemories('synthetic')).toEqual([record('existing')]);
 expect(fs.readFileSync(file,'utf8')).toBe(before);expect(notice).not.toHaveBeenCalled();save.mockRestore();
 store.subscribe(()=>{throw Error('listener failure');});const input=record('new');
 expect(()=>store.saveOperationalMemory(input)).not.toThrow();input.content='mutated outside store';
 expect(store.listOperationalMemories('synthetic').find(r=>r.id==='new')).toEqual(record('new'));
 expect(new WorkspaceStore(file).listOperationalMemories('synthetic').find(r=>r.id==='new')).toEqual(record('new'));
 expect(notice).toHaveBeenCalledTimes(1);
});

it('returns detached memory reads so editing a result cannot bypass persistence',()=>{
 const {file,store}=fixture();store.saveOperationalMemory(record('owned'));
 const listed=store.listOperationalMemories('synthetic');listed[0].content='uncommitted';listed[0].tags.push('uncommitted');
 const searched=store.searchOperationalMemory('lesson','synthetic');searched[0].content='also uncommitted';
 expect(store.listOperationalMemories('synthetic')).toEqual([record('owned')]);
 expect(new WorkspaceStore(file).listOperationalMemories('synthetic')).toEqual([record('owned')]);
});

it.each(['save','delete'] as const)('refuses stale %s without erasing another session update',operation=>{
 const {file,store}=fixture();store.saveOperationalMemory(record('shared'));
 const stale=new WorkspaceStore(file);const notice=vi.fn();stale.subscribe(notice);
 store.saveOperationalMemory({...record('shared'),content:'newer committed value',version:3});
 const action=()=>operation==='save'?stale.saveOperationalMemory({...record('shared'),content:'stale overwrite'}):stale.deleteOperationalMemory('synthetic','shared');
 expect(action).toThrow(/snapshot changed/i);
 expect(stale.listOperationalMemories('synthetic')).toEqual([record('shared')]);
 expect(notice).not.toHaveBeenCalled();
 expect(new WorkspaceStore(file).listOperationalMemories('synthetic')[0]).toMatchObject({content:'newer committed value',version:3});
});

it('refuses moving an existing identity into another collection without losing the original', () => {
  const {file, store} = fixture();const original=record('same-id');store.saveOperationalMemory(original);
  const before=fs.readFileSync(file,'utf8');
  expect(()=>store.saveOperationalMemory({...original,namespace:'other',content:'Replacement'})).toThrow('another collection');
  expect(fs.readFileSync(file,'utf8')).toBe(before);
  expect(store.listOperationalMemories('synthetic')).toEqual([original]);
  expect(store.listOperationalMemories('other')).toEqual([]);
  expect(new WorkspaceStore(file).listOperationalMemories('synthetic')).toEqual([original]);
  store.saveOperationalMemory({...original,content:'Valid same-collection update'});
  expect(new WorkspaceStore(file).listOperationalMemories('synthetic')[0].content).toBe('Valid same-collection update');
});
