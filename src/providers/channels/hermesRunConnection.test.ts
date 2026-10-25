import {it,expect,vi,afterEach} from 'vitest';
import {configureHermesRunConnection} from './hermesRunConnection.js';
afterEach(()=>vi.unstubAllGlobals());
const env={AGENTFORGE_HERMES_URL:'http://127.0.0.1:8642',AGENTFORGE_HERMES_API_KEY:'synthetic-only'};
it('is opt-in and binds receipts to the normalized endpoint and credential',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect(configureHermesRunConnection({})).toBeUndefined();
 expect(configureHermesRunConnection({API_SERVER_KEY:'unrelated'})).toBeUndefined();
 expect(()=>configureHermesRunConnection({AGENTFORGE_HERMES_URL:env.AGENTFORGE_HERMES_URL})).toThrow('both');
 const connection=configureHermesRunConnection(env)!;
 expect(connection.id).toMatch(/^hermes-[a-f0-9]{64}$/);
 expect(configureHermesRunConnection({...env,AGENTFORGE_HERMES_URL:env.AGENTFORGE_HERMES_URL+'/'})!.id).toBe(connection.id);
 expect(configureHermesRunConnection({...env,AGENTFORGE_HERMES_API_KEY:'rotated'})!.id).not.toBe(connection.id);
 expect(configureHermesRunConnection({...env,AGENTFORGE_HERMES_URL:'http://127.0.0.1:8643'})!.id).not.toBe(connection.id);
 expect(JSON.stringify(connection)).not.toContain('synthetic-only');
 expect(fetcher).not.toHaveBeenCalled();
});
it('checks compatibility before submitting and never retries an interrupted effect',async()=>{
 const caps={object:'hermes.api_server.capabilities',platform:'hermes-agent',auth:{type:'bearer',required:true},runtime:{tool_execution:'server'},features:{run_submission:true,run_status:true,run_stop:true}};
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({}));vi.stubGlobal('fetch',fetcher);
 const connection=configureHermesRunConnection(env)!;
 await expect(connection.submitSessionTurn('api-test','task','request-123')).rejects.toThrow('required authenticated');
 expect(fetcher).toHaveBeenCalledTimes(1);
 fetcher.mockResolvedValueOnce(Response.json(caps)).mockRejectedValueOnce(Error('lost response'));
 await expect(connection.submitSessionTurn('api-test','task','request-456')).rejects.toThrow('do not automatically retry');
 expect(fetcher).toHaveBeenCalledTimes(3);
 expect(fetcher.mock.calls.map(call=>call[1].method)).toEqual(['GET','GET','POST']);
});
