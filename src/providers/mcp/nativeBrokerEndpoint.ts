import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {NativeBrokerSession} from '../../core/runtime/nativeBrokerSession.js';

/** One host-created session per endpoint. Credential must be delivered only to
 * its isolated client, never placed in a repository or model prompt. */
export async function startNativeBrokerEndpoint(session:NativeBrokerSession){
 const token=randomBytes(32).toString('hex');let initialized=false;
 const server=http.createServer(async(req,res)=>{
  const send=(status:number,body:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  const supplied=Buffer.from(req.headers.authorization??'');const expected=Buffer.from('Bearer '+token);
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){send(401,{error:'Unauthorized'});return;}
  if(req.headers.origin||req.headers.host!==`127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`){send(403,{error:'Invalid origin or host'});return;}
  if(req.method!=='POST'||req.url!=='/mcp'){send(405,{error:'POST /mcp required'});return;}
  let id:unknown=null;
  try{
   const chunks:Buffer[]=[];let bytes=0;
   for await(const chunk of req){bytes+=chunk.length;if(bytes>65536){send(413,{error:'Request too large'});return;}chunks.push(Buffer.from(chunk));}
   const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!input||input.jsonrpc!=='2.0'||typeof input.method!=='string')throw Error('Invalid request');
   id=input.id??null;
   if(id!==null&&typeof id!=='string'&&typeof id!=='number')throw Error('Invalid id');
   if(input.method==='notifications/initialized'){res.writeHead(202);res.end();return;}
   if(id===null)throw Error('Request id required');
   let result:unknown;
   if(input.method==='initialize'){
    if(input.params?.protocolVersion!=='2025-06-18')throw Error('Unsupported protocol');
    initialized=true;result={protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'agentforge-broker',version:'0.1.2'}};
   }else{
    if(!initialized)throw Error('Initialize first');
    if(input.method==='tools/list')result={tools:[{name:'dispatch',description:'Execute one separately approved operation in this session.',inputSchema:{type:'object',additionalProperties:false,required:['approvalId','callId','tool','input'],properties:{approvalId:{type:'string'},callId:{type:'string'},tool:{type:'string'},input:{type:'object'}}}}]};
    else if(input.method==='tools/call'&&input.params?.name==='dispatch'){
     try{const receipt=await session.dispatch(input.params.arguments);result={content:[{type:'text',text:JSON.stringify(receipt)}]};}
     catch{result={isError:true,content:[{type:'text',text:'Operation not completed. Inspect host approval and recovery state; do not automatically retry.'}]};}
    }else throw Error('Unsupported method or tool');
   }
   send(200,{jsonrpc:'2.0',id,result});
  }catch{send(200,{jsonrpc:'2.0',id,error:{code:-32600,message:'Request rejected'}});}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address() as import('node:net').AddressInfo;
 return {endpoint:`http://127.0.0.1:${address.port}/mcp`,token,
  close:async()=>{session.close();server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
}

