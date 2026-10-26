import {it,expect,vi} from 'vitest';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const mocks=vi.hoisted(()=>({run:vi.fn(),capabilities:vi.fn(async()=>({version:'0.65.0',controlsAvailable:true}))}));
vi.mock('./boundedCliProcess.js',()=>({runBoundedChild:mocks.run}));
vi.mock('./geminiCliCapabilities.js',()=>({inspectGeminiCliCapabilities:mocks.capabilities}));
import {GeminiNativeClient} from './geminiNativeClient.js';
it('uses isolated connection settings without giving the broker secret to the prompt',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-native-profile-')));try{
 await fs.mkdir(path.join(root,'.gemini'));await fs.writeFile(path.join(root,'.gemini','settings.json'),JSON.stringify({security:{auth:{selectedType:'oauth-personal',enforcedType:'oauth-personal',useExternal:false}},hooksConfig:{enabled:false},admin:{extensions:{enabled:false},skills:{enabled:false}}}));
 const client=new GeminiNativeClient({bundlePath:path.join(root,'gemini.js'),homeDirectory:root,model:'gemini-2.5-flash'});
 await expect(client.initialize()).rejects.toThrow();expect(client.getReadiness().ready).toBe(false);
 await fs.writeFile(path.join(root,'.gemini','oauth_creds.json'),'synthetic-not-a-credential');
 await client.initialize();const token='a'.repeat(64);let temporary='';
 mocks.run.mockImplementation(async(_exe,args,options)=>{temporary=options.cwd;expect(args.join(' ')).not.toContain(token);expect(options.env.GEMINI_API_KEY).toBeUndefined();expect(options.env.GOOGLE_GEMINI_BASE_URL).toBeUndefined();const settings=JSON.parse(await fs.readFile(options.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH,'utf8'));expect(settings.security.auth.enforcedType).toBe('oauth-personal');expect(settings.mcpServers['agentforge-broker'].headers.Authorization).toBe('Bearer '+token);return {code:0,stdout:'',stderr:''};});
 await client.run({connection:{endpoint:'http://127.0.0.1:12345/mcp',token},request:{callId:'execute-approved-task',tool:'execute_approved_task',input:{contractDigest:'b'.repeat(64)}},signal:new AbortController().signal});
 await expect(fs.stat(temporary)).rejects.toThrow();
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
it.each(['home','ancestor'] as const)('rejects a linked %s before inspecting credentials',async kind=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-native-link-')));
 try{
  const physical=path.join(root,'physical');await fs.mkdir(path.join(physical,'home'),{recursive:true});
  const link=path.join(root,'linked');
  await fs.symlink(kind==='home'?path.join(physical,'home'):physical,link,process.platform==='win32'?'junction':'dir');
  const client=new GeminiNativeClient({bundlePath:path.join(root,'gemini.js'),homeDirectory:kind==='home'?link:path.join(link,'home'),model:'gemini-synthetic'});
  await expect(client.initialize()).rejects.toThrow('Linked native profile rejected');
  expect(client.getReadiness().ready).toBe(false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
