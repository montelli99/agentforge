import {expect,it,vi} from 'vitest';
import {ModelPlanDraftProvider} from './modelPlanDraftProvider.js';
import {ModelProviderError, type GenerativeModelProvider, type ModelRequestOptions, type ModelResponse} from '../providers/model.js';
import type {PlanningAudit} from './executionReceipt.js';
import type {Task} from '../types/task.js';

const task={id:'synthetic-task',title:'Synthetic plan',contract:{requiredChecks:[]}} as unknown as Task;
const result:ModelResponse={id:'fixture',model:'fixture',content:'{"commands":[{"checkName":"fixture","command":"node -v"}]}',finishReason:'stop',usage:{promptTokens:3,completionTokens:2,totalTokens:5}};
it('records unknown usage on timeout and ignores a late success without retry',async()=>{
 const audits:PlanningAudit[]=[];let finish!:(response:ModelResponse)=>void;let signal:AbortSignal|undefined;
 const generate=vi.fn((options:ModelRequestOptions)=>{signal=options.signal;return new Promise<ModelResponse>(resolve=>{finish=resolve;});});
 const planner=new ModelPlanDraftProvider({generate} as unknown as GenerativeModelProvider,'fixture',[],undefined,{requireReportedUsage:true,deadlineMs:10,persist:async audit=>{audits.push(structuredClone(audit));}});
 await expect(planner.draft(task)).rejects.toThrow(/deadline|cancelled/);
 expect(signal?.aborted).toBe(true);expect(audits.map(a=>a.status)).toEqual(['started','unknown']);
 expect(audits[1].inputTokens).toBeUndefined();expect(audits[1].responseDigest).toBeUndefined();
 finish(result);await new Promise(resolve=>setImmediate(resolve));
 expect(audits).toHaveLength(2);expect(generate).toHaveBeenCalledTimes(1);
});
it('retains reported usage from a provider failure while rejecting the draft',async()=>{
 const audits:PlanningAudit[]=[];
 const generate=vi.fn().mockRejectedValue(new ModelProviderError('synthetic failure',result.usage));
 const planner=new ModelPlanDraftProvider({generate} as unknown as GenerativeModelProvider,'fixture',[],undefined,{requireReportedUsage:true,persist:async audit=>{audits.push(audit);}});
 await expect(planner.draft(task)).rejects.toThrow('synthetic failure');
 expect(audits[1]).toMatchObject({status:'completed',inputTokens:3,outputTokens:2});
 expect(generate).toHaveBeenCalledTimes(1);await expect(planner.getPlan()).rejects.toThrow(/not an approved/);
});
it('does not call the model if the started audit cannot be saved',async()=>{
 const generate=vi.fn();
 const planner=new ModelPlanDraftProvider({generate} as unknown as GenerativeModelProvider,'fixture',[],undefined,{requireReportedUsage:true,persist:async()=>{throw Error('synthetic persistence failure');}});
 await expect(planner.draft(task)).rejects.toThrow('synthetic persistence failure');expect(generate).not.toHaveBeenCalled();
});
