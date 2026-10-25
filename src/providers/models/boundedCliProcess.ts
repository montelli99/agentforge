import {spawn,execFile} from 'node:child_process';
import {StringDecoder} from 'node:string_decoder';
export interface BoundedChildResult {pid:number|undefined;code:number|null;stdout:string;stderr:string}
export class BoundedChildFailure extends Error {
 constructor(message:string,readonly classification:'timeout'|'cancelled'|'output-limit'|'spawn-error',readonly result:BoundedChildResult){super(message);this.name='BoundedChildFailure';}
}
export async function runBoundedChild(executable:string,args:string[],options:{cwd?:string;input?:string;signal?:AbortSignal;timeoutMs:number;maxOutputBytes?:number;env?:NodeJS.ProcessEnv;onLaunch?:(pid:number|undefined)=>void}) {
 if(options.signal?.aborted)throw new Error('child cancelled before launch');if(!Number.isSafeInteger(options.timeoutMs)||options.timeoutMs<1)throw new Error('invalid child deadline');
 const child=spawn(executable,args,{cwd:options.cwd,env:options.env,stdio:['pipe','pipe','pipe'],windowsHide:true,detached:process.platform!=='win32'});options.onLaunch?.(child.pid);let stdout='',stderr='',reason:string|undefined;let stopping:Promise<void>|undefined;let forceTimer:ReturnType<typeof setTimeout>|undefined;const limit=options.maxOutputBytes??1024*1024;
 const decoders={stdout:new StringDecoder('utf8'),stderr:new StringDecoder('utf8')};let collectedBytes=0;
 // A process group reaches descendants holding output pipes, even after the leader exits.
 const signalGroup=(signal:NodeJS.Signals)=>{if(!child.pid)return;try{process.kill(-child.pid,signal);}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')child.kill(signal);}};
 const stop=(why:string)=>{reason??=why;stopping??=new Promise<void>(resolve=>{if(process.platform==='win32'&&child.pid){execFile('taskkill',['/PID',String(child.pid),'/T','/F'],{timeout:10000,windowsHide:true},()=>{child.kill();resolve();});}else if(child.pid){signalGroup('SIGTERM');forceTimer=setTimeout(()=>{signalGroup('SIGKILL');resolve();},1000);}else{child.kill();resolve();}});};
 const abort=()=>stop('child cancelled');options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();const timer=setTimeout(()=>stop('child deadline exceeded'),options.timeoutMs);
 const collect=(which:'stdout'|'stderr',chunk:Buffer)=>{const remaining=Math.max(0,limit-collectedBytes);const accepted=chunk.subarray(0,remaining);collectedBytes+=accepted.length;const part=decoders[which].write(accepted);if(which==='stdout')stdout+=part;else stderr+=part;if(chunk.length>remaining)stop('child output limit exceeded');};
 child.stdout.on('data',chunk=>collect('stdout',chunk));child.stderr.on('data',chunk=>collect('stderr',chunk));child.stdin.on('error',()=>{});child.stdin.end(options.input??'');
 try{let code:number|null;try{code=await new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});}catch(error){const osCode=(error as NodeJS.ErrnoException).code;stderr+='\nspawn error '+(typeof osCode==='string'?osCode:'unknown');throw new BoundedChildFailure('child spawn failed','spawn-error',{pid:child.pid,code:child.exitCode,stdout,stderr});}await stopping;stdout+=decoders.stdout.end();stderr+=decoders.stderr.end();const result={pid:child.pid,code,stdout,stderr};if(reason)throw new BoundedChildFailure(reason,reason.includes('deadline')?'timeout':reason.includes('cancelled')?'cancelled':'output-limit',result);return result;}finally{clearTimeout(timer);if(forceTimer)clearTimeout(forceTimer);options.signal?.removeEventListener('abort',abort);}
}

