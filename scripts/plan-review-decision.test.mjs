import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {readPlanReview} from './plan-review-decision.mjs';
test('only an exact approval proceeds; rejection overrides approval and retains reason',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'af-review-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 assert.equal((await readPlanReview(dir,'exact')).status,'pending');
 await fs.writeFile(path.join(dir,'reviewed-digest.txt'),'other');assert.equal((await readPlanReview(dir,'exact')).status,'pending');
 await fs.writeFile(path.join(dir,'reviewed-digest.txt'),'exact');assert.equal((await readPlanReview(dir,'exact')).status,'approved');
 await fs.writeFile(path.join(dir,'rejected-plan.json'),JSON.stringify({digest:'exact',reason:'Input write outside scope'}));assert.deepEqual(await readPlanReview(dir,'exact'),{status:'rejected',reason:'Input write outside scope'});
 await fs.writeFile(path.join(dir,'rejected-plan.json'),JSON.stringify({digest:'other',reason:'stale'}));await assert.rejects(readPlanReview(dir,'exact'),/Invalid plan rejection/);
});
