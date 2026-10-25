import fs from 'node:fs/promises';
import path from 'node:path';

function safeRelative(value: string): string {
  if (!/^[a-zA-Z0-9_.][a-zA-Z0-9_./-]*$/.test(value) || value.split('/').some(p => !p || p === '.' || p === '..') || /^(?:\.git|\.worktrees)(?:\/|$)/i.test(value)) throw new Error('Unsupported writable/protected path.');
  return value;
}

/** Fail closed: only literal directory/** grants can be enforced by directory mounts. */
export async function prepareScopedWritableDirectories(root: string, scope: { allowedPaths: string[]; protectedPaths: string[] }): Promise<string[]> {
  const roots = [...new Set(scope.allowedPaths.map(pattern => {
    if (!pattern.endsWith('/**')) throw new Error('Docker write isolation requires literal directory/** grants.');
    return safeRelative(pattern.slice(0, -3));
  }))];
  const protectedRoots = scope.protectedPaths.map(pattern => safeRelative(pattern.endsWith('/**') ? pattern.slice(0, -3) : pattern));
  for (const writable of roots) for (const protectedRoot of protectedRoots) {
    const w = writable.toLowerCase(), p = protectedRoot.toLowerCase();
    if (w === p || w.startsWith(p + '/') || p.startsWith(w + '/')) throw new Error('Writable mount overlaps a protected path.');
  }
  const canonicalRoot = await fs.realpath(root);
  let inspected = 0;
  const inspect = async (target: string): Promise<void> => {
    if (++inspected > 10000) throw new Error('Writable tree inspection limit exceeded.');
    let info;
    try { info = await fs.lstat(target); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (info.isSymbolicLink() || (info.isFile() && info.nlink > 1)) throw new Error('Writable mounts cannot contain symbolic links, junctions or multiply linked files.');
    const real = await fs.realpath(target);
    if (real !== canonicalRoot && !real.startsWith(canonicalRoot + path.sep)) throw new Error('Writable mount escapes worktree.');
    if (info.isDirectory()) for (const entry of await fs.readdir(target)) await inspect(path.join(target, entry));
  };
  for (const relative of roots) {
    let current = root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      try { const info = await fs.lstat(current); if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Writable mount parent is not a real directory.'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    await inspect(path.join(root, relative));
  }
  for (const relative of roots) await fs.mkdir(path.join(root, relative), { recursive: true });
  return roots.filter(r => !roots.some(other => other !== r && r.startsWith(other + '/')));
}

export async function checkDockerReadiness(timeoutMs: number, probe: (timeoutMs: number) => Promise<string>): Promise<{ available: boolean; version?: string; error?: string }> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('Invalid Docker readiness timeout.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const version = await Promise.race([probe(timeoutMs), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Docker readiness timed out.')), timeoutMs); })]);
    return { available: true, version: version.trim() };
  } catch { return { available: false, error: 'Docker daemon readiness probe failed or exceeded its bounded timeout.' }; }
  finally { if (timer) clearTimeout(timer); }
}
