import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function comparisonCase(id){
 const data=JSON.parse((await fs.readFile(new URL('./fixtures/comparison-v4/cases.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
 const c=data.cases.find(c=>c.id===id);if(!c)throw Error('Unknown case');
 const bytes=Buffer.from(JSON.stringify(c.input,null,2)+'\n');
 let expected;
 if(id==='invoice-adjustments'){
 const invoices=[...c.input.invoices].sort((a,b)=>a.id.localeCompare(b.id)).map(i=>({id:i.id,balanceCents:i.billedCents-c.input.payments.filter(p=>p.invoice===i.id&&p.status==='settled').reduce((s,p)=>s+p.amountCents,0)-c.input.credits.filter(p=>p.invoice===i.id&&p.status==='approved').reduce((s,p)=>s+p.amountCents,0)}));expected={invoices,totalBalanceCents:invoices.reduce((s,i)=>s+i.balanceCents,0)};
 }else if(id==='stock-allocation'){
 const remaining={...c.input.stock};const orders=[...c.input.orders].sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id)).map(o=>{const allocated=remaining[o.sku]>=o.quantity?o.quantity:0;remaining[o.sku]-=allocated;return {id:o.id,allocated};});expected={orders,remaining};
 }else{const counts={security:0,priority:0,billing:0,general:0};const tickets=[...c.input.tickets].sort((a,b)=>a.id.localeCompare(b.id)).map(t=>{const queue=t.security?'security':t.tier==='enterprise'&&t.ageHours>=24?'priority':t.topic==='billing'?'billing':'general';counts[queue]++;return {id:t.id,queue};});expected={tickets,counts};}
 return {id,prompt:c.prompt,inputSha256:hash(bytes),async stage(root){await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'input.json'),bytes,{flag:'wx'});},async score(root){
 try{for(const [name,dir,max] of [['input.json',false,bytes.length],['artifacts',true,0],['artifacts/result.json',false,65536]]){const s=await fs.lstat(path.join(root,name));if(s.isSymbolicLink()||(dir?!s.isDirectory():!s.isFile())||(!dir&&s.size>max))return {passed:false,reason:'invalid-file'};}
 if(hash(await fs.readFile(path.join(root,'input.json')))!==hash(bytes))return {passed:false,reason:'input-changed'};
 const actual=JSON.parse(await fs.readFile(path.join(root,'artifacts/result.json'),'utf8'));assert.deepEqual(actual,expected);return {passed:true};
 }catch{return {passed:false,reason:'missing-or-incorrect-output'};}
 }};
}
