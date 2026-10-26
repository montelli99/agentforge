import {fileURLToPath} from 'node:url';
export function evaluationDirectory(){
 const version=process.env.AGENTFORGE_EVALUATION_VERSION||'2';
 if(!['2','3'].includes(version))throw Error('Unsupported evaluation version');
 return fileURLToPath(new URL('./fixtures/release-evaluation-v'+version+'/',import.meta.url));
}
