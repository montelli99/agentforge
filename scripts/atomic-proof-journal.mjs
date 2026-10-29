import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
/** Serialize complete snapshots; interruption leaves the preceding valid record. */
export function atomicProofJournal(file){
 let tail=Promise.resolve();
 return {write(value){const snapshot=JSON.stringify(value,null,2);tail=tail.then(async()=>{const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,snapshot,{flag:'wx',mode:0o600});for(let attempt=0;;attempt++){try{await fs.rename(temp,file);break;}catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=20)throw error;await new Promise(resolve=>setTimeout(resolve,10));}}}finally{await fs.unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}});return tail;},flush(){return tail;}};
}
