import fs, { type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Synthetic evaluation evidence only. No implicit retry or resume of model calls. */
export class DurableEvaluationJournal {
  private constructor(private readonly output: string, private readonly events: FileHandle) {}
  static async create(output: string) {
    if (!path.isAbsolute(output)) throw Error('Evaluation output must be absolute');
    const events = await fs.open(`${output}.events.jsonl`, 'wx', 0o600);
    try {
      const snapshot = await fs.open(output, 'wx', 0o600);
      await snapshot.close();
      return new DurableEvaluationJournal(output, events);
    } catch (error) { await events.close(); throw error; }
  }
  async checkpoint(event: unknown, report: unknown) {
    // The append-only event is durable before the report or next provider request.
    await this.events.writeFile(JSON.stringify(event) + '\n');
    await this.events.sync();
    const temporary = `${this.output}.${randomUUID()}.tmp`;
    const file = await fs.open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(JSON.stringify(report, null, 2));
      await file.sync();
    } finally { await file.close(); }
    // Same-directory rename preserves the previous report until replacement.
    // Failed replacements leave the journal and temporary evidence available.
    await fs.rename(temporary, this.output);
  }
  async close() { await this.events.close(); }
}
