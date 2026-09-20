/**
 * VoiceProvider Contract
 * Section 17 & 18: Voice Provider Contract & Capabilities
 * Voice is a first-class, provider-neutral subsystem.
 */

import type {
  VoiceCapabilities,
  Call,
  CallStatus,
  CallTranscript,
  CallRecording,
  VoiceUsage,
  VoiceAgentBinding,
} from "../types/voice.js";

export interface OutboundCallRequest {
  agentId: string;
  recipientPhoneNumber: string;
  recipientName?: string;
  canonicalChannelId: string;
  promptOverride?: string;
  variables?: Record<string, string>;
}

export interface InboundCallPayload {
  providerCallId: string;
  callerPhoneNumber: string;
  destinationPhoneNumber: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceEvent {
  callId: string;
  type: "call_started" | "speech_started" | "speech_ended" | "tool_call" | "call_ended" | "error";
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface VoiceProvider {
  readonly id: string;
  readonly name: string;

  getCapabilities(): VoiceCapabilities;
  getHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }>;

  createVoiceAgent(config: Omit<VoiceAgentBinding, "voiceProviderId">): Promise<{ voiceAgentId: string }>;
  updateVoiceAgent(voiceAgentId: string, updates: Partial<VoiceAgentBinding>): Promise<void>;
  deleteVoiceAgent(voiceAgentId: string): Promise<void>;

  startOutboundCall(request: OutboundCallRequest): Promise<Call>;
  handleInboundCall(payload: InboundCallPayload): Promise<Call>;
  transferCall(callId: string, targetPhoneNumber: string): Promise<void>;
  endCall(callId: string): Promise<void>;

  registerTool(voiceAgentId: string, tool: { name: string; description: string; parameters: Record<string, unknown> }): Promise<void>;
  streamEvents(callId: string): AsyncIterable<VoiceEvent>;

  getCall(callId: string): Promise<Call | null>;
  getCallStatus(callId: string): Promise<CallStatus>;
  getTranscript(callId: string): Promise<CallTranscript | null>;
  getRecording(callId: string): Promise<CallRecording | null>;
  getUsage(callId: string): Promise<VoiceUsage | null>;
  getCost(callId: string): Promise<number>;
}
