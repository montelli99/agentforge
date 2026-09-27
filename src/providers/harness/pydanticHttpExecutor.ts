import type { HarnessSession, HarnessTaskPayload } from "../../core/providers/harness.js";

export type PydanticHttpExecutorOptions = {
  endpoint: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/** Minimal provider-neutral HTTP contract for a separately deployed Pydantic AI service. */
export class PydanticHttpExecutor {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: PydanticHttpExecutorOptions) {
    let parsed: URL;
    try { parsed = new URL(options.endpoint); } catch { throw new Error("Pydantic endpoint is invalid."); }
    const loopback = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) throw new Error("Pydantic endpoint requires HTTPS unless it is loopback.");
    this.endpoint = parsed.toString();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = Math.max(1_000, options.timeoutMs ?? 120_000);
    this.apiKey = options.apiKey;
  }
  private readonly apiKey?: string;

  async executeTask(input: { session: HarnessSession; task: HarnessTaskPayload }): Promise<{ output: string; tokensUsed?: { prompt: number; completion: number; total: number } }> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify({ sessionId: input.session.sessionId, taskId: input.task.taskId, instruction: input.task.instruction, context: input.task.context ?? {} }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`Pydantic service failed with HTTP ${response.status}.`);
    const payload = await response.json() as { output?: unknown; usage?: { input?: number; output?: number } };
    if (typeof payload.output !== "string") throw new Error("Pydantic service returned no textual output.");
    const prompt = payload.usage?.input ?? 0;
    const completion = payload.usage?.output ?? 0;
    return { output: payload.output, ...(payload.usage ? { tokensUsed: { prompt, completion, total: prompt + completion } } : {}) };
  }
}
