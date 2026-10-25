import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

export function assertSelectedRepository(root: string, selectedPath: string): void {
  let matches = false;
  try {
    const selected = fs.statSync(fs.realpathSync(selectedPath));
    const configured = fs.statSync(fs.realpathSync(root));
    matches = selected.isDirectory() && configured.isDirectory() && selected.dev === configured.dev && selected.ino === configured.ino;
  } catch { /* Do not fall back to a different repository. */ }
  if (!matches) throw Error("The selected project's repository does not match this execution worker. Configure a worker for that repository before running this task.");
}

/** Read only the configured repository's revision; no fetch, checkout or execution. */
export function readRepositoryBaseline(root: string, selectedPath: string): {baseBranch: string; baseSha: string} {
  assertSelectedRepository(root, selectedPath);
  const git = (args: string[]) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: 'pipe', timeout: 5000, maxBuffer: 65536, windowsHide: true}).trim();
  try {
    // Git may otherwise discover a repository in a parent of the selected folder.
    assertSelectedRepository(root, git(['rev-parse', '--show-toplevel']));
    const baseSha = git(['rev-parse', '--verify', 'HEAD^{commit}']);
    const baseBranch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(baseSha) || !baseBranch || baseBranch.length > 200) throw Error('Invalid revision');
    return {baseBranch, baseSha};
  } catch { throw Error('The selected folder must be a Git repository with a committed revision. No task was changed.'); }
}
