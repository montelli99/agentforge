import {expect,it} from 'vitest';
import {parseCliChatResponse} from './cliChatResponse.js';
const request={model:'synthetic',messages:[],tools:[{type:'function',function:{name:'inspect_task'}}]};
it('returns text or identified proposals without executing anything',()=>{
 expect(parseCliChatResponse('{"content":"Hello","toolCalls":[]}',request)).toEqual({content:'Hello',finishReason:'stop'});
 const result=parseCliChatResponse('{"content":"","toolCalls":[{"name":"inspect_task","arguments":{"taskId":"synthetic"}}]}',request);
 expect(result.finishReason).toBe('tool_calls');expect(result.toolCalls?.[0].function.arguments).toBe('{"taskId":"synthetic"}');expect(result.toolCalls?.[0].id).toBeTruthy();
});
it.each([
 {content:'',toolCalls:[]},
 {content:'x',toolCalls:[{name:'execute_shell',arguments:{}}]},
 {content:'x',toolCalls:[{name:'inspect_task',arguments:'{}'}]},
 {content:'x',toolCalls:[],approval:true},
 {content:'x',toolCalls:Array.from({length:9},()=>({name:'inspect_task',arguments:{}}))}
])('rejects malformed or unoffered tool proposals',value=>expect(()=>parseCliChatResponse(JSON.stringify(value),request)).toThrow());
