import { randomUUID } from 'node:crypto';
import { constants, promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const HOST_FILE = 'host.json';
const REGISTRATION_FILE = 'registration.json';
const MAX_FILE_BYTES = 4096;
const uuidHostPattern = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clientIdPattern = /^[A-Za-z0-9_-]{1,256}$/;

export interface ChatGPTDirectRegistrationState {
  hostId: string;
  clientId?: string;
}

export interface ChatGPTDirectRegistrationStore {
  load(): Promise<ChatGPTDirectRegistrationState | undefined>;
  prepareFirstRegistration(signal?: AbortSignal): Promise<{ hostId: string }>;
  saveIssuedClientId(hostId: string, clientId: string, signal?: AbortSignal): Promise<void>;
}

function validHostId(value: unknown): value is string {
  return typeof value === 'string' && uuidHostPattern.test(value);
}

function validClientId(value: unknown): value is string {
  return typeof value === 'string' && value !== 'dynamic_agent_client' && clientIdPattern.test(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function samePath(left: string, right: string): boolean {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

export function getDefaultChatGPTDirectRegistrationDirectory(
  env: Readonly<Record<string, string | undefined>> = process.env,
  userHome = homedir(),
): string {
  const explicit = env.AGENTFORGE_DATA_DIR?.trim();
  if (explicit && !path.isAbsolute(explicit)) throw Error('AGENTFORGE_DATA_DIR must be absolute for direct registration.');
  const localAppData = env.LOCALAPPDATA?.trim();
  const dataRoot = explicit ?? (localAppData ? path.join(localAppData, '.agentforge') : path.join(userHome, '.agentforge'));
  if (!path.isAbsolute(dataRoot)) throw Error('Direct registration data directory must be absolute.');
  return path.join(path.resolve(dataRoot), 'chatgpt-direct');
}

/** Stores only the stable host ID and callback-issued client ID. Tokens and
 * account attributes are deliberately outside this store. Files are created
 * exclusively and never overwritten. */
export class FileChatGPTDirectRegistrationStore implements ChatGPTDirectRegistrationStore {
  readonly directory: string;
  private readonly hostPath: string;
  private readonly registrationPath: string;

  constructor(directory: string, private readonly createHostId: () => string = () => `urn:uuid:${randomUUID()}`) {
    if (!directory || !path.isAbsolute(directory) || path.basename(path.resolve(directory)) !== 'chatgpt-direct'
      || /(^|[\\/])\.\.?([\\/]|$)/.test(directory) || /[\x00-\x1f\x7f]/.test(directory)) {
      throw Error('Direct registration directory must be a normalized absolute path.');
    }
    this.directory = path.resolve(directory);
    this.hostPath = path.join(this.directory, HOST_FILE);
    this.registrationPath = path.join(this.directory, REGISTRATION_FILE);
  }

  async load(): Promise<ChatGPTDirectRegistrationState | undefined> {
    await this.ensureSafeDirectory(false);
    const host = await this.readHost();
    const registration = await this.readRegistration();
    if (!host && registration) throw Error('Direct registration is missing its host record.');
    if (!host) return undefined;
    if (registration && registration.hostId !== host.hostId) throw Error('Direct registration host mismatch.');
    return Object.freeze({ hostId: host.hostId, ...(registration ? { clientId: registration.clientId } : {}) });
  }

  async prepareFirstRegistration(signal?: AbortSignal): Promise<{ hostId: string }> {
    if (signal?.aborted) throw Error('Direct registration cancelled.');
    await this.ensureSafeDirectory(true);
    const current = await this.load();
    if (current?.clientId) throw Error('Direct registration already exists; use returning sign-in.');
    if (current) return { hostId: current.hostId };
    const hostId = this.createHostId();
    if (!validHostId(hostId)) throw Error('Generated direct host ID is invalid.');
    try {
      await this.atomicCreate(this.hostPath, { version: 1, hostId }, signal);
      return { hostId };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const raced = await this.load();
      if (!raced || raced.clientId) throw Error('Direct registration state changed concurrently.');
      return { hostId: raced.hostId };
    }
  }

  async saveIssuedClientId(hostId: string, clientId: string, signal?: AbortSignal): Promise<void> {
    if (!validHostId(hostId) || !validClientId(clientId)) throw Error('Issued direct registration identifiers are invalid.');
    if (signal?.aborted) throw Error('Direct registration cancelled.');
    const current = await this.load();
    if (!current || current.hostId !== hostId) throw Error('Direct registration host is missing or changed.');
    if (current.clientId) throw Error('Direct registration already exists and will not be overwritten.');
    try {
      await this.atomicCreate(this.registrationPath, { version: 1, hostId, clientId }, signal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw Error('Direct registration already exists and will not be overwritten.');
      throw error;
    }
  }

  private async ensureSafeDirectory(create: boolean): Promise<void> {
    const root = path.parse(this.directory).root;
    const relative = path.relative(root, this.directory);
    if (!root || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Direct registration directory is outside its filesystem root.');
    let current = path.resolve(root);
    if (!await this.validateExistingDirectory(current)) throw Error('Direct registration filesystem root is missing.');
    for (const segment of relative.split(path.sep).filter(Boolean)) {
      const next = path.join(current, segment);
      if (await this.validateExistingDirectory(next)) {
        current = next;
        continue;
      }
      if (!create) return;
      // Revalidate the canonical parent immediately before each non-recursive
      // mkdir. A pre-existing symlink/junction is rejected before any child can
      // be created through it, and every newly created component is checked
      // before construction continues.
      if (!await this.validateExistingDirectory(current)) throw Error('Direct registration parent changed during creation.');
      try { await fs.mkdir(next, { recursive: false, mode: 0o700 }); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      if (!await this.validateExistingDirectory(next)) throw Error('Direct registration path component is unsafe.');
      current = next;
    }
  }

  private async validateExistingDirectory(directory: string): Promise<boolean> {
    let stat;
    try { stat = await fs.lstat(directory); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Direct registration directory must be a real directory.');
    const real = await fs.realpath(directory);
    if (!samePath(path.resolve(real), path.resolve(directory))) {
      throw Error('Direct registration directory cannot use a symlink or junction.');
    }
    return true;
  }

  private async readHost(): Promise<{ hostId: string } | undefined> {
    const parsed = await this.readJson(this.hostPath);
    if (parsed === undefined) return undefined;
    if (!exactKeys(parsed, ['hostId', 'version']) || parsed.version !== 1 || !validHostId(parsed.hostId)) {
      throw Error('Direct host record has an unsupported or malformed schema.');
    }
    return { hostId: parsed.hostId };
  }

  private async readRegistration(): Promise<{ hostId: string; clientId: string } | undefined> {
    const parsed = await this.readJson(this.registrationPath);
    if (parsed === undefined) return undefined;
    if (!exactKeys(parsed, ['clientId', 'hostId', 'version']) || parsed.version !== 1
      || !validHostId(parsed.hostId) || !validClientId(parsed.clientId)) {
      throw Error('Direct registration record has an unsupported or malformed schema.');
    }
    return { hostId: parsed.hostId, clientId: parsed.clientId };
  }

  private async readJson(filePath: string): Promise<Record<string, unknown> | undefined> {
    let before;
    try { before = await fs.lstat(filePath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
    if (!before.isFile() || before.isSymbolicLink() || before.size < 2 || before.size > MAX_FILE_BYTES) {
      throw Error('Direct registration file must be a bounded regular file.');
    }
    const real = await fs.realpath(filePath);
    if (!samePath(path.dirname(real), this.directory) || !samePath(real, filePath)) {
      throw Error('Direct registration file cannot use a symlink or path substitution.');
    }
    const handle = await fs.open(filePath, constants.O_RDONLY);
    try {
      const opened = await handle.stat();
      if (!opened.isFile() || opened.size !== before.size) throw Error('Direct registration file changed while opening.');
      const text = await handle.readFile({ encoding: 'utf8' });
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Direct registration JSON must be an object.');
      return parsed as Record<string, unknown>;
    } finally {
      await handle.close();
    }
  }

  private async atomicCreate(filePath: string, value: Record<string, unknown>, signal?: AbortSignal): Promise<void> {
    await this.ensureSafeDirectory(true);
    const temporary = path.join(this.directory, `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await fs.open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      await handle.writeFile(`${JSON.stringify(value)}\n`, { encoding: 'utf8' });
      await handle.sync();
      await handle.close();
      handle = undefined;
      if (signal?.aborted) throw Error('Direct registration cancelled.');
      // Linking a completed temporary file creates the destination atomically
      // and fails rather than replacing any existing user configuration.
      await fs.link(temporary, filePath);
    } finally {
      if (handle) await handle.close().catch(() => undefined);
      await fs.unlink(temporary).catch(() => undefined);
    }
  }
}
