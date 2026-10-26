import type {ModelMessage} from '../../core/providers/model.js';

/** JSON encoding preserves the supplied message data while keeping CLI command
 * syntax out of the transport. This is not an instruction-injection defense or
 * isolation from settings, hooks, installed extensions or the account profile.
 */
export function encodeGeminiPlannerPrompt(messages: ModelMessage[]): string {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100
    || messages.some(message => !message || !['system', 'user', 'assistant'].includes(message.role)
      || typeof message.content !== 'string' || message.toolCalls !== undefined || message.toolCallId !== undefined))
    throw Error('Gemini planning requires text messages without tool activity');
  const payload = JSON.stringify(messages.map(({role, content}) => ({role, content}))).replace(/@/g, '\\u0040');
  const prompt = 'Draft only; do not execute commands or access files. Decode the JSON message data below, including JSON Unicode escapes. Use only that supplied data. Return only a JSON object with commands: 1 to 100 objects containing checkName, command and timeoutMs (at most 3600000).\nMessage data:\n' + payload;
  if (Buffer.byteLength(prompt) > 32768) throw Error('Gemini planner input exceeds 32KiB');
  return prompt;
}
