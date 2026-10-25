import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach,expect,it} from 'vitest';
import {readClaudeCliPlannerConfiguration} from './claudeCliConfiguration.js';
const directories:string[]=[];
afterEach(()=>{for(const directory of directories.splice(0))fs.rmSync(directory,{recursive:true,force:true});});
it('loads only an explicit configuration without requiring or touching an account',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'af-claude-config-'));directories.push(directory);
 const file=path.join(directory,'planner.json');
 const config={executablePath:path.join(directory,'not-launched'),configurationDirectory:path.join(directory,'not-read'),model:'claude-fixture'};
 fs.writeFileSync(file,JSON.stringify(config));
 expect(readClaudeCliPlannerConfiguration(file)).toEqual(config);
 expect(fs.readdirSync(directory)).toEqual(['planner.json']);
 for(const invalid of [{...config,apiKey:'synthetic-not-a-key'},{...config,configurationDirectory:'relative'},null,[],{...config,model:'--other'}]){
   fs.writeFileSync(file,JSON.stringify(invalid));expect(()=>readClaudeCliPlannerConfiguration(file)).toThrow();
 }
 fs.writeFileSync(file,' '.repeat(32769));expect(()=>readClaudeCliPlannerConfiguration(file)).toThrow(/32 KiB/);
 expect(()=>readClaudeCliPlannerConfiguration(directory)).toThrow(/regular file/);
 expect(()=>readClaudeCliPlannerConfiguration('planner.json')).toThrow(/absolute/);
});
