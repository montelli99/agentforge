import {expect,it} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {configureClaudeChat} from './claudeChatConfiguration.js';
it('requires explicit configuration and refuses ambiguous fallback',()=>{
 expect(configureClaudeChat({})).toBeUndefined();
 expect(()=>configureClaudeChat({AGENTFORGE_CHAT_PROVIDER:'claude-cli'})).toThrow();
 expect(()=>configureClaudeChat({AGENTFORGE_CHAT_PROVIDER:'claude-cli',AGENTFORGE_CHAT_API_KEY:'synthetic'})).toThrow('fallback');
});
it('constructs the selected official-client route without reading credentials or running a client',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'claude-chat-config-'));
 try{
 const file=path.join(root,'config.json');fs.writeFileSync(file,JSON.stringify({executablePath:path.join(root,'client'),configurationDirectory:path.join(root,'profile'),model:'claude-synthetic'}));
 const result=configureClaudeChat({AGENTFORGE_CHAT_PROVIDER:'claude-cli',AGENTFORGE_CHAT_CLAUDE_CONFIG:file});
 expect(result?.models).toEqual(['claude-synthetic']);expect(result?.provider.id).toBe('claude-subscription-cli');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
