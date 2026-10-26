import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sha256,verifyEvidenceText} from './evidence-text-integrity.mjs';
test('both checkouts verify the original encoding and canonical content',()=>{
 const lf=Buffer.from('{"synthetic":true}\n'),crlf=Buffer.from('{"synthetic":true}\r\n');
 for(const original of [lf,crlf])for(const checkout of [lf,crlf])assert.equal(verifyEvidenceText(checkout,sha256(original)).canonicalLfSha256,sha256(lf));
});
test('changed content, whitespace, malformed UTF8 and bare CR cannot pass',()=>{
 const original=Buffer.from('{"synthetic":true}\n');
 for(const changed of [Buffer.from('{"synthetic":false}\n'),Buffer.from('{ "synthetic":true}\n'),Buffer.from([255]),Buffer.from('{"synthetic":true}\r')])assert.throws(()=>verifyEvidenceText(changed,sha256(original)));
});
