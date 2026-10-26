import fs from 'node:fs/promises';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

export const dockerRun=(args,input,timeout=30000)=>{
 const result=spawnSync('docker',args,{input,encoding:'utf8',timeout,maxBuffer:2*1024*1024});
 if(result.status!==0)throw Error(`Docker ${args[0]} failed (${result.status}); output withheld`);
 return result.stdout;
};
export const containerLimits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','128','--memory','768m','--cpus','1','--tmpfs','/tmp:rw,nosuid,nodev,size=134217728,mode=1777'];

/** The client gets only a proxy token. Provider secret exists only in gateway tmpfs. */
export async function startComparisonGateway({image,apiKey,endpoint,model,maxRequests,maxOutputTokens}){
 if(!/^sha256:[a-f0-9]{64}$/.test(image))throw Error('Pinned image required');
 if(!apiKey||new URL(endpoint).protocol!=='https:')throw Error('Provider configuration required');
 const network=`af-comparison-${randomUUID()}`,name=`${network}-gateway`;
 const token=randomBytes(24).toString('hex');
 const proxy=await fs.readFile(new URL('./comparison-proxy.mjs',import.meta.url),'utf8');
 const usage=await fs.readFile(new URL('./reported-provider-usage.mjs',import.meta.url),'utf8');
 let madeNetwork=false,madeContainer=false,closed=false;
 const close=async()=>{
  if(closed)return;
  if(madeContainer){dockerRun(['rm','-f',name]);madeContainer=false;}
  if(madeNetwork){dockerRun(['network','rm',network]);madeNetwork=false;}
  closed=true;
 };
 try{
  dockerRun(['network','create','--internal',network]);madeNetwork=true;
  dockerRun(['create','--name',name,'--network',network,'--network-alias','accounting',...containerLimits,'--entrypoint','node',image,'-e','setInterval(()=>{},60000)']);madeContainer=true;
  dockerRun(['network','connect','bridge',name]);dockerRun(['start',name]);
  const config={token,apiKey,endpoint,model,maxRequests,maxOutputTokens};
  const source=`${usage}\n${proxy.replace("import {reportedUsage} from './reported-provider-usage.mjs';",'')}
import fs from 'node:fs/promises';
let pending=Promise.resolve();
const p=comparisonProxy({...${JSON.stringify(config)},record:audits=>{pending=pending.then(async()=>{await fs.writeFile('/tmp/audit.next',JSON.stringify(audits));await fs.rename('/tmp/audit.next','/tmp/audit.json');});return pending;}});
await fs.writeFile('/tmp/audit.json','[]');
await new Promise(r=>p.server.listen(19999,'0.0.0.0',r));await fs.writeFile('/tmp/ready','ready');`;
  dockerRun(['exec','-i',name,'node','--input-type=module','-e',"import fs from 'node:fs/promises';let code='';for await(const c of process.stdin)code+=c;await fs.writeFile('/tmp/gateway.mjs',code,{mode:0o600});"],source);
  dockerRun(['exec','-d',name,'node','/tmp/gateway.mjs']);
  dockerRun(['exec',name,'node','--input-type=module','-e',"import fs from 'node:fs/promises';for(let i=0;i<50;i++){try{await fs.stat('/tmp/ready');process.exit(0);}catch{await new Promise(r=>setTimeout(r,100));}}process.exit(1);"]);
  return {network,token,proxySha256:createHash('sha256').update(proxy).digest('hex'),audit:async()=>JSON.parse(dockerRun(['exec',name,'cat','/tmp/audit.json'])),close};
 }catch(error){await close();throw error;}
}
