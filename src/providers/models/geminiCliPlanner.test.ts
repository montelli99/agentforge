import {it,expect,vi} from 'vitest';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const mocks=vi.hoisted(()=>({run:vi.fn(),caps:vi.fn()}));
vi.mock('./boundedCliProcess.js',async()=>({...await vi.importActual('./boundedCliProcess.js'),runBoundedChild:mocks.run}));
import {BoundedChildFailure} from './boundedCliProcess.js';
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
it('rejects a redirected profile before reading settings or launching Gemini',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gemini-linked-profile-'));
 const home=path.join(root,'home'),other=path.join(root,'other');
 try{
  await prepareGeminiCliProfile(other);
  await fs.writeFile(path.join(other,'.gemini','oauth_creds.json'),'synthetic-placeholder');
  await fs.mkdir(home);
  await fs.symlink(path.join(other,'.gemini'),path.join(home,'.gemini'),process.platform==='win32'?'junction':'dir');
  const planner=new GeminiCliPlanner({bundlePath:path.join(root,'bundle.js'),homeDirectory:home,model:'gemini-synthetic'});
  mocks.run.mockClear();mocks.caps.mockClear();
  expect(await planner.isAvailable()).toBe(false);
  await expect(planner.generate({model:'gemini-synthetic',messages:[{role:'user',content:'Draft a check'}],responseFormat:'json'})).rejects.toThrow('Linked Gemini profile');
  expect(mocks.run).not.toHaveBeenCalled();expect(mocks.caps).not.toHaveBeenCalled();
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
it('rejects a profile whose required local restrictions have been removed',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gemini-profile-controls-'));
 const home=path.join(root,'home');
 try{
  await prepareGeminiCliProfile(home);
  await fs.writeFile(path.join(home,'.gemini','oauth_creds.json'),'synthetic-placeholder');
  const file=path.join(home,'.gemini','settings.json');
  const original=JSON.parse(await fs.readFile(file,'utf8'));
  const planner=new GeminiCliPlanner({bundlePath:path.join(root,'bundle.js'),homeDirectory:home,model:'gemini-synthetic'});
  for(const control of ['extensions','mcp','skills']){
   const changed=structuredClone(original);changed.admin[control].enabled=true;
   await fs.writeFile(file,JSON.stringify(changed));
   mocks.run.mockClear();mocks.caps.mockClear();
   await expect(planner.generate({model:'gemini-synthetic',messages:[{role:'user',content:'Draft a check'}],responseFormat:'json'})).rejects.toThrow('must disable');
   expect(mocks.run).not.toHaveBeenCalled();expect(mocks.caps).not.toHaveBeenCalled();
  }
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
it('preserves reported usage on cancellation without returning or retrying the interrupted plan',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gemini-cancel-usage-'));
 const home=path.join(root,'home');
 try{
  await prepareGeminiCliProfile(home);
  await fs.writeFile(path.join(home,'.gemini','oauth_creds.json'),'synthetic-placeholder');
  mocks.caps.mockResolvedValue({controlsAvailable:true});mocks.run.mockReset();
  const usageEvent=JSON.stringify({type:'result',status:'error',stats:{input_tokens:12,output_tokens:3,total_tokens:19,cached:2,tool_calls:0}});
  mocks.run.mockRejectedValue(new BoundedChildFailure('cancelled','cancelled',{pid:1,code:null,stdout:usageEvent,stderr:'synthetic diagnostic'}));
  const planner=new GeminiCliPlanner({bundlePath:path.join(root,'bundle.js'),homeDirectory:home,model:'gemini-synthetic'});
  await expect(planner.generate({model:'gemini-synthetic',messages:[{role:'user',content:'Draft a check'}],responseFormat:'json'})).rejects.toMatchObject({usage:{promptTokens:12,completionTokens:3,totalTokens:19,cachedInputTokens:2}});
  expect(mocks.run).toHaveBeenCalledTimes(1);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
