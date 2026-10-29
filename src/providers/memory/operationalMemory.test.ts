import { describe, expect, it,vi } from "vitest";
import {HindsightMemoryProvider} from './hindsightMemory.js';
import { OperationalMemoryProvider } from "./operationalMemory.js";
import {ObsidianMemoryProvider} from './obsidianMemory.js';
import {CompositeMemoryProvider} from './compositeMemory.js';
import {memorySourceIdentity,queryMemoryBounded} from '../../core/providers/memory.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe("OperationalMemoryProvider", () => {
  it("keeps project-scoped retrieval isolated while retaining shared rules", async () => {
    const memory = new OperationalMemoryProvider();
    const globalRule = await memory.record({
      namespace: "workspace",
      category: "do_not_repeat",
      title: "Workspace rule",
      content: "An explicitly shared rule is available in project lookups.",
      tags: ["safety"],
    });
    const projectRule = await memory.record({
      namespace: "workspace",
      category: "do_not_repeat",
      title: "Project alpha rule",
      content: "Keep alpha project evidence isolated.",
      tags: ["safety", "alpha"],
      projectId: "alpha",
    });
    const betaRule = await memory.record({
      namespace: "workspace",
      category: "repo_history",
      title: "Project beta history",
      content: "This belongs to a different project.",
      tags: ["beta"],
      projectId: "beta",
    });

    const scoped = await memory.query({
      namespace: "workspace",
      categories: ["do_not_repeat"],
      projectId: "alpha",
      tags: ["safety"],
    });
    expect(scoped.map(result => result.record.id)).toEqual([globalRule.id, projectRule.id]);
    expect(scoped.map(result => result.record.id)).not.toContain(betaRule.id);
    const thirdParty = Object.assign(Object.create(memory), {
      query: vi.fn(async () => [betaRule, globalRule, projectRule, { ...projectRule, id: 'archived', archived: true }]
        .map(record => ({ record, score: 1 }))),
    });
    const guarded = await queryMemoryBounded(thirdParty, { namespace: 'workspace', projectId: 'alpha', tags: ['safety'], limit: 2 });
    expect(guarded.map(item => item.record.id)).toEqual([globalRule.id, projectRule.id]);
    expect(await queryMemoryBounded(thirdParty, { namespace: 'other', limit: 2 })).toEqual([]);
    thirdParty.query.mockResolvedValueOnce([{ record: { ...projectRule, content: 'x'.repeat(65537) }, score: 1 }]);
    await expect(queryMemoryBounded(thirdParty, { namespace: 'workspace' })).rejects.toThrow('Invalid memory provider');
    thirdParty.query.mockRejectedValueOnce(Error('synthetic-private-api-key'));
    await expect(queryMemoryBounded(thirdParty, { namespace: 'workspace' })).rejects.toThrow(/^Memory provider lookup failed$/);
    const globalOnly = await memory.query({ namespace: "workspace", globalOnly: true });
    expect(globalOnly.map(result => result.record.id)).toEqual([globalRule.id]);
    expect(await memory.getDoNotRepeatRules("workspace", "alpha")).toEqual([globalRule, projectRule]);
    expect(await memory.delete("workspace", projectRule.id)).toBe(true);
    expect(await memory.delete("workspace", projectRule.id)).toBe(false);
    const remote=vi.fn<typeof fetch>(async(url,init)=>{
      expect(String(url)).toBe('https://api.hindsight.vectorize.io/v1/default/banks/synthetic-bank/memories/recall');
      expect(init?.redirect).toBe('error');expect(JSON.parse(String(init?.body))).toMatchObject({tags_match:'all_strict',tags:['chat-context']});
      return Response.json({results:[{id:'shared',text:'Selected remote fact',tags:['chat-context'],mentioned_at:'2026-01-01T00:00:00Z'},{id:'unshared',text:'Excluded fact',tags:[],mentioned_at:'2026-01-01T00:00:00Z'}]});
    });
    const hindsight=new HindsightMemoryProvider('synthetic-bank','workspace','alpha','synthetic-key',remote);
    expect(await hindsight.query({namespace:'workspace',projectId:'beta',queryText:'fact'})).toEqual([]);expect(remote).not.toHaveBeenCalled();
    const recalled=await hindsight.query({namespace:'workspace',projectId:'alpha',queryText:'fact'});
    expect(recalled.map(item=>item.record.id)).toEqual(['shared']);expect(remote).toHaveBeenCalledTimes(1);
    remote.mockResolvedValueOnce(new Response('synthetic-secret-provider-error',{status:401}));
    await expect(hindsight.query({namespace:'workspace',projectId:'alpha',queryText:'fact'})).rejects.toThrow(/^Hindsight recall unavailable; check the selected bank and connection$/);
    const vault=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-vault-')));
    try{
      await fs.writeFile(path.join(vault,'selected.md'),'Synthetic alpha correction');
      await fs.writeFile(path.join(vault,'private.md'),'Synthetic alpha private');
      const notes=new ObsidianMemoryProvider(vault,'workspace','alpha',['selected.md']);
      const found=await notes.query({namespace:'workspace',projectId:'alpha',queryText:'correction'});
      expect(found).toHaveLength(1);expect(found[0].record.content).toBe('Synthetic alpha correction');
      expect(await notes.query({namespace:'workspace',projectId:'beta'})).toEqual([]);
      expect(await notes.query({namespace:'other',projectId:'alpha'})).toEqual([]);
      expect((await notes.query({namespace:'workspace',projectId:'alpha'}))).toHaveLength(1);
      await fs.writeFile(path.join(vault,'selected.md'),'Updated synthetic correction');
      expect((await notes.get('workspace',found[0].record.id))?.content).toBe('Updated synthetic correction');
      const combined=new CompositeMemoryProvider('workspace','alpha',[{alias:'notes',provider:notes},{alias:'recall',provider:hindsight}]);
      const merged=await combined.query({namespace:'workspace',projectId:'alpha',queryText:'correction',tags:['chat-context']});
      expect(merged.map(item=>item.record.content)).toEqual(['Updated synthetic correction','Selected remote fact']);
      expect(merged.map(item=>memorySourceIdentity(combined,item.record))).toEqual([
        {alias:'notes',providerId:'obsidian',recordId:found[0].record.id},
        {alias:'recall',providerId:'hindsight',recordId:'shared'}
      ]);
      expect(new Set(merged.map(item=>item.record.id)).size).toBe(2);
      remote.mockClear();
      expect(await combined.query({namespace:'workspace',projectId:'beta',queryText:'correction'})).toEqual([]);
      expect(await combined.query({namespace:'other',projectId:'alpha',queryText:'correction'})).toEqual([]);
      expect(remote).not.toHaveBeenCalled();
      remote.mockResolvedValueOnce(new Response('synthetic-secret-provider-error',{status:401}));
      await expect(combined.query({namespace:'workspace',projectId:'alpha',queryText:'correction'})).rejects.toThrow(/^Combined memory lookup failed or stopped; no complete result is available$/);
      await expect(notes.delete()).rejects.toThrow('read-only');
      expect(()=>new ObsidianMemoryProvider(vault,'workspace','alpha',['../private.md'])).toThrow('relative');
    }finally{await fs.rm(vault,{recursive:true,force:true});}
  });

  it("ranks title and content term matches ahead of weaker matches", async () => {
    const memory = new OperationalMemoryProvider();
    const weak = await memory.record({ namespace: "workspace", category: "general_fact", title: "Operating note", content: "Keep the process visible.", tags: [] });
    const strong = await memory.record({ namespace: "workspace", category: "general_fact", title: "Docker execution failure", content: "Docker execution failed because the daemon was unavailable.", tags: ["docker"] });
    const results = await memory.query({ namespace: "workspace", queryText: "docker execution", limit: 2 });
    expect(results[0]?.record.id).toBe(strong.id);
    expect(results.map(result => result.record.id)).not.toContain(weak.id);
  });
});

it('standalone memory owns stored inputs and returns detached records and history', async () => {
  const memory = new OperationalMemoryProvider();
  const tags=['original'];const metadata={nested:{value:'original'}};
  const saved=await memory.record({namespace:'synthetic',category:'general_fact',title:'Original',content:'Original content',tags,metadata});
  tags.push('outside');metadata.nested.value='outside';saved.title='outside';saved.tags.push('returned');
  expect(await memory.get('synthetic',saved.id)).toMatchObject({title:'Original',tags:['original'],metadata:{nested:{value:'original'}}});
  const read=(await memory.get('synthetic',saved.id))!;read.content='mutated read';
  const hits=await memory.query({namespace:'synthetic'});hits[0].record.tags.push('mutated query');
  const patchTags=['updated'];const updated=memory.update('synthetic',saved.id,1,'synthetic-owner',{title:'Updated',tags:patchTags});
  patchTags.push('mutated patch');updated.title='mutated result';updated.revisions![0].content='mutated history';
  expect(await memory.get('synthetic',saved.id)).toMatchObject({title:'Updated',content:'Original content',tags:['updated'],version:2,revisions:[{content:'Original content',tags:['original']}]});
  expect(()=>memory.update('synthetic',saved.id,1,'synthetic-owner',{title:'stale'})).toThrow('changed elsewhere');
});

it('rejects malformed adapter revisions and timestamps before accepting memory context', async () => {
 const memory=new OperationalMemoryProvider();
 const record=await memory.record({namespace:'synthetic',category:'general_fact',title:'Revision test',content:'Synthetic',tags:[]});
 const query=vi.spyOn(memory,'query');
 for(const patch of [{version:0},{version:-1},{version:1.5},{version:NaN},{version:Number.MAX_SAFE_INTEGER+1},{updatedAt:'not a date'}]){
  query.mockResolvedValueOnce([{record:{...record,...patch},score:1}]);
  await expect(queryMemoryBounded(memory,{namespace:'synthetic'})).rejects.toThrow('Invalid memory provider response');
 }
 query.mockResolvedValueOnce([{record:{...record,version:undefined,updatedAt:undefined},score:1}]);
 expect(await queryMemoryBounded(memory,{namespace:'synthetic'})).toHaveLength(1);
});
