import type { GenerativeModelProvider } from "../providers/model.js";
import type { Task } from "../types/task.js";
import type { ApprovedExecutionPlan, ExecutionPlanProvider } from "./contractedDockerExecutionBackend.js";

/**
 * Produces a reviewable plan draft from a connected model. It deliberately
 * never marks the plan human-approved; an operator must approve the returned
 * draft before the execution backend can run it.
 */
export class ModelPlanDraftProvider implements ExecutionPlanProvider {
  constructor(private readonly model: GenerativeModelProvider, private readonly modelName: string) {}

  getReadiness(): { ready: boolean; blocker?: string } {
    return { ready: true };
  }

  async draft(task: Task, signal?: AbortSignal): Promise<ApprovedExecutionPlan> {
    const response = await this.model.generate({
      model: this.modelName,
      messages: [{ role: "system", content: "Return JSON only: {commands:[{checkName,command,timeoutMs}]}. For each required check, copy its type exactly into checkName and copy its command exactly into command. Produce a minimal verification plan within the supplied task boundaries. Never add destructive or network commands." }, { role: "user", content: JSON.stringify({ id: task.id, title: task.title, description: task.description,
        scope: task.contract.scope, authority: task.contract.authority, checks: task.contract.requiredChecks }) }],
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
    return { taskId: task.id, source: "model", commands: commands as ApprovedExecutionPlan["commands"] };
  }

  async getPlan(): Promise<ApprovedExecutionPlan> {
    throw new Error("A model draft is not an approved execution plan. Review and approve it first.");
  }
}
