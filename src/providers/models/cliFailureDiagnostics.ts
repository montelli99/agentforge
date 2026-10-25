import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {BoundedChildResult} from './boundedCliProcess.js';

/** Never persist prompts, responses, environment values, or arbitrary item bodies. */
export function sanitizeCliDiagnostic(text:string,privatePaths:string[]=[]):string {
 let value=text.slice(0,32768);
 for(const p of privatePaths.filter(Boolean).sort((a,b)=>b.length-a.length)){
  value=value.split(p).join('<private-path>').split(p.replaceAll('\\','\\\\')).join('<private-path>');
 }
 value=value.replace(/(?:Bearer|Basic)\s+[^\s"',;]+/gi,'<redacted-auth>')
  .replace(/\b(?:sk|sess|ghp|github_pat)[-_][A-Za-z0-9_.-]+\b/g,'<redacted-token>')
  .replace(/\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)\b["']?\s*[:=]\s*["']?[^\s"',;}]+/gi,'<redacted-secret>')
  .replace(/https?:\/\/[^\s"'<>]+/gi,'<redacted-url>')
  .replace(/[A-Z]:[\\/][^\r\n"'<>]*/gi,'<redacted-path>')
  .replace(/\b[A-Za-z0-9_+\/-]{32,}={0,2}\b/g,'<redacted-opaque>')
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'');
 return value.slice(0,8192);
}
export function inspectCliEvents(stdout:string){
 const events:Array<{type?:string;usage?:unknown;item?:{type?:string;text?:string};error?:{message?:string};message?:string}>=[];
 let malformed=0;
 for(const line of stdout.split(/\r?\n/).filter(Boolean)){try{const e=JSON.parse(line);if(e&&typeof e==='object'&&!Array.isArray(e))events.push(e);else malformed++;}catch{malformed++;}}
 return {events,malformed};
}
export function persistCliFailure(directory:string,result:BoundedChildResult|undefined,classification:string,usageEvents:unknown[],privatePaths:string[]=[]){
 const inspected=inspectCliEvents(result?.stdout??'');
 const stdout=inspected.events.slice(0,32).map(e=>({
  type:typeof e.type==='string'?sanitizeCliDiagnostic(e.type,privatePaths):'unknown',
  ...(e.item?.type?{itemType:sanitizeCliDiagnostic(e.item.type,privatePaths)}:{}),
  ...(typeof e.error?.message==='string'?{error:sanitizeCliDiagnostic(e.error.message,privatePaths)}:{}),
  ...(typeof e.message==='string'&&['error','turn.failed'].includes(e.type??'')?{message:sanitizeCliDiagnostic(e.message,privatePaths)}:{})
 }));
 const stdoutErrorLines=(result?.stdout??'').split(/\r?\n/).filter(line=>/^(?:error|warning|fatal)[:\s]/i.test(line)).slice(0,8).map(line=>sanitizeCliDiagnostic(line,privatePaths));
 const record={schemaVersion:1,atUtc:new Date().toISOString(),classification,exitCode:result?.code??null,pid:result?.pid??null,
  stdout,stdoutErrorLines,malformedStdoutLines:inspected.malformed,stdoutBytes:Buffer.byteLength(result?.stdout??''),stderrBytes:Buffer.byteLength(result?.stderr??''),
  stderr:sanitizeCliDiagnostic(result?.stderr??'',privatePaths),usageEvents,
  rawOutputRetained:false,promptOrResponseRetained:false,retry:false};
 const diagnostics=path.join(directory,'failure-diagnostics');
 if(fs.existsSync(diagnostics)&&fs.lstatSync(diagnostics).isSymbolicLink())throw Error('Diagnostic directory must not be linked');
 fs.mkdirSync(diagnostics,{recursive:true});
 const filename=path.join(diagnostics,crypto.randomUUID()+'.json');
 fs.writeFileSync(filename,JSON.stringify(record,null,2),{flag:'wx'});return filename;
}
