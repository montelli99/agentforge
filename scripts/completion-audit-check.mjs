import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = ['docs/RELEASE_COMPLETION_PLAN.md', 'docs/GOAL_EXECUTION_MAP.md', 'docs/RELEASE_STATUS.md', 'docs/RELEASE_RUNBOOK.md', 'docs/requirements/IMPLEMENTATION_TRACEABILITY.md'];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
const plan = missing.includes(required[0]) ? '' : fs.readFileSync(path.join(root, required[0]), 'utf8');
const requirements = plan.split(/\r?\n/).filter(line => line.startsWith('| ') && !line.startsWith('| Requirement |') && !line.startsWith('| ---')).map(line => {
  const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
  return { requirement: cells[0], requiredEvidence: cells[1], recordedGap: cells[2], verified: false };
});
const malformed = requirements.length === 0 || requirements.some(row => !row.requirement || !row.requiredEvidence || !row.recordedGap);
// A prose progress entry or green component check cannot prove the full release goal.
// This audit inventories requirements; independent exact-build acceptance is still required.
console.log(JSON.stringify({
  sourceAuditPassed: missing.length === 0 && !malformed,
  goalAchieved: false,
  missingDocuments: missing,
  requirements,
  blockers: [
    ...(malformed ? ['Public release requirements table is missing or malformed.'] : []),
    'Requirement-by-requirement current-build acceptance has not been supplied to this audit. See recorded gaps; do not interpret sourceAuditPassed as release readiness.'
  ],
  generatedAt: new Date().toISOString()
}, null, 2));
process.exitCode = 1;
