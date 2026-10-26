import {expect,it,vi} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const {inspect}=vi.hoisted(()=>({inspect:vi.fn()}));
vi.mock('../providers/models/geminiCliCapabilities.js',()=>({inspectGeminiCliCapabilities:inspect}));
import {WorkspaceStore} from '../core/store/workspaceStore.js';
import {AgentForgeWebServer} from './webServer.js';
it.each([false,true])('inspects the host-selected Gemini client without inference (chat=%s)',async(chatConfigured)=>{
 inspect.mockReset();
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'af-gemini-inspect-'));
 const bundle=path.join(directory,'selected-bundle.js'),store=new WorkspaceStore();
 store.createUser({username:'fixture-owner',displayName:'Owner',role:'owner',permissions:['*'],password:'Synthetic inspection password'});
 const provider={id:'gemini-subscription-cli',name:'Synthetic Gemini',defaultTier:1 as const,isAvailable:async()=>true,listModels:async()=>['gemini-synthetic'],generate:vi.fn(),stream:vi.fn()};
 const server=new AgentForgeWebServer(store,0,undefined,undefined,{settingsFilePath:path.join(directory,'settings.json'),geminiClientBundle:bundle,conversation:chatConfigured?{provider,models:['gemini-synthetic']}:undefined});
 inspect.mockResolvedValue({controlsAvailable:true,version:'synthetic',inferencePerformed:false});
 try{
  await server.start();const base=server.getBaseUrl();
  expect((await fetch(base+'/api/connections/gemini/inspect',{method:'POST'})).status).toBe(401);expect(inspect).not.toHaveBeenCalled();
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'fixture-owner',password:'Synthetic inspection password'})});const {token}=await login.json();
  const response=await fetch(base+'/api/connections/gemini/inspect',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({bundlePath:'untrusted-browser-path'})});
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({configured:true,controlsAvailable:true,version:'synthetic',inferencePerformed:false,chatConfigured,chatModels:chatConfigured?['gemini-synthetic']:[]});
  expect(inspect).toHaveBeenCalledWith(bundle,expect.any(AbortSignal));expect(provider.generate).not.toHaveBeenCalled();expect(provider.stream).not.toHaveBeenCalled();
 }finally{await server.stop();fs.rmSync(directory,{recursive:true,force:true});}
});
