import fs from 'node:fs/promises';
export async function assertEvaluationScoringAllowed(){
 const disposition=JSON.parse(await fs.readFile(new URL('./fixtures/release-evaluation-v2/disposition.json',import.meta.url),'utf8'));
 if(disposition.liveScoringAllowed!==true)throw Error('Live evaluation scoring disabled: '+disposition.reason);
}
