/**
 * Voice Domain Model & Capabilities
 * Sections 16, 17, 18, 19, 20, 21
 */

export type CallStatus =
  | "CREATED"
  | "QUEUED"
  | "RINGING"
  | "ANSWERED"
  | "IN_PROGRESS"
  | "TRANSFERRED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";

export interface VoiceCapabilities {
  supportsInboundCall: boolean;
  supportsOutboundCall: boolean;
  supportsSIP: boolean;
  supportsCustomTelephony: boolean;
  supportsPhoneNumbers: boolean;
  supportsCallTransfer: boolean;
  supportsDTMF: boolean;
  supportsVoicemailDetection: boolean;
  supportsRecording: boolean;
  supportsTranscription: boolean;
  supportsRealTimeEvents: boolean;
  supportsToolCalls: boolean;
  supportsCustomLLM: boolean;
  supportsSimulation: boolean;
}

export interface CallParticipant {
  role: "agent" | "caller" | "transferee";
  phoneNumber?: string;
  name?: string;
  agentId?: string;
}

export interface CallTranscriptSegment {
  speaker: "agent" | "caller" | "system";
  text: string;
  timestampMs: number;
  durationMs: number;
  confidence?: number;
}

export interface CallTranscript {
  segments: CallTranscriptSegment[];
  fullText: string;
  language: string;
}

export interface CallRecording {
  id: string;
  url: string;
  durationSeconds: number;
  format: "wav" | "mp3";
  sha256?: string;
}

export interface CallToolInvocation {
  toolName: string;
  parameters: Record<string, unknown>;
  result: unknown;
  timestampMs: number;
}

export interface CallOutcome {
  status: CallStatus;
  disposition?: "interested" | "not_interested" | "follow_up_requested" | "voicemail" | "wrong_number" | "dnc";
  summary?: string;
  extractedCommitments?: string[];
  requiresHumanReview: boolean;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface VoiceUsage {
  durationSeconds: number;
  billedMinutes: number;
  telephonyCostUsd: number;
  voiceSynthesisCostUsd: number;
  llmCostUsd: number;
  totalCostUsd: number;
}

export interface Call {
  id: string;
  providerCallId: string;
  provider: string;
  agentId: string;
  canonicalChannelId: string; // Calls appear directly in workspace channel context
  status: CallStatus;
  direction: "inbound" | "outbound";
  participants: CallParticipant[];
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript?: CallTranscript;
  recording?: CallRecording;
  toolInvocations?: CallToolInvocation[];
  outcome?: CallOutcome;
  usage?: VoiceUsage;
  error?: string;
}

export interface VoiceAgentBinding {
  agentId: string;
  voiceProviderId: string;
  voiceModelId: string;
  voiceId: string; // e.g. elevenlabs/cartesia voice id or native
  phoneNumber?: string;
  ambientNoiseLevel?: "silent" | "office" | "callcenter";
}
