import {expect,it} from 'vitest';
import {encodeGeminiChatPrompt} from './geminiCliPrompt.js';
it('preserves tool history and supplied data while escaping CLI file expansion',()=>{
 const messages=[{role:'assistant' as const,content:'',toolCalls:[{id:'call',type:'function' as const,function:{name:'read_task_artifact',arguments:'{}'}}]},{role:'tool' as const,toolCallId:'call',content:'Contact fixture@example.invalid; literal \\u0040 retained'}];
 const prompt=encodeGeminiChatPrompt({model:'gemini-synthetic',messages});
 expect(prompt).not.toContain('@');
 expect(JSON.parse(prompt.slice(prompt.indexOf('\n')+1))).toEqual({messages,tools:[]});
});
it('rejects oversized chat before profile access or invocation',()=>{
 expect(()=>encodeGeminiChatPrompt({model:'gemini-synthetic',messages:[{role:'user',content:'x'.repeat(32768)}]})).toThrow('32KiB');
});
