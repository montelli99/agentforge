import fs from "node:fs";
import path from "node:path";
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
    if (!fs.existsSync(this.filePath)) return [];
    const parsed: unknown = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) ||
        parsed.version !== 1 || !("sessions" in parsed) || !Array.isArray(parsed.sessions)) {
      throw new Error("Completion session store has an unsupported or malformed format");
    }
    return structuredClone(parsed.sessions) as SubstantialTaskSession[];
  }

  save(session: SubstantialTaskSession): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const sessions = new Map(this.loadAll().map(existing => [existing.taskId, existing]));
    sessions.set(session.taskId, structuredClone(session));
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify({ version: 1, sessions: [...sessions.values()] }), { flag: "wx" });
      fs.renameSync(temporaryPath, this.filePath);
    } finally {
      if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
    }
  }
}
