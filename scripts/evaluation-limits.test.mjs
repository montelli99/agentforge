import test from 'node:test';import assert from 'node:assert/strict';import {evaluationLimits} from './evaluation-limits.mjs';
test('shared evaluation budget pins generation settings and refuses excess chat',async()=>{
 const budget=await evaluationLimits();for(let n=0;n<6;n++){const body=budget.request({stream:true,max_tokens:9999,model:'other'});assert.equal(body.max_tokens,2000);assert.equal(body.model,'mimo-v2.6-flash');assert.deepEqual(body.thinking,{type:'disabled'});}assert.throws(()=>budget.request({stream:true}),/budget exceeded/);
});
test('shared evaluation total request cap also applies to nonstream requests',async()=>{const budget=await evaluationLimits();for(let n=0;n<7;n++)budget.request({});assert.throws(()=>budget.request({}),/budget exceeded/);});
test('plan timeout is checked before review without rewriting model output',async()=>{
 const budget=await evaluationLimits();const commands=[{checkName:'write',command:'node --version',timeoutMs:10000}];const before=JSON.stringify(commands);budget.validatePlan(commands);assert.equal(JSON.stringify(commands),before);
 for(const timeoutMs of [undefined,0,10001,1.5])assert.throws(()=>budget.validatePlan([{...commands[0],timeoutMs}]),/timeout/);
 assert.throws(()=>budget.validatePlan([]),/plan/);
});
