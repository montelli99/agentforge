import {expect,it} from 'vitest';
import {runBoundedChild,BoundedChildFailure} from './boundedCliProcess.js';

it('rejects invalid output limits before launching any client',async()=>{
 for(const maxOutputBytes of [0,-1,NaN,Infinity,1.5]){
  let launched=false;
  await expect(runBoundedChild(process.execPath,['-e','process.exit(0)'],{
   timeoutMs:5000,maxOutputBytes,onLaunch:()=>{launched=true;}
  })).rejects.toThrow('invalid child output limit');
  expect(launched).toBe(false);
 }
});
it('bounds real client output and reports an output-limit failure',async()=>{
 const error=await runBoundedChild(process.execPath,['-e',"process.stdout.write('x'.repeat(65536));setInterval(()=>{},1000)"],{
  timeoutMs:10000,maxOutputBytes:128
 }).catch(error=>error);
 expect(error).toBeInstanceOf(BoundedChildFailure);
 expect(error.classification).toBe('output-limit');
 expect(error.result.stdout).toBe('x'.repeat(128));
},15000);
it('cancels a running client without retrying it',async()=>{
 const controller=new AbortController();let launches=0;
 const error=await runBoundedChild(process.execPath,['-e','setInterval(()=>{},1000)'],{
  timeoutMs:10000,signal:controller.signal,onLaunch:()=>{launches++;controller.abort();}
 }).catch(error=>error);
 expect(error).toBeInstanceOf(BoundedChildFailure);
 expect(error.classification).toBe('cancelled');expect(launches).toBe(1);
},15000);
