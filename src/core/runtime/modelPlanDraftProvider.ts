import type { GenerativeModelProvider } from "../providers/model.js";
import type { Task } from "../types/task.js";
import type { ApprovedExecutionPlan, ExecutionPlanProvider } from "./contractedDockerExecutionBackend.js";

/**
 * Produces a reviewable plan draft from a connected model. It deliberately
 * never marks the plan human-approved; an operator must approve the returned
 * draft before the execution backend can run it.
 */
export class ModelPlanDraftProvider implements ExecutionPlanProvider {
  constructor(private readonly model: GenerativeModelProvider, private readonly modelName: string,
    private readonly sandboxTools: readonly string[] = []) {}

  getReadiness(): { ready: boolean; blocker?: string } {
    return { ready: true };
  }

  async draft(task: Task, signal?: AbortSignal): Promise<ApprovedExecutionPlan> {
    const response = await this.model.generate({
      model: this.modelName,
      messages: [{ role: "system", content: "Return JSON only: {commands:[{checkName,command,timeoutMs}]}. Propose commands that complete the requested deliverables, not commands that only inspect input files. When the task names an output file or state change, include a bounded command that creates any missing parent directory, writes the output, and verifies the requested content. A command that redirects into a nonexistent directory fails. Use POSIX sh and the listed sandbox tools; prefer Node.js for JSON when node is listed. Do not assume jq, Python, or network utilities are installed unless explicitly listed. Follow with every required check. For each required check, copy its type exactly into checkName and copy its command exactly when one is supplied. Keep all commands within the supplied task boundaries. Never add destructive or network commands." }, { role: "user", content: JSON.stringify({ id: task.id, title: task.title, description: task.description,
        scope: task.contract.scope, authority: task.contract.authority,
        requiredArtifacts: task.contract.completion?.requiredArtifacts, checks: task.contract.requiredChecks,
        sandboxTools: this.sandboxTools }) }],
      responseFormat: "json",
      thinking: "disabled",
      temperature: 0,
      signal,
    });
    let parsed: unknown;
    const content = response.content.trim();
    const fenced = /^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/.exec(content);
    try { parsed = JSON.parse(fenced ? fenced[1] : content); } catch { throw new Error("Model returned an invalid execution-plan draft."); }
    const commands = (parsed as { commands?: unknown })?.commands;
    if (!Array.isArray(commands) || commands.length === 0 || commands.some(command => {
      const item = command as { checkName?: unknown; command?: unknown; timeoutMs?: unknown };
      return typeof item.checkName !== "string" || !item.checkName.trim() || typeof item.command !== "string" || !item.command.trim()
        || (item.timeoutMs !== undefined && (typeof item.timeoutMs !== "number" || !Number.isSafeInteger(item.timeoutMs) || item.timeoutMs < 1 || item.timeoutMs > 3_600_000));
    })) throw new Error("Model execution-plan draft failed schema validation.");
    if (this.sandboxTools.length) {
      for (const entry of commands as Array<{ command: string }>) {
        const unsupported = /\b(jq|yq|python3?|pip3?)\b(?=\s|$)/gi;
        for (const match of entry.command.matchAll(unsupported)) {
          if (!this.sandboxTools.includes(match[1]!.toLowerCase())) {
            throw new Error(`Model execution-plan draft uses unavailable sandbox tool: ${match[1]!.toLowerCase()}`);
          }
        }
      }
    }
    return { taskId: task.id, source: "model", commands: commands as ApprovedExecutionPlan["commands"] };
  }

  async getPlan(): Promise<ApprovedExecutionPlan> {
    throw new Error("A model draft is not an approved execution plan. Review and approve it first.");
  }
}
