import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {verifyEvidenceText} from './evidence-text-integrity.mjs';
const report=JSON.parse(await fs.readFile(new URL('../docs/evidence/p09-v3-report.json',import.meta.url),'utf8'));
assert.equal(report.records.length,18);
const records=[];
for(const row of report.records){
 assert.match(row.evidence,/^p09-v3-[a-z0-9-]+\.json$/);
 const bytes=await fs.readFile(new URL('../docs/evidence/'+row.evidence,import.meta.url));
 records.push({evidence:row.evidence,...verifyEvidenceText(bytes,row.evidenceSha256)});
}
console.log(JSON.stringify({passed:true,scope:'Original v3 evidence hashes verified allowing only Git LF/CRLF conversion',records},null,2));
