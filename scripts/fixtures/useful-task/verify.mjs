import assert from 'node:assert/strict';
import fs from 'node:fs';
// Frozen independently calculated oracle. Never include this file in model context.
export function verifyReport(value){
 assert.deepEqual(value,{rows:[
  {customer:'Acme',currency:'EUR',netCents:500,count:1},
  {customer:'Acme',currency:'USD',netCents:950,count:2},
  {customer:'Beta',currency:'EUR',netCents:-75,count:1},
  {customer:'Beta',currency:'USD',netCents:300,count:1},
  {customer:'Gamma',currency:'USD',netCents:0,count:1}
 ],includedInvoices:6,voidInvoices:1,supersededRows:2});
}
if(process.argv[2]){verifyReport(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));console.log('PASS: independently checked invoice report');}
