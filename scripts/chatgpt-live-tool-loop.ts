import fs from 'node:fs/promises';
import path from 'node:path';
import {ChatGPTSetup} from '../src/server/chatgptSetup.js';
import type {ModelMessage,ModelResponseUsage} from '../src/core/providers/model.js';

// Explicit dedicated profile only; never discover the user's application profile.
// Usage: node --import tsx scripts/chatgpt-live-tool-loop.ts ROOT ACTOR MODEL OUTPUT
const [root,actor,model,output,...extra]=process.argv.slice(2);
if(!root||!actor||!model||!output||extra.length||!path.isAbsolute(root)||!path.isAbsolute(output)){
 throw Error('Supply absolute dedicated subscription root, actor, model and new evidence output path');
}
// Reserve output before spending plan usage. Existing evidence is never overwritten.
const setup=new ChatGPTSetup(await fs.realpath(root));
const destination=await fs.open(output,'wx',0o600);
const evidence:{recordedAt:string;model:string;passed:boolean;requests:number;effects:number;usage:Array<ModelResponseUsage|null>;stage:string;result?:{totalCents:number}}={
 recordedAt:new Date().toISOString(),model,passed:false,requests:0,effects:0,usage:[],stage:'restore',
};
try{
 const status=await setup.status(actor);
 if(status.accounts.length!==1)throw Error('Use a dedicated profile with exactly one signed-in account');
 const restored=await setup.restore(actor,status.accounts[0].id);
 const connection=await setup.activate(actor,restored.id,model);
 const messages:ModelMessage[]=[{role:'user',content:'Call calculate_invoice exactly once with quantity 3, unitCents 1200, discountCents 600. After receiving its result return only JSON with totalCents. Do not calculate instead of calling the tool.'}];
 const tools=[{type:'function',function:{name:'calculate_invoice',description:'Compute a synthetic invoice total in cents.',parameters:{type:'object',additionalProperties:false,required:['quantity','unitCents','discountCents'],properties:{quantity:{type:'integer'},unitCents:{type:'integer'},discountCents:{type:'integer'}}}}}];
 const signal=AbortSignal.timeout(120000);
 evidence.stage='request-tool';evidence.requests++;
 const first=await connection.provider.generate({model,messages,tools,signal});
 evidence.usage.push(first.usage??null);
 const call=first.toolCalls?.[0];
 if(first.toolCalls?.length!==1||!call||call.function.name!=='calculate_invoice')throw Error('Expected one calculator request');
 evidence.stage='validate-tool';
 const args=JSON.parse(call.function.arguments);
 if(!args||Array.isArray(args)||Object.keys(args).sort().join(',')!=='discountCents,quantity,unitCents'||args.quantity!==3||args.unitCents!==1200||args.discountCents!==600)throw Error('Unexpected calculator inputs');
 const result={totalCents:args.quantity*args.unitCents-args.discountCents};
 evidence.effects++;
 messages.push({role:'assistant',content:first.content,toolCalls:first.toolCalls},{role:'tool',toolCallId:call.id,content:JSON.stringify(result)});
 evidence.stage='request-final';evidence.requests++;
 const final=await connection.provider.generate({model,messages,tools,signal});
 evidence.usage.push(final.usage??null);
 evidence.stage='verify-final';
 const actual=JSON.parse(final.content);
 if(final.toolCalls?.length||!actual||Array.isArray(actual)||Object.keys(actual).join(',')!=='totalCents'||actual.totalCents!==3000)throw Error('Incorrect final result');
 evidence.result=result;evidence.passed=true;evidence.stage='complete';
}catch{
 // Keep the failing stage, never raw provider errors, account IDs or token data.
 process.exitCode=1;
}finally{
 try{await setup.shutdown();}
 finally{try{await destination.writeFile(JSON.stringify(evidence,null,2)+'\n');}finally{await destination.close();}}
 console.log(JSON.stringify({passed:evidence.passed,stage:evidence.stage,requests:evidence.requests,effects:evidence.effects}));
}
