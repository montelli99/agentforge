import {readClaudeCliPlannerConfiguration} from './claudeCliConfiguration.js';
import {ClaudeCliPlanner} from './claudeCliPlanner.js';

/** Explicit host opt-in; never discovers or imports a personal profile. */
export function configureClaudeChat(env:NodeJS.ProcessEnv){
 if(env.AGENTFORGE_CHAT_PROVIDER!=='claude-cli')return undefined;
 if(env.AGENTFORGE_MODEL_CONNECTIONS_FILE||env.AGENTFORGE_CHAT_API_KEY)throw Error('Choose one explicit Claude subscription chat route; API fallback is not permitted.');
 const config=readClaudeCliPlannerConfiguration(env.AGENTFORGE_CHAT_CLAUDE_CONFIG??'');
 return {provider:new ClaudeCliPlanner(config),models:[config.model],config};
}
