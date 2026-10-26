import path from 'node:path';
import {runBoundedChild,BoundedChildFailure} from '../src/providers/models/boundedCliProcess.js';
import {reserveComparisonAttempt,finalizeComparisonAttempt} from './comparison-attempt.mjs';

/** Process lifecycle for a pre-frozen attempt. Caller supplies its pinned arm
 * launcher, independent evaluator and proxy accounting, never model self-scores.
 * This runner is not itself a filesystem or network isolation boundary. */
export async function runComparisonProcess(input:{
 reservation:Parameters<typeof reserveComparisonAttempt>[0];
 executable:string;args:string[];env:NodeJS.ProcessEnv;
 timeoutMs:number;maxOutputBytes:number;
 stage:(directory:string)=>Promise<void>;
 score:(directory:string)=>Promise<{artifactPassed:boolean;workflowPassed:boolean}>;
 accounting:()=>Promise<{requests:number;usage:null|{inputTokens:number;outputTokens:number}}>;
}){
 if(!path.isAbsolute(input.executable)||!Number.isSafeInteger(input.timeoutMs)||input.timeoutMs<1||!Number.isSafeInteger(input.maxOutputBytes)||input.maxOutputBytes<1)throw Error('Explicit process bounds required');
 const {directory}=await reserveComparisonAttempt(input.reservation);
 const started=performance.now();
 let status='failed';let artifactPassed=false;let workflowPassed=false;
 try{
  await input.stage(directory);
  const result=await runBoundedChild(input.executable,input.args,{cwd:directory,env:input.env,timeoutMs:input.timeoutMs,maxOutputBytes:input.maxOutputBytes});
  // A nonzero process may still leave a correct artifact; retain both dimensions.
  const score=await input.score(directory);artifactPassed=score.artifactPassed;workflowPassed=result.code===0&&score.workflowPassed;
  if(artifactPassed&&workflowPassed)status='passed';
 }catch(error){
  status=error instanceof BoundedChildFailure&&error.classification==='timeout'?'timed_out':'failed';
  // Score partial effects only after the bounded runner has stopped its child.
  try{artifactPassed=(await input.score(directory)).artifactPassed;}catch{}
 }
 const accounting=await input.accounting();
 return finalizeComparisonAttempt(directory,{status,artifactPassed,workflowPassed,elapsedMs:performance.now()-started,...accounting});
}
