import crypto from "node:crypto";
import fs from "node:fs";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { ContextPacket } from "../../contextPacket.js";
import type { Task } from "../../core/types/task.js";
import { ExplicitIndexedMemory, type IndexedEmbeddingProvider } from "./explicitIndex.js";

const MODE = "original-index-continuous-synthetic-v1" as const;
const DEFAULT_SOURCE_BYTES = 1_048_576;
const DEFAULT_SNAPSHOT_BYTES = 1_048_576;
const MAX_SOURCES = 128;
const MAX_RECORDS = 256;

const sha256 = (value: string | Buffer) => crypto.createHash("sha256").update(value).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export interface ContinuousIndexedMemoryConfiguration {
  enabled: boolean;
  mode: typeof MODE;
  userId: string;
  projectId: string;
  sourceRoot: string;
  ownedRoot: string;
  inputFiles: readonly string[];
  maxSourceBytes?: number;
  maxSnapshotBytes?: number;
}

export interface ContinuousMemoryWatchEvent {
  source: string;
  kind: "change" | "delete";
}

export interface ContinuousMemoryWatcher {
  start(emit: (event: ContinuousMemoryWatchEvent) => void): void | Promise<void>;
  close(): void | Promise<void>;
}

interface ExtractedSource {
  sourceId: string;
  snapshotPath: string;
  content: string;
  digest: string;
}

interface ContinuousReceipt {
  operationId: string;
  operation: "continuous-reconcile";
  revision: number;
  priorRevision: number;
  snapshotDigest: string;
  atUtc: string;
  receiptDigest: string;
}

interface ContinuousState {
  schemaVersion: 1;
  mode: typeof MODE;
  identity: string;
  revision: number;
  snapshotDigest: string;
  sources: Record<string, { snapshotPath: string; digest: string }>;
  receipts: ContinuousReceipt[];
}

interface SyntheticRecord {
  id: string;
  title: string;
  text: string;
  visibility: "index" | "exclude";
}

const allowedDocumentKeys = new Set(["schemaVersion", "kind", "synthetic", "userId", "projectId", "records"]);
const allowedRecordKeys = new Set(["id", "title", "text", "visibility"]);

function assertExactKeys(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error(`${label} contains an unsupported field.`);
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max;
}

/**
 * Converts the deliberately narrow synthetic source schema into owned Markdown.
 * Only records explicitly marked `index` survive extraction. Excluded text is
 * never returned to the staging/index layer or included in error messages.
 */
export function extractSyntheticMemorySnapshot(
  raw: string,
  expected: { userId: string; projectId: string; sourceId: string },
): string | undefined {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Synthetic memory source is not valid JSON."); }
  if (!isRecord(parsed)) throw new Error("Synthetic memory source must be an object.");
  assertExactKeys(parsed, allowedDocumentKeys, "Synthetic memory source");
  if (parsed.schemaVersion !== 1 || parsed.kind !== "agentforge-synthetic-memory-v1" || parsed.synthetic !== true) {
    throw new Error("Synthetic memory source identity is invalid.");
  }
  if (parsed.userId !== expected.userId || parsed.projectId !== expected.projectId) {
    throw new Error("Synthetic memory source user/project boundary mismatch.");
  }
  if (!Array.isArray(parsed.records) || parsed.records.length > MAX_RECORDS) {
    throw new Error("Synthetic memory source records are invalid or exceed bounds.");
  }
  const ids = new Set<string>();
  const selected: SyntheticRecord[] = [];
  for (const candidate of parsed.records) {
    if (!isRecord(candidate)) throw new Error("Synthetic memory record must be an object.");
    assertExactKeys(candidate, allowedRecordKeys, "Synthetic memory record");
    if (!boundedString(candidate.id, 1, 80) || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(candidate.id)
      || !boundedString(candidate.title, 1, 200) || !boundedString(candidate.text, 1, 16_384)
      || (candidate.visibility !== "index" && candidate.visibility !== "exclude")) {
      throw new Error("Synthetic memory record fields are invalid or exceed bounds.");
    }
    if (ids.has(candidate.id)) throw new Error("Synthetic memory record IDs must be unique.");
    ids.add(candidate.id);
    if (candidate.visibility === "index") selected.push(candidate as unknown as SyntheticRecord);
  }
  if (selected.length === 0) return undefined;
  const lines = selected.map(record => JSON.stringify({
    sourceId: expected.sourceId,
    recordId: record.id,
    title: record.title,
    text: record.text,
  }));
  return `# AgentForge synthetic memory snapshot\n${lines.join("\n")}\n`;
}

function assertPositiveBound(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1 || resolved > 16 * 1024 * 1024) throw new Error(`${label} is invalid.`);
  return resolved;
}

function relativeFile(root: string, value: string, suffix: string): string {
  if (!value || path.isAbsolute(value) || !value.endsWith(suffix) || value.includes("\\")) throw new Error("Continuous memory inputs must be relative JSON files.");
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.split("/").includes("..")) {
    throw new Error("Continuous memory input escapes the explicit source root.");
  }
  const absolute = path.resolve(root, ...value.split("/"));
  const rel = path.relative(root, absolute);
  if (rel === "" || rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error("Continuous memory input escapes the explicit source root.");
  return absolute;
}

function containsPath(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel));
}

function assertNoLinkedSegments(target: string, allowMissingTail: boolean): void {
  const parsed = path.parse(target);
  let current = parsed.root;
  for (const segment of target.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (allowMissingTail && (error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) throw new Error("Continuous memory link boundary rejected.");
  }
}

async function atomicWrite(filename: string, content: string | Buffer): Promise<void> {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const handle = await open(temporary, "wx");
  try { await handle.writeFile(content); await handle.sync(); }
  finally { await handle.close(); }
  try { await rename(temporary, filename); }
  catch (error) { await rm(temporary, { force: true }); throw error; }
}

function abortError(): Error {
  const error = new Error("Continuous memory lifecycle cancelled.");
  error.name = "AbortError";
  return error;
}

/**
 * First continuous-memory milestone. It watches only caller-declared synthetic
 * JSON files, stages field-allowlisted Markdown in an AgentForge-owned root,
 * and feeds the existing explicit index. It never discovers sessions, follows
 * links, selects credentials/providers, or grants execution authority.
 */
export class ContinuousIndexedMemoryLifecycle {
  private readonly sourceRoot: string;
  private readonly ownedRoot: string;
  private readonly sourceFiles: readonly string[];
  private readonly snapshotBySource = new Map<string, string>();
  private readonly identity: string;
  private readonly maxSourceBytes: number;
  private readonly maxSnapshotBytes: number;
  private readonly abortController = new AbortController();
  private index?: ExplicitIndexedMemory;
  private queue: Promise<void> = Promise.resolve();
  private running = false;
  private watcherStarted = false;
  private closed = false;
  private lastError?: Error;
  private lastState?: ContinuousState;
  private watchPending = false;
  private watchDirty = false;

  constructor(
    readonly config: ContinuousIndexedMemoryConfiguration,
    private readonly provider: IndexedEmbeddingProvider,
    private readonly watcher?: ContinuousMemoryWatcher,
  ) {
    if (config.mode !== MODE || typeof config.enabled !== "boolean" || !config.userId?.trim() || !config.projectId?.trim()) {
      throw new Error("Continuous memory configuration identity is invalid.");
    }
    if (!path.isAbsolute(config.sourceRoot) || !path.isAbsolute(config.ownedRoot)) throw new Error("Continuous memory roots must be explicit absolute paths.");
    this.sourceRoot = path.resolve(config.sourceRoot);
    this.ownedRoot = path.resolve(config.ownedRoot);
    if (containsPath(this.sourceRoot, this.ownedRoot) || containsPath(this.ownedRoot, this.sourceRoot)) {
      throw new Error("Continuous memory source and owned roots must be disjoint.");
    }
    if (!Array.isArray(config.inputFiles) || config.inputFiles.length > MAX_SOURCES || new Set(config.inputFiles).size !== config.inputFiles.length) {
      throw new Error("Continuous memory input allowlist is invalid.");
    }
    this.sourceFiles = [...config.inputFiles];
    for (const source of this.sourceFiles) {
      relativeFile(this.sourceRoot, source, ".json");
      this.snapshotBySource.set(source, `snapshots/${sha256(source).slice(0, 32)}.md`);
    }
    this.maxSourceBytes = assertPositiveBound(config.maxSourceBytes, DEFAULT_SOURCE_BYTES, "Continuous memory source byte limit");
    this.maxSnapshotBytes = assertPositiveBound(config.maxSnapshotBytes, DEFAULT_SNAPSHOT_BYTES, "Continuous memory snapshot byte limit");
    if (!provider?.identity?.trim() || !Number.isSafeInteger(provider.dimensions) || provider.dimensions < 1 || typeof provider.embed !== "function") {
      throw new Error("Continuous memory embedding profile is invalid.");
    }
    this.identity = sha256(JSON.stringify({
      mode: MODE,
      userId: config.userId,
      projectId: config.projectId,
      sourceRoot: this.sourceRoot,
      ownedRoot: this.ownedRoot,
      inputFiles: [...this.sourceFiles].sort(),
      provider: provider.identity,
      dimensions: provider.dimensions,
    }));
  }

  async start(): Promise<void> {
    if (this.closed) throw new Error("Continuous memory lifecycle is closed.");
    if (this.running || !this.config.enabled) return;
    if (!this.watcher) throw new Error("Enabled continuous memory requires an injected watcher.");
    assertNoLinkedSegments(this.sourceRoot, false);
    if (!fs.statSync(this.sourceRoot).isDirectory()) throw new Error("Continuous memory source root must be a directory.");
    assertNoLinkedSegments(path.dirname(this.ownedRoot), false);
    assertNoLinkedSegments(this.ownedRoot, true);
    await mkdir(path.join(this.ownedRoot, "snapshots"), { recursive: true });
    assertNoLinkedSegments(this.ownedRoot, false);
    const snapshots = [...this.snapshotBySource.values()];
    this.index = new ExplicitIndexedMemory({
      userId: sha256(JSON.stringify([this.config.userId, this.config.projectId])),
      projectRoot: this.ownedRoot,
      indexPath: path.join(this.ownedRoot, "continuous-index.sqlite"),
      inputFiles: snapshots,
      provider: this.provider,
    });
    let restored: ContinuousState | undefined;
    try { restored = this.readState(); }
    catch { this.index.close(); this.index = undefined; throw new Error('Continuous memory durable state is invalid.'); }
    if (!restored && this.index.documentCount() > 0) {
      this.index.close(); this.index = undefined;
      throw new Error("Continuous memory refuses an unmanaged existing index.");
    }
    this.lastState = restored;
    this.running = true;
    try {
      await this.watcher.start(event => { this.onWatch(event); });
      this.watcherStarted = true;
      await this.rescan();
    } catch (error) {
      this.running = false;
      if (this.watcherStarted) await Promise.resolve(this.watcher.close()).catch(() => undefined);
      this.watcherStarted = false;
      this.index?.close(); this.index = undefined;
      throw error;
    }
  }

  private readState(): ContinuousState | undefined {
    const raw = this.index?.lifecycleState();
    if (!raw) return undefined;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("Continuous memory durable state is invalid."); }
    if (!isRecord(parsed) || parsed.schemaVersion !== 1 || parsed.mode !== MODE || parsed.identity !== this.identity
      || !Number.isSafeInteger(parsed.revision) || (parsed.revision as number) < 0 || typeof parsed.snapshotDigest !== "string"
      || !isRecord(parsed.sources) || !Array.isArray(parsed.receipts)) {
      throw new Error("Continuous memory durable identity/state mismatch.");
    }
    const digests = /^[a-f0-9]{64}$/u;
    const approved = new Map(this.sourceFiles.map(source => [sha256(source), this.snapshotBySource.get(source)!]));
    if (!digests.test(parsed.snapshotDigest) || Object.keys(parsed.sources).length > MAX_SOURCES
      || parsed.receipts.length > 128 || parsed.receipts.length === 0) throw new Error("Continuous memory durable state is invalid.");
    for (const [id, value] of Object.entries(parsed.sources)) {
      if (!isRecord(value) || value.snapshotPath !== approved.get(id) || typeof value.digest !== 'string'
        || !digests.test(value.digest) || Object.keys(value).length !== 2) throw new Error("Continuous memory durable sources are invalid.");
    }
    if (sha256(JSON.stringify(parsed.sources)) !== parsed.snapshotDigest) throw new Error("Continuous memory durable source digest mismatch.");
    let previous: number | undefined;
    for (const receipt of parsed.receipts) {
      if (!isRecord(receipt) || receipt.operation !== 'continuous-reconcile' || !Number.isSafeInteger(receipt.revision)
        || (receipt.revision as number) < 1 || receipt.priorRevision !== (receipt.revision as number) - 1
        || (previous !== undefined && receipt.priorRevision !== previous)
        || typeof receipt.snapshotDigest !== 'string' || !digests.test(receipt.snapshotDigest)
        || typeof receipt.atUtc !== 'string' || !Number.isFinite(Date.parse(receipt.atUtc))) throw new Error("Continuous memory durable receipt is invalid.");
      const base = { operationId: receipt.operationId, operation: receipt.operation, revision: receipt.revision,
        priorRevision: receipt.priorRevision, snapshotDigest: receipt.snapshotDigest, atUtc: receipt.atUtc };
      if (receipt.operationId !== `continuous-${receipt.revision}-${receipt.snapshotDigest.slice(0, 24)}`
        || receipt.receiptDigest !== sha256(JSON.stringify(base))) throw new Error("Continuous memory durable receipt digest mismatch.");
      previous = receipt.revision as number;
    }
    if (previous !== parsed.revision || parsed.receipts.at(-1)?.snapshotDigest !== parsed.snapshotDigest) throw new Error("Continuous memory durable revision mismatch.");
    return parsed as unknown as ContinuousState;
  }

  private onWatch(event: ContinuousMemoryWatchEvent): void {
    if (!this.running || this.closed) return;
    if (!this.snapshotBySource.has(event.source) || !['change', 'delete'].includes(event.kind)) {
      this.lastError = new Error('Continuous memory watcher emitted an unapproved source event.');
      return;
    }
    this.watchDirty = true;
    if (this.watchPending) return;
    this.watchPending = true;
    void (async () => {
      try {
        while (this.watchDirty && this.running) {
          this.watchDirty = false;
          await this.schedule();
        }
      } catch { /* schedule records a sanitized failure; never leak an unhandled rejection. */ }
      finally { this.watchPending = false; }
    })();
  }

  private async readSource(source: string): Promise<string | undefined> {
    const filename = relativeFile(this.sourceRoot, source, ".json");
    assertNoLinkedSegments(path.dirname(filename), false);
    if (!fs.existsSync(filename)) return undefined;
    assertNoLinkedSegments(filename, false);
    const expected = fs.lstatSync(filename);
    const handle = await open(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
      const before = await handle.stat();
      if (!before.isFile() || before.nlink !== 1 || before.size > this.maxSourceBytes
        || expected.dev !== before.dev || expected.ino !== before.ino) throw new Error("Continuous memory source must be a bounded regular file.");
      const content = await handle.readFile();
      const after = await handle.stat();
      assertNoLinkedSegments(filename, false);
      const named = fs.lstatSync(filename);
      if (named.dev !== before.dev || named.ino !== before.ino || after.nlink !== 1
        || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
        throw new Error("Continuous memory source changed during extraction.");
      }
      return new TextDecoder("utf-8", { fatal: true }).decode(content);
    } catch (error) {
      if (error instanceof TypeError) throw new Error("Continuous memory source is not valid UTF-8.");
      throw error;
    } finally { await handle.close(); }
  }

  private async extractSources(): Promise<Map<string, ExtractedSource>> {
    const extracted = new Map<string, ExtractedSource>();
    const observed = new Map<string, string | undefined>();
    for (const source of this.sourceFiles) {
      if (this.abortController.signal.aborted) throw abortError();
      const raw = await this.readSource(source);
      observed.set(source, raw);
      if (raw === undefined) continue;
      const sourceId = sha256(source);
      const content = extractSyntheticMemorySnapshot(raw, {
        userId: this.config.userId,
        projectId: this.config.projectId,
        sourceId,
      });
      if (content === undefined) continue;
      if (Buffer.byteLength(content) > this.maxSnapshotBytes) throw new Error("Continuous memory sanitized snapshot exceeds bounds.");
      const snapshotPath = this.snapshotBySource.get(source)!;
      extracted.set(source, { sourceId, snapshotPath, content, digest: sha256(content) });
    }
    // Reject a cohort that changed while the first pass was being extracted.
    for (const source of this.sourceFiles) {
      if (await this.readSource(source) !== observed.get(source)) throw new Error('Continuous memory source cohort changed during extraction.');
    }
    return extracted;
  }

  private schedule(event?: ContinuousMemoryWatchEvent): Promise<void> {
    if (!this.running || this.abortController.signal.aborted) return Promise.resolve();
    const task = this.queue.then(async () => {
      if (event && (!this.snapshotBySource.has(event.source) || (event.kind !== "change" && event.kind !== "delete"))) {
        throw new Error("Continuous memory watcher emitted an unapproved source event.");
      }
      await this.reconcile();
      this.lastError = undefined;
    });
    const safe = task.catch(() => { throw new Error("Continuous memory reconciliation failed."); });
    this.queue = safe.catch(error => { this.lastError = error; });
    return safe;
  }

  async rescan(): Promise<void> {
    if (!this.config.enabled) throw new Error("Continuous memory lifecycle is disabled.");
    if (!this.running) throw new Error("Continuous memory lifecycle is not running.");
    await this.schedule();
  }

  async whenIdle(): Promise<void> {
    await this.queue;
    if (this.lastError) throw this.lastError;
  }

  private async reconcile(control?: {operationId: string; expectedRevision: number}): Promise<void> {
    const index = this.index;
    if (!index) throw new Error("Continuous memory index is unavailable.");
    if (this.abortController.signal.aborted) throw abortError();
    const extracted = await this.extractSources();
    const nextSources = Object.fromEntries([...extracted.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId))
      .map(source => [source.sourceId, { snapshotPath: source.snapshotPath, digest: source.digest }]));
    const snapshotDigest = sha256(JSON.stringify(nextSources));
    const current = this.readState();
    // Snapshots are a recoverable staging cache, not a committed generation.
    // Always rebuild before serving after restart/rescan: a crash may have
    // replaced them before SQLite committed, or index rows may be missing.
    const revision = (current?.revision ?? 0) + 1;
    const receiptBase = {
      operationId: `continuous-${revision}-${snapshotDigest.slice(0, 24)}`,
      operation: "continuous-reconcile" as const,
      revision,
      priorRevision: current?.revision ?? 0,
      snapshotDigest,
      atUtc: new Date().toISOString(),
    };
    const receipt: ContinuousReceipt = { ...receiptBase, receiptDigest: sha256(JSON.stringify(receiptBase)) };
    const next: ContinuousState = current?.snapshotDigest === snapshotDigest ? current : {
      schemaVersion: 1,
      mode: MODE,
      identity: this.identity,
      revision,
      snapshotDigest,
      sources: nextSources,
      receipts: [...(current?.receipts ?? []), receipt].slice(-128),
    };
    const backups = new Map<string, Buffer | undefined>();
    const allSnapshots = [...this.snapshotBySource.values()];
    for (const snapshot of allSnapshots) {
      const filename = path.join(this.ownedRoot, ...snapshot.split("/"));
      backups.set(filename, await readFile(filename).catch(error => (error as NodeJS.ErrnoException).code === "ENOENT" ? undefined : Promise.reject(error)));
    }
    try {
      for (const snapshot of allSnapshots) {
        const filename = path.join(this.ownedRoot, ...snapshot.split("/"));
        const candidate = [...extracted.values()].find(item => item.snapshotPath === snapshot);
        if (candidate) await atomicWrite(filename, candidate.content);
        else await rm(filename, { force: true });
      }
      if (this.abortController.signal.aborted) throw abortError();
      await index.sync([...extracted.values()].map(source => source.snapshotPath).sort(), () => {
        // Evaluated inside SQLite's write transaction, after asynchronous embedding.
        if (JSON.stringify(this.readState()) !== JSON.stringify(current)) throw new Error('Stale continuous memory revision.');
        return JSON.stringify(next);
      }, control ? {operationId: control.operationId, receipt: JSON.stringify({
        operationId: control.operationId, operation: 'rescan', expectedRevision: control.expectedRevision,
        revision: next.revision, snapshotDigest: next.snapshotDigest,
        receiptDigest: next.receipts.at(-1)!.receiptDigest,
      })} : undefined);
      this.lastState = next;
    } catch (error) {
      for (const [filename, backup] of backups) {
        if (backup === undefined) await rm(filename, { force: true });
        else await atomicWrite(filename, backup);
      }
      throw error;
    }
  }

  private async ready(): Promise<ExplicitIndexedMemory> {
    if (!this.config.enabled) throw new Error("Continuous memory lifecycle is disabled.");
    if (!this.running || !this.index) throw new Error("Continuous memory lifecycle is not running.");
    await this.whenIdle();
    return this.index;
  }

  status() {
    return {
      mode: MODE,
      enabled: this.config.enabled,
      running: this.running,
      projectId: this.config.projectId,
      revision: this.lastState?.revision ?? 0,
      snapshotDigest: this.lastState?.snapshotDigest ?? null,
      indexedSourceCount: Object.keys(this.lastState?.sources ?? {}).length,
      configuredSourceCount: this.sourceFiles.length,
      receipts: this.lastState?.receipts ?? [],
      automaticDiscovery: false,
      syntheticOnly: true,
      sourceWrites: false,
      lastError: this.lastError ? "reconciliation_failed" : null,
    };
  }

  async control(body: { operation: string; operationId: string; expectedRevision: number }): Promise<unknown> {
    if (body.operation !== "rescan" || !/^[a-zA-Z0-9_-]{1,80}$/u.test(body.operationId)
      || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) throw new Error("Continuous memory accepts only explicit rescan control.");
    if (!this.running || !this.index) throw new Error('Continuous memory lifecycle is not running.');
    const task = this.queue.then(async () => {
      const previous = this.index!.controlReceipt(body.operationId);
      if (previous) {
        const receipt = JSON.parse(previous) as { expectedRevision: number };
        if (receipt.expectedRevision !== body.expectedRevision) throw new Error('Control operation identity conflict.');
        return receipt;
      }
      if (body.expectedRevision !== (this.readState()?.revision ?? 0)) throw new Error('Stale continuous memory revision.');
      await this.reconcile(body);
      this.lastError = undefined;
      return JSON.parse(this.index!.controlReceipt(body.operationId)!);
    }).catch(() => { throw new Error('Continuous memory control failed.'); });
    this.queue = task.then(() => undefined, error => { this.lastError = error; });
    return task;
  }

  async query(query: string) {
    return (await this.ready()).search(query);
  }

  async planningContext(task: Task): Promise<ContextPacket> {
    if (task.projectId !== this.config.projectId) throw new Error("Task outside configured continuous-memory project.");
    return (await this.ready()).planningContext(task.description);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.running = false;
    this.abortController.abort();
    let closeError: unknown;
    try { if (this.watcherStarted) await this.watcher?.close(); } catch (error) { closeError = error; }
    this.watcherStarted = false;
    await this.queue;
    this.index?.close(); this.index = undefined;
    if (closeError) throw closeError;
  }
}
