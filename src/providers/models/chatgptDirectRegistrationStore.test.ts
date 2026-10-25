import { realpathSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileChatGPTDirectRegistrationStore, getDefaultChatGPTDirectRegistrationDirectory } from './chatgptDirectRegistrationStore.js';

const hostId = 'urn:uuid:00000000-0000-4000-8000-000000000001';
const clientId = 'mock-issued-client';

function temporaryStore() {
  const root = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'agentforge-direct-registration-')));
  const directory = path.join(root, 'chatgpt-direct');
  const store = new FileChatGPTDirectRegistrationStore(directory, () => hostId);
  return { root, directory, store };
}

describe('ChatGPT direct nonsecret registration store', () => {
  it('derives only the app-owned absolute directory', () => {
    const root = path.resolve('C:\\mock-agentforge-data');
    expect(getDefaultChatGPTDirectRegistrationDirectory({ AGENTFORGE_DATA_DIR: root }, 'C:\\unused'))
      .toBe(path.join(root, 'chatgpt-direct'));
    expect(() => getDefaultChatGPTDirectRegistrationDirectory({ AGENTFORGE_DATA_DIR: 'relative' }, 'C:\\unused')).toThrow('absolute');
    expect(() => new FileChatGPTDirectRegistrationStore(`${root}\\..\\other`)).toThrow('normalized absolute');
  });

  it('creates and reuses one stable host record before registration', async () => {
    const { root, directory, store } = temporaryStore();
    try {
      expect(await store.load()).toBeUndefined();
      await expect(store.prepareFirstRegistration()).resolves.toEqual({ hostId });
      await expect(store.prepareFirstRegistration()).resolves.toEqual({ hostId });
      expect(await store.load()).toEqual({ hostId });
      expect(JSON.parse(readFileSync(path.join(directory, 'host.json'), 'utf8'))).toEqual({ version: 1, hostId });
      expect(existsSync(path.join(directory, 'registration.json'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('atomically creates a returning registration without tokens or overwrite', async () => {
    const { root, directory, store } = temporaryStore();
    try {
      await store.prepareFirstRegistration();
      await store.saveIssuedClientId(hostId, clientId);
      expect(await store.load()).toEqual({ hostId, clientId });
      const stored = readFileSync(path.join(directory, 'registration.json'), 'utf8');
      expect(JSON.parse(stored)).toEqual({ version: 1, hostId, clientId });
      expect(stored).not.toMatch(/token|secret|subject|email|code/i);
      await expect(store.saveIssuedClientId(hostId, 'other-client')).rejects.toThrow('not be overwritten');
      expect(readFileSync(path.join(directory, 'registration.json'), 'utf8')).toBe(stored);
      await expect(store.prepareFirstRegistration()).rejects.toThrow('returning sign-in');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('leaves host-only state on cancellation and refuses malformed user config', async () => {
    const cancelled = temporaryStore();
    try {
      await cancelled.store.prepareFirstRegistration();
      const controller = new AbortController();
      controller.abort();
      await expect(cancelled.store.saveIssuedClientId(hostId, clientId, controller.signal)).rejects.toThrow('cancelled');
      expect(await cancelled.store.load()).toEqual({ hostId });
      expect(existsSync(path.join(cancelled.directory, 'registration.json'))).toBe(false);
    } finally {
      rmSync(cancelled.root, { recursive: true, force: true });
    }

    const malformed = temporaryStore();
    try {
      await malformed.store.prepareFirstRegistration();
      const hostPath = path.join(malformed.directory, 'host.json');
      writeFileSync(hostPath, JSON.stringify({ version: 1, hostId, accessToken: 'must-not-be-read' }));
      const before = readFileSync(hostPath, 'utf8');
      await expect(malformed.store.load()).rejects.toThrow('schema');
      await expect(malformed.store.prepareFirstRegistration()).rejects.toThrow('schema');
      expect(readFileSync(hostPath, 'utf8')).toBe(before);
    } finally {
      rmSync(malformed.root, { recursive: true, force: true });
    }
  });

  it('rejects a junction ancestor before creating anything through it', async () => {
    const root = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'agentforge-direct-junction-')));
    const outside = path.join(root, 'outside');
    const alias = path.join(root, 'alias');
    mkdirSync(outside);
    symlinkSync(outside, alias, process.platform === 'win32' ? 'junction' : 'dir');
    const escapedDirectory = path.join(outside, 'chatgpt-direct');
    const store = new FileChatGPTDirectRegistrationStore(path.join(alias, 'chatgpt-direct'), () => hostId);
    try {
      await expect(store.prepareFirstRegistration()).rejects.toThrow(/symlink|junction|real directory/);
      expect(existsSync(escapedDirectory)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
