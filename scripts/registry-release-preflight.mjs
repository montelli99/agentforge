import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'agentforge-registry-preflight-'));
const npmrc = path.join(temporary, 'npmrc');
const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const command = process.platform === 'win32' ? process.execPath : 'npm';
const prefix = process.platform === 'win32' ? [npmCli] : [];

try {
  fs.writeFileSync(npmrc, '', { mode: 0o600 });
  const output = execFileSync(command, [...prefix, 'pack', '--dry-run', '--json', '--ignore-scripts', `--userconfig=${npmrc}`],
    { cwd: root, encoding: 'utf8', timeout: 120000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const pack = JSON.parse(output)[0];
  let registryState = 'lookup-failed';
  // Public metadata only. No account credentials or project registry overrides.
  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}`,
      { signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (response.status === 404) registryState = 'version-not-publicly-found';
    else if (response.ok) {
      const metadata = await response.json();
      if (metadata.name === pkg.name && metadata.version === pkg.version) registryState = 'version-already-published';
    }
  } catch { /* A network failure never proves availability. */ }
  const archiveFingerprint = crypto.createHash('sha256').update(JSON.stringify({ id: pack.id, integrity: pack.integrity,
    files: pack.files.map(({ path: filePath, size }) => ({ path: filePath, size })) })).digest('hex');
  const passed = registryState === 'version-not-publicly-found';
  console.log(JSON.stringify({ passed, package: pack.id, archive: { filename: pack.filename, size: pack.size,
    unpackedSize: pack.unpackedSize, integrity: pack.integrity, fingerprint: archiveFingerprint, files: pack.entryCount },
    registryState, registry: 'https://registry.npmjs.org', ownershipVerified: false, authenticationVerified: false,
    publishPerformed: false, limitation: 'Public absence does not establish package-name ownership or permission to publish.' }, null, 2));
  process.exitCode = passed ? 0 : 1;
} finally {
  fs.rmSync(npmrc, { force: true });
  fs.rmdirSync(temporary);
}
