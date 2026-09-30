import type { WorkspaceStore } from "../store/workspaceStore.js";
import { productFallbackFor } from "./productKnowledge.js";

/** Free, immediate answers for bounded workspace questions. No model or tool call. */
export function localChannelReply(text: string, store: WorkspaceStore): string | undefined {
  const query = text.trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  if (/^(hi|hello|hey)( agentforge)?$/.test(query)) {
    return "Hi. I can help with workspace status, tasks, approvals, and planning. What would you like to check?";
  }
  if (/^(what can (you|agentforge) (help me )?do( today)?|help)$/.test(query)) {
    return "I can show your AgentForge workspace status, tasks, and pending approvals here. A configured model can also help discuss and draft plans. This chat cannot execute tools or change your projects; governed tasks use the workspace approval flow.";
  }
  if (/^(status|what('?s| is) the (workspace )?status|how('?s| is) the workspace doing)$/.test(query)) {
    return `Workspace status: ${store.listAgents().length} agents, ${store.listTasks("in_progress").length} tasks in progress, and ${store.listApprovals("pending").length} pending approvals.`;
  }
  if (/^(show|list|what are)( my| the)? tasks$/.test(query)) {
    const tasks = store.listTasks();
    return tasks.length ? `Tasks (${tasks.length}):\n${tasks.slice(0, 8).map(task => `• ${task.title} — ${task.status}`).join("\n")}` : "There are no tasks in this workspace yet.";
  }
  if (/^(show|list|what are)( my| the)? (pending )?approvals$/.test(query)) {
    const approvals = store.listApprovals("pending");
    return approvals.length ? `Pending approvals (${approvals.length}):\n${approvals.slice(0, 8).map(approval => `• ${approval.action} — task ${approval.taskId}`).join("\n")}` : "There are no pending approvals.";
  }
  return productFallbackFor(text);
}
