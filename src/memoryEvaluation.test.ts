import { describe, expect, it } from "vitest";
import { OperationalMemoryProvider } from "./providers/memory/operationalMemory.js";
import { evaluateMemoryProvider } from "./memoryEvaluation.js";
import { DurableEvaluationJournal } from './durableEvaluationJournal.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

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
      const interruptedOutput=path.join(directory,'interrupted.json');
      const source=new URL('./durableEvaluationJournal.ts',import.meta.url).href;
      const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',
        `const {DurableEvaluationJournal}=await import(${JSON.stringify(source)});
         const journal=await DurableEvaluationJournal.create(process.argv[1]);
         await journal.checkpoint({type:'attempt',status:'started'},{complete:false,attempts:[{status:'started'}]});
         process.stdout.write('checkpoint-ready');setInterval(()=>{},1000);`,interruptedOutput],
        {stdio:['ignore','pipe','pipe'],windowsHide:true});
      const exited=new Promise<void>(resolve=>child.once('close',()=>resolve()));
      try {
        await new Promise<void>((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('Evaluation child did not checkpoint')),20000);
          let text='';
          child.stdout.on('data',chunk=>{text+=String(chunk);if(text.includes('checkpoint-ready')){clearTimeout(timer);resolve();}});
          child.once('error',error=>{clearTimeout(timer);reject(error);});
          child.once('exit',()=>{clearTimeout(timer);reject(Error('Evaluation child exited before interruption'));});
        });
      } finally { child.kill('SIGKILL');await exited; }
      const recovered=JSON.parse(await fs.readFile(interruptedOutput,'utf8'));
      expect(recovered.complete).toBe(false);
      expect(recovered.attempts).toEqual([{status:'started'}]);
      expect((await fs.readFile(interruptedOutput+'.events.jsonl','utf8')).trim().split('\n').map(line=>JSON.parse(line).status)).toEqual(['started']);
      await expect(DurableEvaluationJournal.create(interruptedOutput)).rejects.toThrow();
    } finally { await fs.rm(directory,{recursive:true,force:true}); }
  });
});
