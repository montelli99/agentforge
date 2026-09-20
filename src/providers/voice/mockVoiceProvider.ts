/**
 * Mock Voice Provider
 * Sections 16, 17, 18, 19, 20, 21
 * Fully simulated VoiceProvider supporting inbound/outbound calls, transcripts,
 * recordings, tool invocations, and real-time event streaming.
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

export class MockVoiceProvider implements VoiceProvider {
  readonly id = "mock_voice";
  readonly name = "AgentForge Mock Voice Provider";

  private calls = new Map<string, Call>();
  private agents = new Map<string, VoiceAgentBinding>();
  private activeStreams = new Map<string, VoiceEvent[]>();

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
      supportsSimulation: true,
    };
  }

  async getHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
    return { healthy: true, latencyMs: 5 };
  }

  async createVoiceAgent(config: Omit<VoiceAgentBinding, "voiceProviderId">): Promise<{ voiceAgentId: string }> {
    const voiceAgentId = `vagent-${crypto.randomUUID().slice(0, 8)}`;
    this.agents.set(voiceAgentId, {
      ...config,
      voiceProviderId: this.id,
    });
    return { voiceAgentId };
  }

  async updateVoiceAgent(voiceAgentId: string, updates: Partial<VoiceAgentBinding>): Promise<void> {
    const existing = this.agents.get(voiceAgentId);
    if (existing) {
      this.agents.set(voiceAgentId, { ...existing, ...updates });
    }
  }

  async deleteVoiceAgent(voiceAgentId: string): Promise<void> {
    this.agents.delete(voiceAgentId);
  }

  async startOutboundCall(request: OutboundCallRequest): Promise<Call> {
    const callId = `call-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const call: Call = {
      id: callId,
      providerCallId: `mock-prov-${callId}`,
      provider: this.id,
      agentId: request.agentId,
      canonicalChannelId: request.canonicalChannelId,
      status: "IN_PROGRESS",
      direction: "outbound",
      participants: [
        { role: "agent", agentId: request.agentId },
        { role: "caller", phoneNumber: request.recipientPhoneNumber, name: request.recipientName },
      ],
      startedAt: now,
      transcript: {
        language: "en-US",
        fullText: "Agent: Hello, this is your AI assistant calling. Seller: Hi, I am calling back about the property.",
        segments: [
          { speaker: "agent", text: "Hello, this is your AI assistant calling.", timestampMs: 0, durationMs: 2500 },
          { speaker: "caller", text: "Hi, I am calling back about the property.", timestampMs: 3000, durationMs: 3200 },
        ],
      },
      recording: {
        id: `rec-${callId}`,
        url: `https://mock-recordings.local/${callId}.wav`,
        durationSeconds: 145,
        format: "wav",
      },
      outcome: {
        status: "COMPLETED",
        disposition: "interested",
        summary: "Seller confirmed property is available for inspection; requested follow up.",
        extractedCommitments: ["Inspection scheduled for Tuesday"],
        requiresHumanReview: false,
        sentiment: "positive",
      },
      usage: {
        durationSeconds: 145,
        billedMinutes: 3,
        telephonyCostUsd: 0.045,
        voiceSynthesisCostUsd: 0.03,
        llmCostUsd: 0.015,
        totalCostUsd: 0.09,
      },
    };

    this.calls.set(callId, call);
    this.activeStreams.set(callId, [
      { callId, type: "call_started", payload: { direction: "outbound" }, timestamp: now },
      { callId, type: "speech_started", payload: { speaker: "agent" }, timestamp: now },
    ]);

    return call;
  }

  async handleInboundCall(payload: InboundCallPayload): Promise<Call> {
    const callId = `call-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const call: Call = {
      id: callId,
      providerCallId: payload.providerCallId,
      provider: this.id,
      agentId: "agent-inbound-receptionist",
      canonicalChannelId: "channel-inbound-calls",
      status: "RINGING",
      direction: "inbound",
      participants: [
        { role: "caller", phoneNumber: payload.callerPhoneNumber },
        { role: "agent", phoneNumber: payload.destinationPhoneNumber },
      ],
      startedAt: now,
    };

    this.calls.set(callId, call);
    return call;
  }

  async transferCall(callId: string, targetPhoneNumber: string): Promise<void> {
    const call = this.calls.get(callId);
    if (call) {
      call.status = "TRANSFERRED";
      call.participants.push({ role: "transferee", phoneNumber: targetPhoneNumber });
    }
  }

  async endCall(callId: string): Promise<void> {
    const call = this.calls.get(callId);
    if (call) {
      call.status = "COMPLETED";
      call.endedAt = new Date().toISOString();
    }
  }

  async registerTool(voiceAgentId: string, tool: { name: string; description: string; parameters: Record<string, unknown> }): Promise<void> {
    // Registered in mock registry
  }

  async *streamEvents(callId: string): AsyncIterable<VoiceEvent> {
    const events = this.activeStreams.get(callId) || [];
    for (const evt of events) {
      yield evt;
    }
  }

  async getCall(callId: string): Promise<Call | null> {
    return this.calls.get(callId) || null;
  }

  async getCallStatus(callId: string): Promise<CallStatus> {
    const call = this.calls.get(callId);
    return call ? call.status : "FAILED";
  }

  async getTranscript(callId: string): Promise<CallTranscript | null> {
    const call = this.calls.get(callId);
    return call?.transcript || null;
  }

  async getRecording(callId: string): Promise<CallRecording | null> {
    const call = this.calls.get(callId);
    return call?.recording || null;
  }

  async getUsage(callId: string): Promise<VoiceUsage | null> {
    const call = this.calls.get(callId);
    return call?.usage || null;
  }

  async getCost(callId: string): Promise<number> {
    const call = this.calls.get(callId);
    return call?.usage?.totalCostUsd || 0;
  }
}
