import { describe, expect, it } from "vitest";
import { OperationalMemoryProvider } from "./providers/memory/operationalMemory.js";
import { evaluateMemoryProvider } from "./memoryEvaluation.js";
import { DurableEvaluationJournal } from './durableEvaluationJournal.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe("memory evaluation", () => {
  it("measures relevance, isolation, and packet compression", async () => {
    const provider = new OperationalMemoryProvider();
    const relevant = await provider.record({ namespace: "workspace", projectId: "alpha", category: "project_constraint", title: "Docker approval rule", content: "Docker execution requires explicit approval.", tags: ["docker"] });
    const unrelatedProject = await provider.record({ namespace: "workspace", projectId: "beta", category: "general_fact", title: "Docker note", content: "A separate project uses Docker.", tags: ["docker"] });
    const report = await evaluateMemoryProvider(provider, [{
      name: "alpha docker query",
      namespace: "workspace",
      projectId: "alpha",
      queryText: "docker approval",
      expectedIds: [relevant.id],
      forbiddenIds: [unrelatedProject.id],
    }]);
    expect(report.passed).toBe(true);
    expect(report.relevantAtTop).toBe(1);
    expect(report.isolationPassed).toBe(1);
    expect(report.averageSavingsPercent).toBeGreaterThanOrEqual(0);
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'agentforge-evaluation-'));
    try {
      const output=path.join(directory,'report.json');
      const journal=await DurableEvaluationJournal.create(output);
      try {
        await journal.checkpoint({type:'attempt',status:'started'},{complete:false,attempts:[{status:'started'}]});
        expect(JSON.parse(await fs.readFile(output,'utf8')).complete).toBe(false);
        await journal.checkpoint({type:'attempt',status:'failed'},{complete:true,attempts:[{status:'failed'}]});
      } finally { await journal.close(); }
      expect((await fs.readFile(output+'.events.jsonl','utf8')).trim().split('\n').map(line=>JSON.parse(line).status)).toEqual(['started','failed']);
      await expect(DurableEvaluationJournal.create(output)).rejects.toThrow();
      expect(JSON.parse(await fs.readFile(output,'utf8')).attempts[0].status).toBe('failed');
    } finally { await fs.rm(directory,{recursive:true,force:true}); }
  });
});
