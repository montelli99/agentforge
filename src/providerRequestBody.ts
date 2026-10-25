/** Aggregate legacy compression is safe to apply only to a single plain user
 * message. Complex message roles, tools and multimodal parts must retain their
 * original semantics until a role-preserving optimizer is explicitly supplied. */
export function canOptimizeProviderBody(body: Record<string, unknown>): boolean {
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length !== 1 || body.tools !== undefined || body.tool_choice !== undefined || body.functions !== undefined || body.function_call !== undefined || body.response_format !== undefined) return false;
  const message = messages[0];
  return message && typeof message === "object" && message.role === "user" && typeof message.content === "string"
    && message.tool_calls === undefined && message.function_call === undefined;
}
export function buildOptimizedProviderBody(body: Record<string, unknown>, optimizedPrompt: string, model: string): Record<string, unknown> {
  if (!canOptimizeProviderBody(body)) return { ...body, model };
  const messages = body.messages as Array<Record<string, unknown>>;
  return { ...body, model, messages: [{ ...messages[0], content: optimizedPrompt }] };
}
