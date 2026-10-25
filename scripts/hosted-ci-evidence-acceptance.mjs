import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.env.AGENTFORGE_CI_RUN_ID;
if (!runId || !/^\d+$/.test(runId)) throw new Error('AGENTFORGE_CI_RUN_ID must identify a completed hosted run for this exact commit.');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim())
  throw new Error('Commit or reconcile local changes before using hosted CI as exact-checkout evidence.');
const repository = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { cwd: root, encoding: 'utf8', timeout: 30000 }).trim();
const run = JSON.parse(execFileSync('gh', ['run', 'view', runId, '--repo', repository, '--json', 'headSha,status,conclusion,jobs,url,workflowName'], { cwd: root, encoding: 'utf8', timeout: 30000 }));
const expectedJobs = new Set(['Public package and isolated execution acceptance',
  ...['ubuntu-latest', 'windows-latest', 'macos-latest'].flatMap(os =>
    ['22.x', '24.x'].map(node => `Build & Test (${os}, Node ${node})`))]);
if (run.headSha !== head || run.status !== 'completed' || run.conclusion !== 'success'
  || run.workflowName !== 'AgentForge CI' || run.jobs.length !== 7
  || new Set(run.jobs.map(job => job.name)).size !== expectedJobs.size
  || run.jobs.some(job => !expectedJobs.has(job.name) || job.status !== 'completed' || job.conclusion !== 'success')) {
  throw new Error('Hosted CI does not prove all seven jobs passed for the exact current commit.');
}
const inventory = JSON.parse(execFileSync('gh', ['api', `repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`],
  {cwd: root, encoding: 'utf8', timeout: 30000}));
if (!Array.isArray(inventory.artifacts) || inventory.total_count !== inventory.artifacts.length)
  throw new Error('Hosted artifact inventory is incomplete.');
const matching = inventory.artifacts.filter(artifact => artifact.name === `agentforge-${head}`);
const artifact = matching[0];
if (matching.length !== 1 || artifact.expired !== false || !Number.isSafeInteger(artifact.id)
  || !/^sha256:[a-f0-9]{64}$/.test(artifact.digest || '')
  || artifact.workflow_run?.head_sha !== head || String(artifact.workflow_run?.id) !== runId)
  throw new Error('Exact-build release artifact is missing, expired, ambiguous or lacks digest/source evidence.');
console.log(JSON.stringify({ passed: true, verifiedCommit: head, jobs: run.jobs.length, url: run.url,
  artifact: {id: artifact.id, name: artifact.name, archiveDigest: artifact.digest},
  packageContentsIndependentlyVerified: false }, null, 2));
