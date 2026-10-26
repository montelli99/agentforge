import {expect,it} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {configureGeminiChat} from './geminiChatConfiguration.js';
it('requires explicit Gemini configuration and rejects ambiguous API fallback',async()=>{
 expect(await configureGeminiChat({})).toBeUndefined();
 await expect(configureGeminiChat({AGENTFORGE_CHAT_PROVIDER:'gemini-cli'})).rejects.toThrow();
 for(const key of ['AGENTFORGE_CHAT_API_KEY','AGENTFORGE_MODEL_CONNECTIONS_FILE'])await expect(configureGeminiChat({AGENTFORGE_CHAT_PROVIDER:'gemini-cli',[key]:'synthetic'})).rejects.toThrow('fallback');
});
it('selects a dedicated Gemini chat route without reading credentials or invoking a client',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gemini-chat-config-'));
 try{
  const file=path.join(root,'config.json');fs.writeFileSync(file,JSON.stringify({bundlePath:path.join(root,'absent-bundle.js'),homeDirectory:path.join(root,'absent-home'),model:'gemini-synthetic'}));
  const result=await configureGeminiChat({AGENTFORGE_CHAT_PROVIDER:'gemini-cli',AGENTFORGE_CHAT_GEMINI_CONFIG:file});
  expect(result?.provider.id).toBe('gemini-subscription-cli');expect(result?.models).toEqual(['gemini-synthetic']);
  expect(result?.connections[0].status).toContain('not yet verified');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
