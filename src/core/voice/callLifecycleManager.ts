/**
 * Call Lifecycle & Workspace Event Dispatcher
 * Section 27: Call Domain
 * Section 28: Calls as Workspace Events
 * 
 * CORE CONTRACT: Calls appear directly in canonical workspace channels.
 * Call completion automatically dispatches governed workspace artifacts:
 * - Channel message summary
 * - Action item & follow-up task generation
 * - Human approval requests for high-risk outcomes
 * - Operational memory candidate storage
 * - Durable audit ledger recording
 * ZERO uncontrolled production side-effects.
 */

import crypto from "node:crypto";
import type { WorkspaceStore } from "../store/workspaceStore.js";
import type { Call, CallOutcome } from "../types/voice.js";
import type { Task } from "../types/task.js";
import type { ApprovalRequest } from "../types/approval.js";

export interface CallCompletionSummary {
  messageId: string;
  taskId?: string;
  approvalRequestId?: string;
  memoryId?: string;
  auditEntryId: string;
}

export class CallLifecycleManager {
  constructor(private readonly store: WorkspaceStore) {}

  /**
   * Handles call completion and dispatches all governed workspace artifacts.
   */
  async handleCallCompleted(call: Call): Promise<CallCompletionSummary> {
    const callerParticipant = call.participants.find(p => p.role === "caller");
    const callerPhone = callerParticipant?.phoneNumber || "Unknown number";
    const duration = call.durationSeconds ? `${call.durationSeconds}s` : "Unknown duration";
    const disposition = call.outcome?.disposition || "completed";

    // 1. Post rich summary message to canonical channel
    const summaryLines = [
      `📞 **Voice Call Completed** (\`${call.id}\`)`,
      `- **Provider:** ${call.provider}`,
      `- **Direction:** ${call.direction.toUpperCase()}`,
      `- **Counterparty:** ${callerPhone}`,
      `- **Duration:** ${duration}`,
      `- **Disposition:** ${disposition}`,
    ];

    if (call.outcome?.summary) {
      summaryLines.push(`- **Summary:** ${call.outcome.summary}`);
    }

    if (call.outcome?.extractedCommitments && call.outcome.extractedCommitments.length > 0) {
      summaryLines.push(`- **Commitments / Action Items:**`);
      for (const commitment of call.outcome.extractedCommitments) {
        summaryLines.push(`  - ${commitment}`);
      }
    }

    if (call.recording?.url) {
      summaryLines.push(`- **Recording:** [Listen](${call.recording.url})`);
    }

    const message = this.store.createMessage({
      channelId: call.canonicalChannelId || "chan-calls",
      authorId: call.agentId || "system-voice",
      authorType: "agent",
      content: summaryLines.join("\n"),
    });

    let createdTask: Task | undefined;
    let createdApproval: ApprovalRequest | undefined;
    let memoryId: string | undefined;

    // 2. Governed Task Generation from Commitments / Follow-ups
    const hasFollowUp = disposition === "follow_up_requested" || (call.outcome?.extractedCommitments && call.outcome.extractedCommitments.length > 0);
    if (hasFollowUp) {
      const taskTitle = `Follow-up: Voice call with ${callerPhone}`;
      const taskDescription = call.outcome?.summary
        ? `Follow-up on call commitments:\n${call.outcome.extractedCommitments?.join("\n") || call.outcome.summary}`
        : `Complete follow-up items for call ${call.id}`;

      createdTask = this.store.createTask({
        title: taskTitle,
        description: taskDescription,
        priority: "medium",
        status: "ready",
        assignedAgentId: call.agentId,
        originChannelId: call.canonicalChannelId,
      });
    }

    // 3. Human Approval Gate for High-Risk or Ambiguous Calls
    if (call.outcome?.requiresHumanReview) {
      createdApproval = this.store.createApproval({
        taskId: createdTask?.id || "voice-review",
        requesterAgentId: call.agentId,
        action: `Review Call Outcome: ${callerPhone}`,
        description: `Voice call ${call.id} flagged for human review. Disposition: ${disposition}. Summary: ${call.outcome?.summary || "No summary"}`,
        risk: "medium",
      });
    }

    // 4. Ingest into Durable Operational Memory (Section 35)
    if (call.transcript?.fullText) {
      memoryId = `mem-call-${call.id.slice(0, 16)}`;
      this.store.saveOperationalMemory({
        id: memoryId,
        namespace: "voice_calls",
        category: "general_fact",
        title: `Voice Call: ${callerPhone} (${disposition})`,
        content: `Call ID: ${call.id}\nCaller: ${callerPhone}\nDuration: ${duration}\nDisposition: ${disposition}\nSummary: ${call.outcome?.summary || ""}\nTranscript: ${call.transcript.fullText}`,
        tags: ["voice", disposition, callerPhone],
        metadata: {
          callId: call.id,
          agentId: call.agentId,
          disposition,
          callerPhone,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Durable Audit Trail Record
    const audit = this.store.recordAudit({
      origin: "system",
      actorId: call.agentId || "voice_subsystem",
      actorType: "agent",
      action: "CALL_COMPLETED",
      targetType: "call",
      targetId: call.id,
      details: {
        provider: call.provider,
        direction: call.direction,
        durationSeconds: call.durationSeconds,
        disposition,
        hasTask: Boolean(createdTask),
        hasApproval: Boolean(createdApproval),
        hasMemory: Boolean(memoryId),
      },
    });

    return {
      messageId: message.id,
      taskId: createdTask?.id,
      approvalRequestId: createdApproval?.id,
      memoryId,
      auditEntryId: audit.id,
    };
  }
}
