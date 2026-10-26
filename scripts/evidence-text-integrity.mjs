import {createHash} from 'node:crypto';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Permit only Git's CRLF/LF text conversion; do not parse/reformat evidence. */
export function verifyEvidenceText(bytes,recordedHash){
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 const lf=text.replace(/\r\n/g,'\n');
 if(lf.includes('\r'))throw Error('Unsupported evidence line endings');
 const canonical=Buffer.from(lf),windows=Buffer.from(lf.replace(/\n/g,'\r\n'));
 const encoding=sha256(canonical)===recordedHash?'LF':sha256(windows)===recordedHash?'CRLF':undefined;
 if(!encoding)throw Error('Evidence content does not match the recorded hash');
 return {recordedSha256:recordedHash,recordedLineEndings:encoding,canonicalLfSha256:sha256(canonical)};
}
