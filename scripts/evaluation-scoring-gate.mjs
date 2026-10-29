import path from 'node:path';
import {evaluationDirectory} from './evaluation-directory.mjs';
import fs from 'node:fs/promises';
export async function assertEvaluationScoringAllowed(){
 const disposition=JSON.parse(await fs.readFile(path.join(evaluationDirectory(),'disposition.json'),'utf8'));
 if(disposition.liveScoringAllowed!==true)throw Error('Live evaluation scoring disabled: '+disposition.reason);
}
