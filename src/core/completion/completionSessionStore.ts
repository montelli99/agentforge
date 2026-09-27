import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { SubstantialTaskSession } from "./completionEngine.js";

export interface CompletionSessionStore {
  loadAll(): SubstantialTaskSession[];
  save(session: SubstantialTaskSession): void;
}

/** Small local JSON repository; callers choose the data directory and own its access controls. */
export class JsonCompletionSessionStore implements CompletionSessionStore {
  constructor(private readonly filePath: string) {
    if (!path.isAbsolute(filePath)) throw new Error("Completion session store path must be absolute");
  }

  loadAll(): SubstantialTaskSession[] {
    const candidates = [this.filePath, `${this.filePath}.bak`];
    const errors: string[] = [];
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      try {
        return this.readSessions(candidate);
      } catch (error) {
        errors.push(`${path.basename(candidate)}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!errors.length) return [];
    throw new Error(`Completion session store has no recoverable snapshot. ${errors.join("; ")}`);
  }

  save(session: SubstantialTaskSession): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    this.withWriteLock(() => {
      // Read only after the cross-process lock is held. Otherwise two launcher
      // processes can both read the same session set and silently drop one
      // another's newly created goal when they rename their snapshots.
      const sessions = new Map(this.loadAll().map(existing => [existing.taskId, existing]));
      sessions.set(session.taskId, structuredClone(session));
      const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
      try {
        fs.writeFileSync(temporaryPath, JSON.stringify({ version: 1, sessions: [...sessions.values()] }), { flag: "wx" });
        if (fs.existsSync(this.filePath)) {
          // Never replace the known-good backup with a damaged primary. If this
          // store was restored from .bak, the next successful rename repairs the
          // primary while the prior backup remains recoverable.
          try {
            this.readSessions(this.filePath);
            fs.copyFileSync(this.filePath, `${this.filePath}.bak`);
          } catch {
            // The readable backup supplied the session set above.
          }
        }
        fs.renameSync(temporaryPath, this.filePath);
      } finally {
        if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
      }
    });
  }

  private readSessions(filePath: string): SubstantialTaskSession[] {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) ||
        parsed.version !== 1 || !("sessions" in parsed) || !Array.isArray(parsed.sessions)) {
      throw new Error("unsupported or malformed format");
    }
    return structuredClone(parsed.sessions) as SubstantialTaskSession[];
  }

  private withWriteLock(write: () => void): void {
    const lockPath = `${this.filePath}.lock`;
    const waitBuffer = new Int32Array(new SharedArrayBuffer(4));
    let lockHandle: number | undefined;
    try {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
          lockHandle = fs.openSync(lockPath, "wx");
          fs.writeSync(lockHandle, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          try {
            if (Date.now() - fs.statSync(lockPath).mtimeMs > 30_000) fs.unlinkSync(lockPath);
          } catch {
            // A competing process may have released the lock while it was checked.
          }
          Atomics.wait(waitBuffer, 0, 0, 10);
        }
      }
      if (lockHandle === undefined) throw new Error("Timed out waiting for the completion session store lock.");
      write();
    } finally {
      if (lockHandle !== undefined) {
        try { fs.closeSync(lockHandle); } catch { /* preserve write result */ }
        try { fs.unlinkSync(lockPath); } catch { /* stale-lock recovery may have removed it */ }
      }
    }
  }
}
