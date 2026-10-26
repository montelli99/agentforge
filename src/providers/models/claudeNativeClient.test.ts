import {it,expect,vi} from 'vitest';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const mocks=vi.hoisted(()=>({run:vi.fn(),auth:vi.fn(),capabilities:vi.fn()}));
vi.mock('./boundedCliProcess.js',()=>({runBoundedChild:mocks.run}));
vi.mock('./claudeCliCapabilities.js',()=>({inspectClaudeCliAuthentication:mocks.auth,inspectClaudeCliCapabilities:mocks.capabilities}));
import {ClaudeNativeClient} from './claudeNativeClient.js';
it('uses only the host broker, hides its token from the prompt, and rechecks authentication',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-claude-worker-')));
 try{
  await fs.writeFile(path.join(root,'claude.exe'),'synthetic client');
  mocks.auth.mockResolvedValue({connectionKind:'subscription'});mocks.capabilities.mockResolvedValue({version:'2.1.310',controlsAvailable:true});mocks.run.mockReset();
  const client=new ClaudeNativeClient({executablePath:path.join(root,'claude.exe'),configurationDirectory:root,model:'claude-synthetic'});
  await client.initialize();
  const token='c'.repeat(64);let temporary='';
  mocks.run.mockImplementation(async(_exe,args,options)=>{
   temporary=options.cwd;expect(args.join(' ')).not.toContain(token);expect(options.input).not.toContain(token);
   expect(args[args.indexOf('--tools')+1]).toBe('');expect(args).toContain('--restricted');expect(args).toContain('--strict-mcp-config');
   expect(options.env.ANTHROPIC_API_KEY).toBeUndefined();expect(options.env.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
   const config=JSON.parse(await fs.readFile(args[args.indexOf('--mcp-config')+1],'utf8'));
   expect(Object.keys(config.mcpServers)).toEqual(['agentforge-broker']);
   expect(config.mcpServers['agentforge-broker'].headers.Authorization).toBe('Bearer '+token);
   return {code:0,stdout:'',stderr:''};
  });
  const input={connection:{endpoint:'http://127.0.0.1:12345/mcp',token},request:{callId:'execute-approved-task',tool:'execute_approved_task',input:{contractDigest:'d'.repeat(64)}},signal:new AbortController().signal};
  await client.run(input);await expect(fs.stat(temporary)).rejects.toThrow();
  mocks.auth.mockResolvedValue({connectionKind:'api'});
  await expect(client.run(input)).rejects.toThrow('no API fallback');expect(mocks.run).toHaveBeenCalledTimes(1);expect(client.getReadiness().ready).toBe(false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
it('refuses a replaced executable before invoking authentication or launching work',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-claude-worker-')));
 try{
  const executablePath=path.join(root,'claude.exe');await fs.writeFile(executablePath,'original synthetic client');
  mocks.auth.mockReset().mockResolvedValue({connectionKind:'subscription'});mocks.capabilities.mockReset().mockResolvedValue({version:'2.1.310',controlsAvailable:true});mocks.run.mockReset();
  const client=new ClaudeNativeClient({executablePath,configurationDirectory:root,model:'claude-synthetic'});await client.initialize();
  await fs.writeFile(executablePath,'replacement synthetic client');
  await expect(client.run({connection:{endpoint:'http://127.0.0.1:12345/mcp',token:'c'.repeat(64)},request:{callId:'call',tool:'tool',input:{contractDigest:'d'.repeat(64)}},signal:new AbortController().signal})).rejects.toThrow('Native executable changed');
  expect(mocks.auth).toHaveBeenCalledTimes(1);expect(mocks.capabilities).toHaveBeenCalledTimes(1);expect(mocks.run).not.toHaveBeenCalled();expect(client.getReadiness().ready).toBe(false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
