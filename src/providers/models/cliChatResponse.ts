import crypto from 'node:crypto';
import type {ModelRequestOptions,ModelResponse} from '../../core/providers/model.js';

/** The official client proposes tool calls; AgentForge remains the executor. */
export function parseCliChatResponse(content:string,options:ModelRequestOptions):Pick<ModelResponse,'content'|'toolCalls'|'finishReason'>{
 const value=JSON.parse(content);
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['content','toolCalls'].includes(k))||typeof value.content!=='string'||value.content.length>100000||!Array.isArray(value.toolCalls)||value.toolCalls.length>8)throw Error('Invalid CLI chat response');
 const names=new Set((options.tools??[]).map(tool=>(tool as {function?:{name?:string}})?.function?.name).filter(Boolean));
 const toolCalls=value.toolCalls.map((call:unknown)=>{
  if(!call||typeof call!=='object'||Array.isArray(call))throw Error('Invalid CLI tool proposal');
  const item=call as Record<string,unknown>;
  if(Object.keys(item).some(k=>!['name','arguments'].includes(k))||typeof item.name!=='string'||!names.has(item.name)||!item.arguments||typeof item.arguments!=='object'||Array.isArray(item.arguments))throw Error('Unknown or invalid CLI tool proposal');
  const args=JSON.stringify(item.arguments);if(args.length>20000)throw Error('CLI tool arguments too large');
  return {id:crypto.randomUUID(),type:'function' as const,function:{name:item.name,arguments:args}};
 });
 if(!toolCalls.length&&!value.content.trim())throw Error('Empty CLI chat response');
 return {content:value.content,...(toolCalls.length?{toolCalls}:{}),finishReason:toolCalls.length?'tool_calls':'stop'};
}
