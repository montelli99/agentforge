import path from 'node:path';
import {runBoundedChild,BoundedChildFailure} from '../src/providers/models/boundedCliProcess.js';
import {reserveComparisonAttempt,finalizeComparisonAttempt} from './comparison-attempt.mjs';

/** Process lifecycle for a pre-frozen attempt. Caller supplies its pinned arm
 * launcher, independent evaluator and proxy accounting, never model self-scores.
 * This runner is not itself a filesystem or network isolation boundary. */
export async function runComparisonProcess(input:{
 reservation:Parameters<typeof reserveComparisonAttempt>[0];
 executable:string;args:string[];env:NodeJS.ProcessEnv;
 timeoutMs:number;maxOutputBytes:number;accountingTimeoutMs?:number;
 stage:(directory:string)=>Promise<void>;
 score:(directory:string)=>Promise<{artifactPassed:boolean;workflowPassed:boolean}>;
 accounting:()=>Promise<{requests:number;usage:null|{inputTokens:number;outputTokens:number}}>;
}){
 if(!path.isAbsolute(input.executable)||!Number.isSafeInteger(input.timeoutMs)||input.timeoutMs<1||!Number.isSafeInteger(input.maxOutputBytes)||input.maxOutputBytes<1)throw Error('Explicit process bounds required');
 const accountingTimeoutMs=input.accountingTimeoutMs??10000;
 if(!Number.isSafeInteger(accountingTimeoutMs)||accountingTimeoutMs<1||accountingTimeoutMs>60000)throw Error('Bounded accounting deadline required');
 const {directory}=await reserveComparisonAttempt(input.reservation);
 const started=performance.now();
 let status='failed';let artifactPassed=false;let workflowPassed=false;
 let processPassed=false;
 try{
  await input.stage(directory);
  const result=await runBoundedChild(input.executable,input.args,{cwd:directory,env:input.env,timeoutMs:input.timeoutMs,maxOutputBytes:input.maxOutputBytes});
  processPassed=result.code===0;
 }catch(error){
  status=error instanceof BoundedChildFailure&&error.classification==='timeout'?'timed_out':'failed';
 }
 // Evaluate exactly once after the child has exited or been stopped. An
 // evaluator failure is evidence, not permission to retry it automatically.
 try{
  const score=await input.score(directory);artifactPassed=score.artifactPassed;workflowPassed=processPassed&&score.workflowPassed;
  if(artifactPassed&&workflowPassed)status='passed';
 }catch{if(status!=='timed_out')status='failed';}
 let accounting:{requests:number|null;usage:null|{inputTokens:number;outputTokens:number}};
 let accountingTimer:ReturnType<typeof setTimeout>|undefined;
 try{accounting=await Promise.race([Promise.resolve().then(()=>input.accounting()),new Promise<never>((_,reject)=>{accountingTimer=setTimeout(()=>reject(Error('Accounting deadline exceeded')),accountingTimeoutMs);})]);}catch{
  // A missing accounting service must not erase the completed/failed attempt
  // or invent zero usage. Retain artifact correctness but reject overall pass.
  accounting={requests:null,usage:null};status='failed';
 }finally{clearTimeout(accountingTimer);}
 return finalizeComparisonAttempt(directory,{status,artifactPassed,workflowPassed,elapsedMs:performance.now()-started,...accounting});
}
