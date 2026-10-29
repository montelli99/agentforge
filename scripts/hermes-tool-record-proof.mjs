import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Accept only an explicitly selected synthetic run; never export entire profiles.
const [database,runId,destination]=process.argv.slice(2);
assert.ok(database&&destination);assert.match(runId??'',/^run_[a-f0-9]+$/);
const db=new DatabaseSync(database,{readOnly:true});
try{
 const rows=db.prepare('SELECT role,content,tool_calls,tool_name,tool_call_id FROM messages WHERE session_id = ? ORDER BY id').all(runId);
 const calls=rows.filter(row=>row.role==='assistant'&&row.tool_calls).flatMap(row=>JSON.parse(row.tool_calls));
 const command=calls.find(call=>call.function?.name==='terminal'&&JSON.parse(call.function.arguments).command==='python3 -c "print(1200 - 250 + 300)"');
 assert.ok(command,'Expected synthetic calculation command absent');
 const terminal=rows.filter(row=>row.role==='tool'&&row.tool_name==='terminal'&&row.tool_call_id===command.id).map(row=>JSON.parse(row.content)).find(result=>result.output?.trim()==='1250'&&result.exit_code===0&&result.error===null);
 assert.ok(terminal,'Successful tool result absent');
 const blocked=rows.filter(row=>row.role==='tool'&&row.tool_name==='execute_code').map(row=>JSON.parse(row.content)).some(result=>result.status==='error'&&result.tool_calls_made===0);
 const record={requirement:'P05',runId,command:command.function,terminalResult:terminal,earlierExecuteCodeBlocked:blocked,sourceDatabaseSha256:createHash('sha256').update(await fs.readFile(database)).digest('hex'),recordedAt:new Date().toISOString(),limits:['Runtime-record evidence for one arithmetic command, not a useful artifact workflow.','Does not prove cancellation of tool effects or the browser review journey.'],privacy:'Only selected synthetic command and result exported; no profiles, configuration, credentials or system prompts.'};
 await fs.writeFile(destination,JSON.stringify(record,null,2)+'\n');
 console.log('Synthetic Hermes terminal execution verified against runtime records.');
}finally{db.close();}
