import {expect,it,vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const {inspect}=vi.hoisted(()=>({inspect:vi.fn()}));
vi.mock('../providers/models/claudeCliCapabilities.js',()=>({inspectClaudeCliAuthentication:inspect}));
import {WorkspaceStore} from '../core/store/workspaceStore.js';
import {AgentForgeWebServer} from './webServer.js';

it.each([false,true])('reports configured chat separately from account verification (chat=%s)',async(chatConfigured)=>{
 inspect.mockReset();
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'af-claude-status-'));
 const store=new WorkspaceStore();
 store.createUser({username:'fixture-owner',displayName:'Owner',role:'owner',permissions:['*'],password:'Synthetic status proof password'});
 const config={executablePath:path.join(directory,'trusted-client'),configurationDirectory:path.join(directory,'selected-profile')};
 const selected={...config};
 const provider={id:'claude-subscription-cli',name:'Synthetic Claude',defaultTier:1 as const,isAvailable:async()=>true,listModels:async()=>['claude-synthetic'],generate:vi.fn(),stream:vi.fn()};
 const server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(directory,'settings.json'),claudeAccountConfiguration:config,conversation:chatConfigured?{provider,models:['claude-synthetic']}:undefined});
 config.executablePath=path.join(directory,'mutated-after-construction');
 inspect.mockResolvedValue({loggedIn:false,connectionKind:'signed-out',inferenceVerified:false});
 try{
   await server.start();const base=server.getBaseUrl();
   expect((await fetch(base+'/api/connections/claude/status',{method:'POST'})).status).toBe(401);expect(inspect).not.toHaveBeenCalled();
   const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'fixture-owner',password:'Synthetic status proof password'})});
   const {token}=await login.json();
   const response=await fetch(base+'/api/connections/claude/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({executablePath:'untrusted-browser-path',configurationDirectory:'untrusted-browser-profile'})});
   expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
   expect(await response.json()).toEqual({configured:true,loggedIn:false,connectionKind:'signed-out',inferenceVerified:false,chatConfigured,chatModels:chatConfigured?['claude-synthetic']:[]});
   expect(provider.generate).not.toHaveBeenCalled();expect(provider.stream).not.toHaveBeenCalled();
   expect(inspect).toHaveBeenCalledWith(selected.executablePath,selected.configurationDirectory,expect.any(AbortSignal));
 }finally{await server.stop();fs.rmSync(directory,{recursive:true,force:true});}
});
