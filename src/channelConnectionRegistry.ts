import type { ChannelProviderType } from "./core/providers/channel.js";

export type ConnectionState = "unconfigured" | "sandbox_ready" | "live_pending_approval" | "live_connected" | "error";

export type ChannelConnectionRecord = {
  id: string;
  provider: Extract<ChannelProviderType, "telegram" | "discord" | "slack">;
  state: ConnectionState;
  workspaceId: string;
  externalWorkspaceId?: string;
  credentialReference?: string;
  connectionMode?: "gateway" | "oauth" | "bot_api";
  lastCheckedAt?: string;
  error?: string;
};

/** Provider-neutral result handed back by Telegram, Discord, or Slack auth. */
export type ChannelAuthCallback = {
  connectionId: string;
  provider: ChannelConnectionRecord["provider"];
  externalWorkspaceId: string;
  credentialReference: string;
  approved?: boolean;
};

export type ConnectionCheck = {
  provider: ChannelConnectionRecord["provider"];
  state: ConnectionState;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  externalChanges: boolean;
};

/** Provider-neutral connection registry; secrets stay in an external secret store. */
export class ChannelConnectionRegistry {
  private readonly records = new Map<string, ChannelConnectionRecord>();

  registerSandbox(provider: ChannelConnectionRecord["provider"], workspaceId: string): ChannelConnectionRecord {
    const id = `connection-${provider}-${workspaceId}`;
    const record: ChannelConnectionRecord = { id, provider, state: "sandbox_ready", workspaceId };
    this.records.set(id, record);
    return record;
  }

  requestLive(provider: ChannelConnectionRecord["provider"], workspaceId: string, credentialReference: string): ChannelConnectionRecord {
    const existing = this.registerSandbox(provider, workspaceId);
    const record = { ...existing, state: "live_pending_approval" as const, credentialReference, connectionMode: "bot_api" as const };
    this.records.set(record.id, record);
    return record;
  }

  /** Use an existing authenticated gateway/session owner; no provider API secret is copied. */
  requestGateway(provider: ChannelConnectionRecord["provider"], workspaceId: string, gatewayReference: string): ChannelConnectionRecord {
    if (!gatewayReference.trim()) throw new Error("A gateway reference is required.");
    const existing = this.registerSandbox(provider, workspaceId);
    const record = { ...existing, state: "live_pending_approval" as const, credentialReference: gatewayReference.trim(), connectionMode: "gateway" as const };
    this.records.set(record.id, record);
    return record;
  }

  /** Records a provider's OAuth/device callback without accepting or storing its raw code. */
  completeCallback(recordId: string, externalWorkspaceId: string, credentialReference: string): ChannelConnectionRecord {
    const record = this.records.get(recordId);
    if (!record) throw new Error(`Connection ${recordId} not found`);
    if (!externalWorkspaceId.trim() || !credentialReference.trim()) throw new Error("A provider workspace ID and secret reference are required.");
    const updated = {
      ...record,
      externalWorkspaceId: externalWorkspaceId.trim(),
      credentialReference: credentialReference.trim(),
      state: "live_pending_approval" as const,
      error: undefined,
    };
    this.records.set(recordId, updated);
    return updated;
  }

  completeAuthCallback(callback: ChannelAuthCallback): ChannelConnectionRecord {
    const record = this.records.get(callback.connectionId);
    if (!record) throw new Error(`Connection ${callback.connectionId} not found`);
    if (record.provider !== callback.provider) throw new Error("Callback provider does not match the connection.");
    const completed = this.completeCallback(callback.connectionId, callback.externalWorkspaceId, callback.credentialReference);
    if (callback.approved === true) this.check(completed.id, true);
    return this.records.get(completed.id)!;
  }

  check(recordId: string, approved = false): ConnectionCheck {
    const record = this.records.get(recordId);
    if (!record) throw new Error(`Connection ${recordId} not found`);
    const checks = [
      { name: "adapter_available", passed: true, detail: `${record.provider} adapter is installed.` },
      { name: "secret_reference_only", passed: Boolean(record.credentialReference), detail: "Only a secret reference is retained; raw credentials are not stored." },
      { name: "operator_approval", passed: record.state !== "live_pending_approval" || approved, detail: record.state === "live_pending_approval" && !approved ? "Live connection requires explicit approval." : "Approval boundary satisfied." },
    ];
    const passed = checks.every(check => check.passed);
    const state: ConnectionState = record.state === "sandbox_ready" ? "sandbox_ready"
      : passed ? "live_connected" : "live_pending_approval";
    this.records.set(recordId, { ...record, state, lastCheckedAt: new Date().toISOString() });
    return { provider: record.provider, state, checks, externalChanges: false };
  }

  get(recordId: string): ChannelConnectionRecord | undefined {
    return this.records.get(recordId);
  }

  list(workspaceId?: string): ChannelConnectionRecord[] {
    return [...this.records.values()].filter(record => !workspaceId || record.workspaceId === workspaceId);
  }
}
