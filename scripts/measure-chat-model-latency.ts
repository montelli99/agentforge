/** Small, repeatable chat-route diagnostic. Synthetic input; private results. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { MiMoModelProvider } from "../src/providers/models/mimoModel.js";

const provider = new MiMoModelProvider();
if (!(await provider.isAvailable())) throw new Error("MiMo route is not configured");
const privateDir = resolve(process.env.AGENTFORGE_RESEARCH_PRIVATE_DIR || resolve(process.env.LOCALAPPDATA || homedir(), "AgentForge", "research-private"));
const models = ["mimo-v2.5", "mimo-v2.5-pro"] as const;
const prompts = [
  "In one sentence, explain what an agent workspace does. Do not mention any real company.",
  "In two sentences, suggest a safe first step for a synthetic team that needs task approvals and a shared record. Do not claim you performed an action.",
] as const;
const results: Array<{ model: string; promptIndex: number; elapsedMs: number; status: "completed" | "failed"; promptTokens?: number; completionTokens?: number; finishReason?: string; outputCharacters?: number; errorClass?: string }> = [];
await mkdir(privateDir, { recursive: true });
const resultFile = resolve(privateDir, "chat-model-latency-20260930.json");
for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
  // Reverse model order on the second prompt to reduce simple order effects.
  const order = promptIndex === 0 ? models : [...models].reverse();
  for (const model of order) {
    const started = performance.now();
    try {
      const response = await provider.generate({ model, messages: [
        { role: "system", content: "You are a concise assistant. Answer only the synthetic request." },
        { role: "user", content: prompts[promptIndex] },
      ], temperature: 0, maxTokens: 400 });
      results.push({ model, promptIndex, elapsedMs: Math.round(performance.now() - started),
        status: response.content.trim() ? "completed" : "failed",
        promptTokens: response.usage.promptTokens, completionTokens: response.usage.completionTokens,
        finishReason: response.finishReason, outputCharacters: response.content.length });
    } catch (error) {
      results.push({ model, promptIndex, elapsedMs: Math.round(performance.now() - started),
        status: "failed", errorClass: error instanceof Error ? error.name : "unknown" });
    }
    await writeFile(resultFile, JSON.stringify({ schemaVersion: 1, kind: "synthetic-chat-latency-diagnostic", results }, null, 2));
    process.stdout.write(JSON.stringify(results.at(-1)) + "\n");
  }
}
