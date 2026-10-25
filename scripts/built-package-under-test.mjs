import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
const selected=process.env.AGENTFORGE_PACKAGE_ROOT;
if(selected&&!path.isAbsolute(selected))throw Error('Package under test must be an absolute path');
export const packageRoot=selected||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8')).name!=='agentforge')throw Error('Unexpected package under test');
export const builtModule=relative=>import(pathToFileURL(path.join(packageRoot,'dist',relative)).href);
