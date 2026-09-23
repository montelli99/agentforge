import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { RetellVoiceProvider } from "./retellVoiceProvider.js";
import { MockVoiceProvider } from "./mockVoiceProvider.js";
import { CallLifecycleManager } from "../../core/voice/callLifecycleManager.js";
import { WorkspaceStore } from "../../core/store/workspaceStore.js";
import type { Call } from "../../core/types/voice.js";

describe("Voice Subsystem & Telephony Domain (Sections 25-29)", () => {
  let store: WorkspaceStore;
  let lifecycleManager: CallLifecycleManager;

  beforeEach(() => {
    store = new WorkspaceStore();
    lifecycleManager = new CallLifecycleManager(store);
  });

  describe("RetellVoiceProvider (Sections 25, 26, 27)", () => {
    it("reports honest health and fails closed when RETELL_API_KEY is not configured", async () => {
      const provider = new RetellVoiceProvider({ apiKey: "" });

      const health = await provider.getHealth();
      expect(health.healthy).toBe(false);
      expect(health.error).toContain("Retell API key not configured");

      await expect(
        provider.startOutboundCall({
          agentId: "agent-1",
          recipientPhoneNumber: "+15551234567",
          canonicalChannelId: "chan-calls",
        })
      ).rejects.toThrow("Retell API key not configured");
    });

    it("verifies and rejects Retell HMAC-SHA256 webhook signatures", () => {
      const provider = new RetellVoiceProvider();
      const secret = "retell_test_secret_key_12345";
      const payload = JSON.stringify({ event: "call_ended", call: { call_id: "retell-call-999" } });

      const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      expect(provider.verifyWebhookSignature(payload, validSignature, secret)).toBe(true);

      const invalidSignature = crypto.createHmac("sha256", "wrong_secret").update(payload).digest("hex");
      expect(provider.verifyWebhookSignature(payload, invalidSignature, secret)).toBe(false);

      expect(provider.verifyWebhookSignature(payload, "", secret)).toBe(false);
    });

    it("normalizes Retell webhook payload into canonical Call domain structures", () => {
      const provider = new RetellVoiceProvider();
      const webhookPayload = {
        event: "call_analyzed" as const,
        call: {
          call_id: "retell-call-12345",
          agent_id: "agent-sales-rep",
          call_status: "ended" as const,
          start_timestamp: 1720000000000,
          end_timestamp: 1720000120000,
          duration_ms: 120000,
          transcript: "Agent: Hello, thanks for taking our call. Customer: Yes, I would like to schedule a demonstration.",
          transcript_object: [
            { role: "agent" as const, content: "Hello, thanks for taking our call.", words: [{ word: "Hello", start: 0, end: 500 }] },
            { role: "user" as const, content: "Yes, I would like to schedule a demonstration.", words: [{ word: "Yes", start: 600, end: 1200 }] },
          ],
          recording_url: "https://recordings.retellai.com/call-12345.wav",
          call_analysis: {
            call_summary: "Customer requested a demonstration next Tuesday.",
            user_sentiment: "Positive" as const,
            call_successful: true,
          },
          call_cost: {
            combined_cost: 240, // 240 cents = $2.40
          },
        },
      };

      const normalized = provider.normalizeWebhookEvent(webhookPayload);
      expect(normalized.eventType).toBe("call_analyzed");

      const call = normalized.call;
      expect(call.id).toBe("call-retell-call-12345");
      expect(call.provider).toBe("retell");
      expect(call.agentId).toBe("agent-sales-rep");
      expect(call.status).toBe("COMPLETED");
      expect(call.durationSeconds).toBe(120);

      // Transcript verification
      expect(call.transcript?.fullText).toContain("schedule a demonstration");
      expect(call.transcript?.segments).toHaveLength(2);
      expect(call.transcript?.segments[0].speaker).toBe("agent");
      expect(call.transcript?.segments[1].speaker).toBe("caller");

      // Recording verification
      expect(call.recording?.url).toBe("https://recordings.retellai.com/call-12345.wav");

      // Outcome & Analysis
      expect(call.outcome?.disposition).toBe("interested");
      expect(call.outcome?.sentiment).toBe("positive");
      expect(call.outcome?.requiresHumanReview).toBe(false);

      // Usage & Billing
      expect(call.usage?.totalCostUsd).toBe(2.40);
      expect(call.usage?.billedMinutes).toBe(2);
    });
  });

  describe("CallLifecycleManager (Section 28: Calls as Workspace Events)", () => {
    it("dispatches channel summary, follow-up task, memory record, and audit entry upon call completion", async () => {
      const mockCall: Call = {
        id: "call-live-001",
        providerCallId: "prov-001",
        provider: "retell",
        agentId: "agent-voice-exec",
        canonicalChannelId: "chan-calls",
        status: "COMPLETED",
        direction: "outbound",
        participants: [
          { role: "agent", agentId: "agent-voice-exec" },
          { role: "caller", phoneNumber: "+15554321098" },
        ],
        startedAt: new Date(Date.now() - 90000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 90,
        transcript: {
          language: "en-US",
          fullText: "Customer wants follow-up email with pricing sheet.",
          segments: [],
        },
        recording: {
          id: "rec-001",
          url: "https://recordings.example.com/001.wav",
          durationSeconds: 90,
          format: "wav",
        },
        outcome: {
          status: "COMPLETED",
          disposition: "follow_up_requested",
          summary: "Customer requested a pricing quote for enterprise tier.",
          extractedCommitments: [
            "Send enterprise tier pricing document",
            "Follow up on Thursday 2pm",
          ],
          requiresHumanReview: true, // Flagged for review
        },
      };

      const result = await lifecycleManager.handleCallCompleted(mockCall);

      // 1. Channel message created
      expect(result.messageId).toBeDefined();
      const messages = store.listMessages("chan-calls");
      const summaryMsg = messages.find(m => m.id === result.messageId);
      expect(summaryMsg).toBeDefined();
      expect(summaryMsg?.content).toContain("+15554321098");
      expect(summaryMsg?.content).toContain("Follow up on Thursday 2pm");

      // 2. Follow-up task generated
      expect(result.taskId).toBeDefined();
      const task = store.getTask(result.taskId!);
      expect(task).toBeDefined();
      expect(task?.title).toContain("Follow-up: Voice call with +15554321098");
      expect(task?.assignedAgentId).toBe("agent-voice-exec");

      // 3. Approval request created for high-risk / review requirement
      expect(result.approvalRequestId).toBeDefined();
      const approvals = store.listApprovals();
      const approval = approvals.find(a => a.id === result.approvalRequestId);
      expect(approval).toBeDefined();
      expect(approval?.description).toContain("Voice call call-live-001 flagged for human review");

      // 4. Ingested into durable operational memory
      expect(result.memoryId).toBeDefined();
      const memories = store.searchOperationalMemory("pricing sheet", "voice_calls");
      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].namespace).toBe("voice_calls");

      // 5. Audit trail entry created
      const audits = store.listAuditEntries().filter(a => a.targetId === mockCall.id);
      expect(audits.length).toBe(1);
      expect(audits[0].action).toBe("CALL_COMPLETED");
    });
  });
});
