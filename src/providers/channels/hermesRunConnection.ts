import {HermesRunTransport} from './hermesRunTransport.js';

/** Dedicated explicit configuration only; never discover another agent's profile. */
export function configureHermesRunConnection(env:Record<string,string|undefined>){
  const url=env.AGENTFORGE_HERMES_URL?.trim();
  const token=env.AGENTFORGE_HERMES_API_KEY;
  if(!url&&!token)return undefined;
  if(!url||!token)throw Error('Set both AGENTFORGE_HERMES_URL and AGENTFORGE_HERMES_API_KEY');
  const transport=new HermesRunTransport(url,token);
  return {
    id:transport.getConnectionId(),
    displayName:'Hermes API sessions (experimental)',
    // HTTP reachability is not a persistent authenticated socket. Leave readiness
    // not_checked; check current capabilities before each approved submission.
    listSessions:(limit:number,offset:number)=>transport.listSessions(limit,offset),
    inspectRun:(runId:string)=>transport.inspectRun(runId),
    requestRunStop:(sessionKey:string,runId:string)=>transport.requestRunStop(sessionKey,runId),
    submitSessionTurn:async(sessionKey:string,message:string,requestId:string)=>{
      await transport.verifyCapabilities();
      return transport.submitSessionTurn(sessionKey,message,requestId);
    },
  };
}
