import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Explicit product assets only; never copy operational runtime directories.
for (const relative of [
  'memory/indexed/OPENCLAW_MIT_LICENSE.txt',
  'providers/models/assets/offline-id-token-verifier.mjs',
]) {
  const destination = path.join(root, 'dist', relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(path.join(root, 'src', relative), destination);
}
