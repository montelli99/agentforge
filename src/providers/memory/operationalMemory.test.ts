import { describe, expect, it,vi } from "vitest";
import {HindsightMemoryProvider} from './hindsightMemory.js';
import { OperationalMemoryProvider } from "./operationalMemory.js";
import {ObsidianMemoryProvider} from './obsidianMemory.js';
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
