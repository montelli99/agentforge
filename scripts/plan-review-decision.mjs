import fs from 'node:fs/promises';
import path from 'node:path';
export async function readPlanReview(directory,digest){
 const read=async name=>{try{return await fs.readFile(path.join(directory,name),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}};
 const rejection=await read('rejected-plan.json');
 if(rejection!==null){const record=JSON.parse(rejection);if(record.digest!==digest||typeof record.reason!=='string'||!record.reason.trim())throw Error('Invalid plan rejection record');return {status:'rejected',reason:record.reason};}
 const approval=await read('reviewed-digest.txt');
 return {status:approval?.trim()===digest?'approved':'pending'};
}
