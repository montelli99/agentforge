import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function evaluationLimits(){
 const bytes=await fs.readFile(new URL('./fixtures/release-evaluation-v2/protocol.json',import.meta.url));
 const protocol=JSON.parse(bytes);
 if(protocol.version!==2||protocol.status!=='protocol-frozen-before-model-runs')throw Error('Evaluation protocol is not frozen');
 const limits=protocol.limits;
 for(const value of Object.values(limits))if(!Number.isSafeInteger(value)||value<1)throw Error('Invalid evaluation limit');
 let total=0,chat=0;
 return {protocolSha256:createHash('sha256').update(bytes).digest('hex'),limits,
 request(body){
  // Count attempted dispatches, including those refused at the boundary.
  total++;if(body.stream)chat++;
  if(total>limits.providerRequestsPerAttempt||chat>limits.chatRequestsPerAttempt)throw Error('Frozen evaluation request budget exceeded');
  return {...body,model:protocol.model,thinking:{type:'disabled'},max_tokens:limits.outputTokensPerRequest};
 },
 validatePlan(commands){
  if(!Array.isArray(commands)||!commands.length||commands.length>100)throw Error('Invalid evaluation plan');
  for(const c of commands){
   if(typeof c.command!=='string'||!c.command.trim()||c.command.length>20000||typeof c.checkName!=='string'||!c.checkName.trim()||c.checkName.length>200)throw Error('Invalid evaluation command');
   if(!Number.isSafeInteger(c.timeoutMs)||c.timeoutMs<1||c.timeoutMs>limits.commandTimeoutMs)throw Error('Evaluation command timeout exceeds frozen limit or is absent');
  }
 }
 };
}
