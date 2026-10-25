import {Script} from 'node:vm';
import {renderWorkspaceApp} from '../dist/server/ui/workspaceApp.js';

// TypeScript cannot parse JavaScript held inside HTML template strings.
// Compile the exact emitted inline scripts without executing browser code.
const html=renderWorkspaceApp();
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
if(!scripts.length)throw Error('No application scripts found in the built page');
let compiled=0;
for(const [index,match] of scripts.entries()){
 const [,attributes,source]=match;
 const type=/\btype\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1];
 if(type==='application/json'||type==='application/ld+json'){JSON.parse(source);continue;}
 if(/\bsrc\s*=/i.test(attributes)||type&& !['text/javascript','application/javascript'].includes(type))throw Error('Browser script validator requires an explicit handler for this script type');
 new Script(source,{filename:`built-workspace-inline-${index+1}.js`});
 compiled++;
}
if(!compiled)throw Error('No executable browser scripts validated');
console.log(`Validated syntax of ${compiled} built browser script(s); no browser code executed.`);
