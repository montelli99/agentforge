import {beforeEach,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const mocks=vi.hoisted(()=>({auth:vi.fn(),run:vi.fn()}));
vi.mock('./claudeCliCapabilities.js',()=>({inspectClaudeCliAuthentication:mocks.auth}));
vi.mock('./boundedCliProcess.js',async original=>({...await original<typeof import('./boundedCliProcess.js')>(),runBoundedChild:mocks.run}));
import {ClaudeCliPlanner} from './claudeCliPlanner.js';
import {BoundedChildFailure} from './boundedCliProcess.js';
const config={executablePath:path.join(os.tmpdir(),'synthetic-client'),configurationDirectory:path.join(os.tmpdir(),'synthetic-selected-profile'),model:'claude-synthetic'};
const request={model:config.model,messages:[{role:'user' as const,content:'Synthetic draft only'}],responseFormat:'json' as const};
const usage={input_tokens:2,output_tokens:3,cache_read_input_tokens:4,cache_creation_input_tokens:5};
const plan=JSON.stringify({commands:[{checkName:'fixture',command:'node --version',timeoutMs:1000}]});
const events=()=>[{type:'system',subtype:'init',tools:[],mcp_servers:[]},{type:'assistant',message:{content:[{type:'text',text:plan}]}},{type:'result',subtype:'success',is_error:false,result:plan,usage}];
const result=(items=events())=>({pid:1,code:0,stdout:items.map(x=>JSON.stringify(x)).join('\n'),stderr:''});
beforeEach(()=>{mocks.auth.mockReset().mockResolvedValue({connectionKind:'subscription'});mocks.run.mockReset().mockResolvedValue(result());});
it('delivers validated chat tool proposals while keeping official client tools disabled',async()=>{
 const text=JSON.stringify({content:'',toolCalls:[{name:'inspect_task',arguments:{taskId:'synthetic'}}]});
 const items=events();items[1].message!.content[0].text=text;items[2].result=text;mocks.run.mockResolvedValue(result(items));
 const chunks=[];for await(const chunk of new ClaudeCliPlanner(config).stream({model:config.model,messages:request.messages,tools:[{type:'function',function:{name:'inspect_task'}}]}))chunks.push(chunk);
 expect(chunks).toHaveLength(1);expect(chunks[0].finishReason).toBe('tool_calls');expect(chunks[0].toolCalls?.[0].function.name).toBe('inspect_task');
 const args=mocks.run.mock.calls[0][1];expect(args[args.indexOf('--tools')+1]).toBe('');expect(mocks.run).toHaveBeenCalledTimes(1);
});
it('uses a fresh directory, selected profile and restricted plan-only arguments, then cleans up',async()=>{
 const reply=await new ClaudeCliPlanner(config).generate(request);
 expect(reply.content).toBe(plan);expect(reply.usage?.totalTokens).toBe(14);
 expect(mocks.run).toHaveBeenCalledTimes(1);
 const [exe,args,options]=mocks.run.mock.calls[0];expect(exe).toBe(config.executablePath);
 expect(args).toEqual(expect.arrayContaining(['--restricted','--safe-mode','--no-session-persistence','--max-turns','1']));
 expect(args[args.indexOf('--tools')+1]).toBe('');expect(options.env.CLAUDE_CONFIG_DIR).toBe(config.configurationDirectory);
 expect(options.env.HOME).toBe(options.cwd);expect(fs.existsSync(options.cwd)).toBe(false);
 expect(Object.keys(options.env).sort()).toEqual(expect.arrayContaining(['HOME','USERPROFILE','CLAUDE_CONFIG_DIR']));
 expect(Object.keys(options.env).some(k=>/API_KEY|TOKEN/.test(k))).toBe(false);
});
it.each(['api','signed_out','unknown'])('rejects %s authentication without launching inference',async connectionKind=>{
 mocks.auth.mockResolvedValue({connectionKind});await expect(new ClaudeCliPlanner(config).generate(request)).rejects.toThrow(/no API fallback/);expect(mocks.run).not.toHaveBeenCalled();
});
it('cancels before authentication or inference',async()=>{
 const controller=new AbortController();controller.abort();await expect(new ClaudeCliPlanner(config).generate({...request,signal:controller.signal})).rejects.toThrow(/cancelled/);expect(mocks.auth).not.toHaveBeenCalled();expect(mocks.run).not.toHaveBeenCalled();
});
it('rejects unexpected tool activity, preserves known usage and never retries',async()=>{
 const items=events();items.splice(1,0,{type:'tool_use'} as any);mocks.run.mockResolvedValue(result(items));
 await expect(new ClaudeCliPlanner(config).generate(request)).rejects.toMatchObject({usage:{totalTokens:14}});
 expect(mocks.run).toHaveBeenCalledTimes(1);expect(fs.existsSync(mocks.run.mock.calls[0][2].cwd)).toBe(false);
});
it('preserves reported usage on bounded child failure without retry',async()=>{
 mocks.run.mockRejectedValue(new BoundedChildFailure('synthetic timeout','timeout',result()));
 await expect(new ClaudeCliPlanner(config).generate(request)).rejects.toMatchObject({usage:{totalTokens:14}});expect(mocks.run).toHaveBeenCalledTimes(1);expect(fs.existsSync(mocks.run.mock.calls[0][2].cwd)).toBe(false);
});
