import type { GenerativeModelProvider, ModelMessage, ModelResponse } from "../providers/model.js";
import type { ToolDefinition, ToolProvider, ToolCallResult } from "../providers/tools.js";

export interface ModelToolLoopOptions {
  model: string;
  agentId: string;
  taskId?: string;
  messages: ModelMessage[];
  maxTurns?: number;
  approveTool?: (tool: ToolDefinition, args: Record<string, unknown>) => Promise<boolean>;
  signal?: AbortSignal;
}

export interface ModelToolLoopResult {
  response: ModelResponse;
  messages: ModelMessage[];
  toolResults: ToolCallResult[];
  turns: number;
}

/**
 * Runs a bounded model/tool exchange. Tool definitions and approval are owned
 * by the provider; this loop only dispatches calls that passed both checks.
 */
export async function runModelToolLoop(
  model: GenerativeModelProvider,
  tools: ToolProvider,
  options: ModelToolLoopOptions,
): Promise<ModelToolLoopResult> {
  const maxTurns = options.maxTurns ?? 8;
  if (!Number.isSafeInteger(maxTurns) || maxTurns < 1 || maxTurns > 32) throw new Error("maxTurns must be an integer from 1 to 32.");
  const definitions = tools.getAvailableTools();
  const byName = new Map(definitions.map(tool => [tool.name, tool]));
  const messages = options.messages.map(message => structuredClone(message));
  const toolResults: ToolCallResult[] = [];
  let response: ModelResponse | undefined;

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    if (options.signal?.aborted) throw new Error("Model tool loop was cancelled.");
    response = await model.generate({
      model: options.model,
      messages,
      tools: definitions,
      toolChoice: "auto",
      signal: options.signal,
    });
    if (!response.toolCalls?.length) return { response, messages, toolResults, turns: turn };
    messages.push({ role: "assistant", content: response.content || "", toolCalls: response.toolCalls });

    for (const call of response.toolCalls) {
      const definition = byName.get(call.function.name);
      if (!definition) throw new Error(`Model requested an unavailable tool: ${call.function.name}`);
      let args: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(call.function.arguments || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("arguments must be an object");
        args = parsed as Record<string, unknown>;
      } catch {
        throw new Error(`Tool arguments for ${call.function.name} are not valid JSON.`);
      }
      if (definition.requiresApproval && !(await options.approveTool?.(definition, args))) {
        throw new Error(`Approval is required before using tool ${call.function.name}.`);
      }
      const result = await tools.executeTool(call.function.name, args, { agentId: options.agentId, taskId: options.taskId });
      toolResults.push(result);
      messages.push({ role: "tool", name: result.toolName, toolCallId: call.id, content: JSON.stringify(result) });
    }
  }
  throw new Error(`Model tool loop exceeded its ${maxTurns}-turn limit.`);
}
