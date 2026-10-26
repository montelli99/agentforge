import http from 'node:http';
import {reportedUsage} from './reported-provider-usage.mjs';

/** Shared comparison boundary. No credentials or prompt contents enter accounting. */
export function comparisonProxy({token,apiKey,endpoint,model,maxRequests,maxOutputTokens,timeoutMs=60000,fetchImpl=fetch,record=async()=>{}}){
 for(const n of [maxRequests,maxOutputTokens,timeoutMs])if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid comparison limit');
 if(!token||!apiKey||!model)throw Error('Missing comparison configuration');
 const audits=[];let dispatched=0;
 const server=http.createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404).end();return;}
  if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(401).end();return;}
  let audit,controller;
  try{
   let raw='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>1024*1024){res.writeHead(413).end();return;}raw+=chunk;}
   let body;try{body=JSON.parse(raw);}catch{res.writeHead(400).end();return;}
   if(!body||Array.isArray(body)||typeof body!=='object'||!Array.isArray(body.messages)){res.writeHead(400).end();return;}
   if(dispatched>=maxRequests){res.writeHead(429).end();return;}
   // Reserve synchronously: concurrent requests cannot overrun the cap.
   audit={request:++dispatched,status:'reserved',usage:null,cost:null};audits.push(audit);
   await record(structuredClone(audits));
   controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
   res.on('close',()=>{if(!res.writableEnded)controller.abort();});
   try{
    const pinned={...body,model,n:1,max_tokens:maxOutputTokens,thinking:{type:'disabled'}};
    delete pinned.max_completion_tokens;delete pinned.max_output_tokens;delete pinned.best_of;
    const start=performance.now();
    const response=await fetchImpl(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(pinned),signal:controller.signal,redirect:'error'});
    const type=response.headers.get('content-type')||'application/json';
    res.writeHead(response.status,{'Content-Type':type});
    let captured='',size=0;
    for await(const chunk of response.body??[]){size+=chunk.length;if(size>8*1024*1024)throw Error('Response limit');captured+=Buffer.from(chunk).toString('utf8');res.write(chunk);}
    Object.assign(audit,{status:'response',httpStatus:response.status,elapsedMs:performance.now()-start,...reportedUsage(captured,type)});
    await record(structuredClone(audits));res.end();
   }finally{clearTimeout(timer);}
  }catch{
   controller?.abort();
   if(audit){audit.status='failed';try{await record(structuredClone(audits));}catch{}}
   if(!res.headersSent)res.writeHead(502).end('{}');else res.destroy();
  }
 });
 return {server,audits,get dispatched(){return dispatched;}};
}
