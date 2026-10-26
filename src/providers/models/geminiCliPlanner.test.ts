import {it,expect,vi} from 'vitest';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const mocks=vi.hoisted(()=>({run:vi.fn(),caps:vi.fn()}));
vi.mock('./boundedCliProcess.js',()=>({runBoundedChild:mocks.run}));
vi.mock('./geminiCliCapabilities.js',()=>({inspectGeminiCliCapabilities:mocks.caps}));
import {GeminiCliPlanner} from './geminiCliPlanner.js';
import {prepareGeminiCliProfile} from './geminiCliProfile.js';
it('uses only the selected profile, bounded draft protocol and no inherited API fallback',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gemini-planner-test-'));const home=path.join(root,'home');
 try{
  await prepareGeminiCliProfile(home);await fs.writeFile(path.join(home,'.gemini','oauth_creds.json'),'synthetic-placeholder-not-an-account');
  const planner=new GeminiCliPlanner({bundlePath:path.join(root,'bundle.js'),homeDirectory:home,model:'gemini-synthetic'});
  mocks.caps.mockResolvedValue({controlsAvailable:true});
  const plan=JSON.stringify({commands:[{checkName:'version',command:'node --version',timeoutMs:1000}]});
  mocks.run.mockImplementation(async(_exe,args,options)=>{
   expect(options.env.GEMINI_CLI_HOME).toBe(home);expect(Object.keys(options.env).some(key=>/API_KEY|TOKEN|GOOGLE_APPLICATION/.test(key))).toBe(false);
   expect(args).toContain('--admin-policy');expect(await fs.readFile(args[args.indexOf('--admin-policy')+1],'utf8')).toContain('decision = "deny"');
   const events=[{type:'init',model:'gemini-synthetic',session_id:'synthetic'},{type:'message',role:'user',content:args[args.indexOf('--prompt')+1]},{type:'message',role:'assistant',delta:true,content:plan},{type:'result',status:'success',stats:{input_tokens:10,output_tokens:5,total_tokens:15,cached:0,tool_calls:0}}];
   return {code:0,stdout:events.map(event=>JSON.stringify(event)).join('\n'),stderr:''};
  });
  const request={model:'gemini-synthetic',messages:[{role:'user' as const,content:'Draft a version check'}],responseFormat:'json' as const};
  expect((await planner.generate(request)).content).toBe(plan);
  const controller=new AbortController();controller.abort();await expect(planner.generate({...request,signal:controller.signal})).rejects.toThrow('cancelled');
  expect(mocks.run).toHaveBeenCalledTimes(1);
  mocks.run.mockResolvedValue({code:0,stdout:'{"type":"tool_use"}',stderr:''});await expect(planner.generate(request)).rejects.toThrow('no automatic retry');
  expect(mocks.run).toHaveBeenCalledTimes(2);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
