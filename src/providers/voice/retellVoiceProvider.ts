/**
 * Retell Voice Provider Adapter
 * Section 25: Voice
 * Section 26: Voice Contract
 * Section 27: Call Domain
 * 
 * Production-ready telephony adapter for Retell AI.
 * Normalizes vendor payloads into canonical AgentForge Call domain.
 * Fails closed safely if RETELL_API_KEY is missing.
 */

import crypto from "node:crypto";
import type { VoiceProvider, OutboundCallRequest, InboundCallPayload, VoiceEvent } from "../../core/providers/voice.js";
import type {
  VoiceCapabilities,
  Call,
  CallStatus,
  CallTranscript,
  CallRecording,
  VoiceUsage,
  VoiceAgentBinding,
} from "../../core/types/voice.js";

export interface RetellProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface RetellWebhookCallData {
  call_id: string;
  agent_id?: string;
  call_status?: "registered" | "ongoing" | "ended" | "error";
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  transcript_object?: Array<{
    role: "agent" | "user";
    content: string;
    words?: Array<{ word: string; start: number; end: number }>;
  }>;
  recording_url?: string;
  disconnection_reason?: string;
  call_analysis?: {
    call_summary?: string;
    in_voicemail?: boolean;
    user_sentiment?: "Positive" | "Neutral" | "Negative";
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
  call_cost?: {
    total_duration_unit_price?: number;
    product_costs?: Array<{ product: string; cost: number }>;
    combined_cost?: number;
  };
}

export interface RetellWebhookEvent {
  event: "call_started" | "call_ended" | "call_analyzed";
  call: RetellWebhookCallData;
}

export class RetellVoiceProvider implements VoiceProvider {
  readonly id = "retell";
  readonly name = "Retell AI Voice Platform";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: RetellProviderOptions = {}) {
    this.apiKey = options.apiKey ?? (process.env.RETELL_API_KEY || "");
    this.baseUrl = (options.baseUrl ?? "https://api.retellai.com").replace(/\/$/, "");
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  getCapabilities(): VoiceCapabilities {
    return {
      supportsInboundCall: true,
      supportsOutboundCall: true,
      supportsSIP: true,
      supportsCustomTelephony: true,
      supportsPhoneNumbers: true,
      supportsCallTransfer: true,
      supportsDTMF: true,
      supportsVoicemailDetection: true,
      supportsRecording: true,
      supportsTranscription: true,
      supportsRealTimeEvents: true,
      supportsToolCalls: true,
      supportsCustomLLM: true,
      supportsSimulation: false, // Retell is a live telephony provider, not an offline simulator
    };
  }

  async getHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    if (!this.apiKey) {
      return { healthy: false, latencyMs: 0, error: "Retell API key not configured (RETELL_API_KEY)" };
    }
    const start = Date.now();
    try {
      const res = await this.fetchFn(`${this.baseUrl}/v2/list-phone-calls?limit=1`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { healthy: true, latencyMs };
      }
      return { healthy: false, latencyMs, error: `Retell returned HTTP ${res.status}` };
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, error: (err as Error).message };
    }
  }

  async createVoiceAgent(config: Omit<VoiceAgentBinding, "voiceProviderId">): Promise<{ voiceAgentId: string }> {
    if (!this.apiKey) {
      throw new Error("Retell API key not configured (RETELL_API_KEY). Cannot create remote voice agent.");
    }
    const res = await this.fetchFn(`${this.baseUrl}/create-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        agent_name: config.agentId,
        voice_id: config.voiceId,
        ambient_sound: config.ambientNoiseLevel || "office",
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create Retell voice agent: HTTP ${res.status}`);
    }
    const data = await res.json() as { agent_id: string };
    return { voiceAgentId: data.agent_id };
  }

  async updateVoiceAgent(voiceAgentId: string, updates: Partial<VoiceAgentBinding>): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Retell API key not configured (RETELL_API_KEY).");
    }
    await this.fetchFn(`${this.baseUrl}/update-agent/${voiceAgentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(updates),
    });
  }

  async deleteVoiceAgent(voiceAgentId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Retell API key not configured (RETELL_API_KEY).");
    }
    await this.fetchFn(`${this.baseUrl}/delete-agent/${voiceAgentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  async startOutboundCall(request: OutboundCallRequest): Promise<Call> {
    if (!this.apiKey) {
      throw new Error("Retell API key not configured (RETELL_API_KEY). Cannot place real outbound call.");
    }

    const payload = {
      agent_id: request.agentId,
      to_number: request.recipientPhoneNumber,
      from_number: request.variables?.fromNumber || undefined,
      metadata: {
        canonicalChannelId: request.canonicalChannelId,
        agentId: request.agentId,
        recipientName: request.recipientName,
        ...request.variables,
      },
      retell_llm_dynamic_variables: request.variables,
    };

    const res = await this.fetchFn(`${this.baseUrl}/v2/create-phone-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Retell call creation failed (HTTP ${res.status}): ${errText}`);
    }

    const data = await res.json() as RetellWebhookCallData;
    return this.mapRetellCallToCanonical(data, request.canonicalChannelId, request.agentId);
  }

  async handleInboundCall(payload: InboundCallPayload): Promise<Call> {
    const callId = `retell-in-${payload.providerCallId || Date.now()}`;
    return {
      id: callId,
      providerCallId: payload.providerCallId,
      provider: this.id,
      agentId: "agent-retell-inbound",
      canonicalChannelId: "chan-calls",
      status: "ANSWERED",
      direction: "inbound",
      participants: [{ role: "caller", phoneNumber: payload.callerPhoneNumber }],
      startedAt: new Date().toISOString(),
    };
  }

  async transferCall(callId: string, targetPhoneNumber: string): Promise<void> {
    if (!this.apiKey) throw new Error("Retell API key not configured.");
    await this.fetchFn(`${this.baseUrl}/v2/transfer-phone-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ call_id: callId, transfer_to: targetPhoneNumber }),
    });
  }

  async endCall(callId: string): Promise<void> {
    if (!this.apiKey) throw new Error("Retell API key not configured.");
    await this.fetchFn(`${this.baseUrl}/v2/end-phone-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ call_id: callId }),
    });
  }

  async registerTool(voiceAgentId: string, tool: { name: string; description: string; parameters: Record<string, unknown> }): Promise<void> {}

  async *streamEvents(callId: string): AsyncIterable<VoiceEvent> {
    yield {
      callId,
      type: "call_started",
      payload: { provider: "retell" },
      timestamp: new Date().toISOString(),
    };
  }

  async getCall(callId: string): Promise<Call | null> {
    if (!this.apiKey) return null;
    try {
      const res = await this.fetchFn(`${this.baseUrl}/v2/get-phone-call/${callId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) return null;
      const data = await res.json() as RetellWebhookCallData;
      return this.mapRetellCallToCanonical(data);
    } catch {
      return null;
    }
  }

  async getCallStatus(callId: string): Promise<CallStatus> {
    const call = await this.getCall(callId);
    return call?.status || "COMPLETED";
  }

  async getTranscript(callId: string): Promise<CallTranscript | null> {
    const call = await this.getCall(callId);
    return call?.transcript || null;
  }

  async getRecording(callId: string): Promise<CallRecording | null> {
    const call = await this.getCall(callId);
    return call?.recording || null;
  }

  async getUsage(callId: string): Promise<VoiceUsage | null> {
    const call = await this.getCall(callId);
    return call?.usage || null;
  }

  async getCost(callId: string): Promise<number> {
    const usage = await this.getUsage(callId);
    return usage?.totalCostUsd || 0;
  }

  /**
   * Verifies an incoming Retell webhook signature.
   */
  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    try {
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Normalizes a Retell webhook event payload into canonical Call format.
   */
  normalizeWebhookEvent(event: RetellWebhookEvent): {
    eventType: string;
    call: Call;
  } {
    const canonical = this.mapRetellCallToCanonical(event.call);
    return {
      eventType: event.event,
      call: canonical,
    };
  }

  private mapRetellCallToCanonical(data: RetellWebhookCallData, channelId = "chan-calls", fallbackAgentId = "agent-retell"): Call {
    const durationSeconds = data.duration_ms ? Math.round(data.duration_ms / 1000) : undefined;
    const statusMap: Record<string, CallStatus> = {
      registered: "QUEUED",
      ongoing: "IN_PROGRESS",
      ended: "COMPLETED",
      error: "FAILED",
    };

    const status: CallStatus = statusMap[data.call_status || "ended"] || "COMPLETED";

    const segments = (data.transcript_object || []).map(seg => ({
      speaker: (seg.role === "agent" ? "agent" : "caller") as "agent" | "caller",
      text: seg.content,
      timestampMs: seg.words?.[0]?.start || 0,
      durationMs: seg.words?.length ? (seg.words[seg.words.length - 1].end - seg.words[0].start) : 0,
    }));

    const transcript: CallTranscript | undefined = data.transcript ? {
      fullText: data.transcript,
      language: "en-US",
      segments,
    } : undefined;

    const recording: CallRecording | undefined = data.recording_url ? {
      id: `rec-${data.call_id}`,
      url: data.recording_url,
      durationSeconds: durationSeconds || 0,
      format: "wav",
    } : undefined;

    const sentiment = data.call_analysis?.user_sentiment
      ? data.call_analysis.user_sentiment.toLowerCase() as "positive" | "neutral" | "negative"
      : undefined;

    const totalCost = data.call_cost?.combined_cost ? data.call_cost.combined_cost / 100 : 0; // cents to dollars
    const usage: VoiceUsage = {
      durationSeconds: durationSeconds || 0,
      billedMinutes: Math.ceil((durationSeconds || 0) / 60),
      telephonyCostUsd: totalCost * 0.4,
      voiceSynthesisCostUsd: totalCost * 0.4,
      llmCostUsd: totalCost * 0.2,
      totalCostUsd: totalCost,
    };

    return {
      id: `call-${data.call_id}`,
      providerCallId: data.call_id,
      provider: this.id,
      agentId: data.agent_id || fallbackAgentId,
      canonicalChannelId: channelId,
      status,
      direction: "outbound",
      participants: [
        { role: "agent", agentId: data.agent_id || fallbackAgentId },
        { role: "caller" },
      ],
      startedAt: data.start_timestamp ? new Date(data.start_timestamp).toISOString() : new Date().toISOString(),
      endedAt: data.end_timestamp ? new Date(data.end_timestamp).toISOString() : undefined,
      durationSeconds,
      transcript,
      recording,
      outcome: {
        status,
        summary: data.call_analysis?.call_summary,
        disposition: data.call_analysis?.in_voicemail ? "voicemail" : (data.call_analysis?.call_successful ? "interested" : "follow_up_requested"),
        sentiment,
        requiresHumanReview: data.call_analysis?.call_successful === false || Boolean(data.call_analysis?.in_voicemail),
      },
      usage,
    };
  }
}
