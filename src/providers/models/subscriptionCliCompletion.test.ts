import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {SubscriptionCliModelProvider} from './subscriptionCliModel.js';
import type {runBoundedChild} from './boundedCliProcess.js';

const directories:string[]=[];
afterEach(()=>{for(const directory of directories.splice(0))fs.rmSync(directory,{recursive:true,force:true});});
const plan=JSON.stringify({commands:[{checkName:'synthetic',command:'echo synthetic',timeoutMs:1000}]});
const message={type:'item.completed',item:{type:'agent_message',text:plan}};
const done={type:'turn.completed',usage:{input_tokens:2,output_tokens:3}};
function fixture(events:unknown[]) {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'af-cli-completion-'));directories.push(directory);
 const run=vi.fn<typeof runBoundedChild>().mockImplementation(async(_executable,args)=>({code:0,stdout:args[0]==='login'?'Logged in using ChatGPT':events.map(event=>JSON.stringify(event)).join('\n'),stderr:'',pid:123}));
 const provider=new SubscriptionCliModelProvider({executablePath:path.join(directory,'synthetic-client'),cliHomeDirectory:directory,workDirectory:path.join(directory,'work'),model:'gpt-fixture'},run);
 return {run,provider};
}
it.each([
 ['missing completion',[message]],
 ['duplicate completion',[message,done,done]],
 ['failure before completion',[message,{type:'turn.failed'},done]],
 ['error before completion',[message,{type:'error',message:'synthetic error'},done]],
 ['activity after completion',[message,done,message]],
 ['unknown activity',[{type:'unexpected'},message,done]],
] as const)('rejects %s without retry',async(_name,events)=>{
 const {run,provider}=fixture([...events]);
 await expect(provider.generate({model:'gpt-fixture',messages:[{role:'user',content:'Synthetic draft'}],responseFormat:'json'})).rejects.toThrow(/successful bounded turn/);
 expect(run).toHaveBeenCalledTimes(2); // One login check and one inference, no retry.
});
it('accepts a terminal successful turn and preserves usage',async()=>{
 const {run,provider}=fixture([{type:'thread.started'},{type:'turn.started'},message,done]);
 const result=await provider.generate({model:'gpt-fixture',messages:[{role:'user',content:'Synthetic draft'}],responseFormat:'json'});
 expect(run.mock.calls[1][2].input).toContain("1 to 100 commands each timeoutMs <=3600000");
 expect(result.content).toBe(plan);expect(result.usage?.totalTokens).toBe(5);expect(run).toHaveBeenCalledTimes(2);
});
