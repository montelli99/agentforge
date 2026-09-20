/**
 * ToolProvider Interface
 * Exposes standardized tools to harnesses and agents with policy enforcement.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresApproval?: boolean;
  requiredAuthority?: string;
}

export interface ToolCallResult {
  toolName: string;
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
}

export interface ToolProvider {
  readonly id: string;
  readonly name: string;

  getAvailableTools(): ToolDefinition[];
  executeTool(name: string, args: Record<string, unknown>, context: { agentId: string; taskId?: string }): Promise<ToolCallResult>;
}
