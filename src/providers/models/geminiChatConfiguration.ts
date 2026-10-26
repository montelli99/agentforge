import {GeminiCliPlanner,readGeminiCliPlannerConfiguration} from './geminiCliPlanner.js';

/** Explicit host selection only; configuration never discovers personal profiles. */
export async function configureGeminiChat(env:NodeJS.ProcessEnv){
 if(env.AGENTFORGE_CHAT_PROVIDER!=='gemini-cli')return undefined;
 if(env.AGENTFORGE_MODEL_CONNECTIONS_FILE||env.AGENTFORGE_CHAT_API_KEY)throw Error('Choose one explicit Gemini chat route; API fallback is not permitted.');
 const config=await readGeminiCliPlannerConfiguration(env.AGENTFORGE_CHAT_GEMINI_CONFIG??'');
 return {provider:new GeminiCliPlanner(config),models:[config.model],config,
  connections:[{model:config.model,connection:'Official Gemini CLI Google sign-in',billing:'Eligibility and quota enforced by the official client; no API fallback',status:'Configured; live account access and inference not yet verified'}]};
}
