import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.env.AGENTFORGE_CI_RUN_ID;
if (!runId || !/^\d+$/.test(runId)) throw new Error('AGENTFORGE_CI_RUN_ID must identify a completed hosted run for this exact commit.');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const repository = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { cwd: root, encoding: 'utf8', timeout: 30000 }).trim();
const run = JSON.parse(execFileSync('gh', ['run', 'view', runId, '--repo', repository, '--json', 'headSha,status,conclusion,jobs,url,workflowName'], { cwd: root, encoding: 'utf8', timeout: 30000 }));
if (run.headSha !== head || run.status !== 'completed' || run.conclusion !== 'success'
  || run.workflowName !== 'AgentForge CI' || run.jobs.length !== 7
  || run.jobs.some(job => job.status !== 'completed' || job.conclusion !== 'success')) {
  throw new Error('Hosted CI does not prove all seven jobs passed for the exact current commit.');
}
console.log(JSON.stringify({ passed: true, verifiedCommit: head, jobs: run.jobs.length, url: run.url }, null, 2));
