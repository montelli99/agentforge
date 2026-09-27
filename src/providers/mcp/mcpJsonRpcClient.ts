import crypto from "node:crypto";

export type McpJsonRpcRequest = { jsonrpc: "2.0"; id?: string; method: string; params?: Record<string, unknown> };
export type McpJsonRpcResponse = { jsonrpc?: string; id?: string; result?: Record<string, unknown>; error?: { code?: number; message?: string; data?: unknown } };

export interface McpClientOptions {
  endpoint: string;
  headers?: Record<string, string>;
  request?: (request: McpJsonRpcRequest) => Promise<McpJsonRpcResponse>;
  /** Remote MCP access is an external side effect and must be explicitly opted in. */
  allowOutbound?: boolean;
}

/** Minimal provider-neutral MCP client. Secrets stay in the caller; none are persisted here. */
export class McpJsonRpcClient {
  readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly requestOverride?: McpClientOptions["request"];
  private initialized = false;

  constructor(options: McpClientOptions) {
    const parsed = new URL(options.endpoint);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("MCP endpoint must use HTTP(S).");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.protocol === "http:" && !local) {
      throw new Error("Non-local MCP endpoints must use HTTPS.");
    }
    if (!local && options.allowOutbound !== true) throw new Error("Remote MCP access requires explicit allowOutbound=true.");
    this.endpoint = parsed.toString();
    this.headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    this.requestOverride = options.request;
  }

  async initialize(): Promise<Record<string, unknown>> {
    const result = await this.call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "agentforge", version: "0.1" } });
    await this.notify("notifications/initialized");
    this.initialized = true;
    return result;
  }

  async listTools(): Promise<readonly Record<string, unknown>[]> {
    return this.arrayResult(await this.call("tools/list"), "tools");
  }

  async listResources(): Promise<readonly Record<string, unknown>[]> {
    return this.arrayResult(await this.call("resources/list"), "resources");
  }

  async callTool(name: string, argumentsValue: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    if (!name.trim() || name.length > 200) throw new Error("A bounded MCP tool name is required.");
    if (Object.keys(argumentsValue).length > 64) throw new Error("MCP tool arguments exceed the safe limit.");
    return this.call("tools/call", { name, arguments: argumentsValue });
  }

  async notify(method: string, params: Record<string, unknown> = {}): Promise<void> {
    if (!method.trim() || method.length > 200) throw new Error("A bounded MCP notification method is required.");
    const request: McpJsonRpcRequest = { jsonrpc: "2.0", method, params };
    if (this.requestOverride) {
      await this.requestOverride(request);
      return;
    }
    const response = await fetch(this.endpoint, { method: "POST", headers: this.headers, body: JSON.stringify(request) });
    if (!response.ok) throw new Error(`MCP notification returned HTTP ${response.status}.`);
  }

  async readResource(uri: string): Promise<Record<string, unknown>> {
    if (!uri.trim() || uri.length > 4_000) throw new Error("A bounded resource URI is required.");
    return this.call("resources/read", { uri });
  }

  async call(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    if (!method.trim() || method.length > 200) throw new Error("A bounded MCP method is required.");
    if (method !== "initialize" && !this.initialized) throw new Error("Initialize the MCP session before calling methods.");
    const request: McpJsonRpcRequest = { jsonrpc: "2.0", id: crypto.randomUUID(), method, params };
    const response = this.requestOverride
      ? await this.requestOverride(request)
      : await this.httpRequest(request);
    if (response.error) throw new Error(`MCP ${method} failed: ${response.error.message || "unknown error"}`);
    if (!response.result || typeof response.result !== "object" || Array.isArray(response.result)) throw new Error(`MCP ${method} returned no object result.`);
    return response.result;
  }

  private async httpRequest(request: McpJsonRpcRequest): Promise<McpJsonRpcResponse> {
    const response = await fetch(this.endpoint, { method: "POST", headers: this.headers, body: JSON.stringify(request) });
    if (!response.ok) throw new Error(`MCP endpoint returned HTTP ${response.status}.`);
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("MCP endpoint returned invalid JSON-RPC data.");
    return parsed as McpJsonRpcResponse;
  }

  private arrayResult(result: Record<string, unknown>, key: string): readonly Record<string, unknown>[] {
    const value = result[key];
    if (!Array.isArray(value) || value.some(item => !item || typeof item !== "object" || Array.isArray(item))) throw new Error(`MCP response field '${key}' is invalid.`);
    return value as Record<string, unknown>[];
  }
}
