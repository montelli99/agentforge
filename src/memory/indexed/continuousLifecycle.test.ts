import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ContinuousIndexedMemoryLifecycle } from './continuousLifecycle.js';

const roots: string[] = [];
const lifecycles: ContinuousIndexedMemoryLifecycle[] = [];
afterEach(async () => {
  for (const item of lifecycles.splice(0)) await item.close();
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'af-memory-recovery-')));
  roots.push(root);
  const sourceRoot = path.join(root, 'sources');
  const ownedRoot = path.join(root, 'owned');
  fs.mkdirSync(sourceRoot);
  const write = (text: string) => fs.writeFileSync(path.join(sourceRoot, 'one.json'), JSON.stringify({
    schemaVersion: 1, kind: 'agentforge-synthetic-memory-v1', synthetic: true,
    userId: 'test-user', projectId: 'test-project',
    records: [{ id: 'one', title: 'Synthetic fixture', text, visibility: 'index' }],
  }));
  let fail = false;
  const create = () => {
    const lifecycle = new ContinuousIndexedMemoryLifecycle({ enabled: true,
      mode: 'original-index-continuous-synthetic-v1', userId: 'test-user', projectId: 'test-project',
      sourceRoot, ownedRoot, inputFiles: ['one.json'],
    }, { identity: 'synthetic', dimensions: 2, embed: async () => {
      if (fail) throw new Error('synthetic provider failure');
      return [1, 0];
    } }, { start() {}, close() {} });
    lifecycles.push(lifecycle);
    return lifecycle;
  };
  write('Original synthetic generation');
  return { create, write, ownedRoot, sourceRoot, setFailure: (value: boolean) => { fail = value; } };
}
describe('continuous memory recovery', () => {
  it('replays a control receipt after restart without applying changed sources', async () => {
    const f = fixture(); const item = f.create(); await item.start();
    const request = { operation: 'rescan', operationId: 'request-one', expectedRevision: 1 };
    const receipt = await item.control(request); await item.close();
    f.write('Later synthetic generation');
    const restarted = f.create(); await restarted.start();
    expect(restarted.status().revision).toBe(2);
    expect(await restarted.control(request)).toEqual(receipt);
    await expect(restarted.control({ ...request, expectedRevision: 2 })).rejects.toThrow('Continuous memory control failed.');
  });
  it('serializes two controls against one expected revision', async () => {
    const f = fixture(); const item = f.create(); await item.start();
    f.write('Changed synthetic generation');
    const results = await Promise.allSettled([
      item.control({ operation: 'rescan', operationId: 'first', expectedRevision: 1 }),
      item.control({ operation: 'rescan', operationId: 'second', expectedRevision: 1 }),
    ]);
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(item.status().revision).toBe(2);
  });
  it('rejects malformed durable receipts without leaving the database open', async () => {
    const f = fixture(); const item = f.create(); await item.start(); await item.close();
    const db = new DatabaseSync(path.join(f.ownedRoot, 'continuous-index.sqlite'));
    const raw = db.prepare("SELECT value FROM meta WHERE key='lifecycle_state'").get() as {value: string};
    const state = JSON.parse(raw.value); state.receipts = [null];
    db.prepare("UPDATE meta SET value=? WHERE key='lifecycle_state'").run(JSON.stringify(state)); db.close();
    await expect(f.create().start()).rejects.toThrow('Continuous memory durable state is invalid.');
  });
  it('repairs a stranded pre-commit snapshot even when source returns to committed digest', async () => {
    const f = fixture(); const first = f.create(); await first.start();
    const revision = first.status().revision; await first.close();
    const snapshot = path.join(f.ownedRoot, 'snapshots', fs.readdirSync(path.join(f.ownedRoot, 'snapshots'))[0]!);
    // Durable state at the exact crash boundary: files advanced, SQLite did not.
    fs.writeFileSync(snapshot, 'Uncommitted synthetic generation');
    const restarted = f.create(); await restarted.start();
    expect(fs.readFileSync(snapshot, 'utf8')).toContain('Original synthetic generation');
    expect(restarted.status().revision).toBe(revision);
    expect((await restarted.query('Original'))[0]?.snippet).toContain('Original synthetic generation');
  });
  it('rebuilds missing index rows with unchanged source and preserves receipt identity', async () => {
    const f = fixture(); const first = f.create(); await first.start();
    const receipt = first.status().receipts; await first.close();
    const db = new DatabaseSync(path.join(f.ownedRoot, 'continuous-index.sqlite'));
    db.exec('DELETE FROM chunks_fts; DELETE FROM chunks; DELETE FROM files;'); db.close();
    const restarted = f.create(); await restarted.start(); await restarted.rescan();
    expect(restarted.status().receipts).toEqual(receipt);
    expect((await restarted.query('Original'))[0]?.snippet).toContain('Original synthetic generation');
  });
  it('preserves committed generation on embedding failure and recovers on retry', async () => {
    const f = fixture(); const item = f.create(); await item.start();
    f.write('Replacement synthetic generation'); f.setFailure(true);
    await expect(item.rescan()).rejects.toThrow();
    expect(item.status().revision).toBe(1);
    await expect(item.query('Original')).rejects.toThrow();
    f.setFailure(false); await item.rescan();
    expect(item.status().revision).toBe(2);
    expect((await item.query('Replacement'))[0]?.snippet).toContain('Replacement synthetic generation');
  });
  it('rejects a hardlinked source before ingestion', async () => {
    const f = fixture(); fs.linkSync(path.join(f.sourceRoot, 'one.json'), path.join(f.sourceRoot, 'alias.json'));
    await expect(f.create().start()).rejects.toThrow('Continuous memory reconciliation failed.');
  });
});
