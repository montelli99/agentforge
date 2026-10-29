import {it,expect} from 'vitest';
import {validateCliPlan} from './subscriptionCliModel.js';
it('accepts separate work and required checks without merging approval commands',()=>{
 const commands=[{checkName:'write_report',command:'node reconcile.mjs',timeoutMs:60000},{checkName:'unit_tests',command:'node --version',timeoutMs:10000},{checkName:'verify_report',command:'node verify.mjs',timeoutMs:60000}];
 expect(validateCliPlan(JSON.stringify({commands})).commands).toEqual(commands);
});
it('retains finite plan and command bounds',()=>{
 const command={checkName:'check',command:'node --version',timeoutMs:10000};
 expect(()=>validateCliPlan(JSON.stringify({commands:Array(101).fill(command)}))).toThrow();
 for(const change of [{timeoutMs:3600001},{command:'x'.repeat(20001)},{checkName:'x'.repeat(201)},{timeoutMs:0}])expect(()=>validateCliPlan(JSON.stringify({commands:[{...command,...change}]}))).toThrow();
});
