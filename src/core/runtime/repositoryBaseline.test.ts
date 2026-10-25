import {it, expect} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {readRepositoryBaseline} from './repositoryBaseline.js';

it('reads only a matching repository revision and excludes uncommitted changes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'af-baseline-'));
  const git = (...args: string[]) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: 'pipe'}).trim();
  try {
    git('init', '--initial-branch=main');
    expect(() => readRepositoryBaseline(root, root)).toThrow('committed revision');
    fs.writeFileSync(path.join(root, 'fixture.txt'), 'synthetic');
    git('add', 'fixture.txt');
    git('-c', 'user.name=Synthetic', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture');
    const head = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(root, 'fixture.txt'), 'uncommitted');
    expect(readRepositoryBaseline(root, root)).toEqual({baseBranch: 'main', baseSha: head});
    expect(fs.readFileSync(path.join(root, 'fixture.txt'), 'utf8')).toBe('uncommitted');
    expect(() => readRepositoryBaseline(root, os.tmpdir())).toThrow('does not match');
    const nested = path.join(root, 'nested');fs.mkdirSync(nested);
    expect(() => readRepositoryBaseline(nested, nested)).toThrow('selected folder');
    git('checkout', '--detach', head);
    expect(readRepositoryBaseline(root, root)).toEqual({baseBranch: 'HEAD', baseSha: head});
  } finally {
    if(path.dirname(root)!==os.tmpdir()||!path.basename(root).startsWith('af-baseline-'))throw Error('Invalid test cleanup');
    fs.rmSync(root,{recursive:true,force:true});
  }
});
