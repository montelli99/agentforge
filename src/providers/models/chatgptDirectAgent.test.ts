import {describe,it,expect,vi} from 'vitest';
import {ChatGPTDirectModel,type DirectGrant,type AuthorizedResponsesTransport} from './chatgptDirectModel.js';
const tool={type:'function',function:{name:'inspect_task',description:'Inspect the scoped task',parameters:{type:'object',properties:{taskId:{type:'string'}},required:['taskId'],additionalProperties:false}}};
const call={type:'function_call',call_id:'call_1',name:'inspect_task',namespace:'agentforge',arguments:'{"taskId":"synthetic-task"}'};
const completed=(output:unknown[])=>({type:'response.completed',response:{id:'response_1',status:'completed',output}});
function fixture(events:unknown[]){
 const grant:DirectGrant={accountId:'account',grantId:'grant',resource:'https://api.openai.com/v1',scopes:['resource.invoke','chatgpt.tokens.use.direct'],expiresAt:Date.now()+60000};
 const open=vi.fn(async function*(_input:Parameters<AuthorizedResponsesTransport['open']>[0]){yield*events;});
 const model=new ChatGPTDirectModel({enabled:true,model:'model',agentTools:true},{currentGrant:()=>grant},()=>({accountId:grant.accountId,grantId:grant.grantId,expiresAt:grant.expiresAt,response:{models:[{slug:'model',display_name:'Synthetic',visibility:'list'}]}}),{open});
 return {model,open};
}
const request={model:'model',messages:[{role:'user' as const,content:'Inspect the task'}],tools:[tool]};
describe('direct subscription conversation tools',()=>{
 it('maps tools into a namespace and preserves calls and results across turns',async()=>{
  const {model,open}=fixture([completed([call])]);const chunks:import('../../core/providers/model.js').StreamChunk[]=[];
  for await(const chunk of model.stream(request))chunks.push(chunk);
  expect(chunks).toHaveLength(1);expect(chunks[0].toolCalls?.[0]).toEqual({id:'call_1',type:'function',function:{name:'inspect_task',arguments:call.arguments}});
  expect(open.mock.calls[0][0].body.tools?.[0]).toMatchObject({type:'namespace',name:'agentforge',tools:[{type:'function',name:'inspect_task'}]});
  const body=JSON.parse(model.auditGenerateBody({...request,messages:[...request.messages,{role:'assistant',content:'',toolCalls:[{id:'call_1',type:'function',function:{name:'inspect_task',arguments:call.arguments}}]},{role:'tool',content:'{"status":"ready"}',toolCallId:'call_1'}]}));
  expect(body.input.slice(-2)).toEqual([call,{type:'function_call_output',call_id:'call_1',output:'{"status":"ready"}'}]);
  expect(body).toMatchObject({store:false,stream:true});expect(body).not.toHaveProperty('max_output_tokens');
 });
 it('does not release tool actions from an interrupted or failed response',async()=>{
  for(const tail of [[],[{type:'response.failed',response:{error:{code:'synthetic_failure'}}}]]){
   const {model}=fixture([{type:'response.output_item.added',item:call},...tail]);const chunks:import('../../core/providers/model.js').StreamChunk[]=[];
   await expect((async()=>{for await(const chunk of model.stream(request))chunks.push(chunk);})()).rejects.toThrow();expect(chunks).toEqual([]);
  }
 });
 it('rejects unrequested tools, wrong namespaces, duplicate calls and invalid arguments',async()=>{
  for(const output of [[{...call,name:'shell'}],[{...call,namespace:'other'}],[call,call],[{...call,arguments:'[]'}],[{...call,arguments:'broken'}]]){
   await expect(fixture([completed(output)]).model.generate(request)).rejects.toThrow();
  }
 });
 it('rejects unmatched history before sending a request',async()=>{
  const {model,open}=fixture([]);
  await expect(model.generate({...request,messages:[{role:'tool',content:'result',toolCallId:'unknown'}]})).rejects.toThrow('Unmatched');
  expect(open).not.toHaveBeenCalled();
 });
});
