import type { WorkspaceStore } from "../store/workspaceStore.js";

export type NaturalCommand = { command: string; args: string[] } | { clarification: string };

/** Conservative phrasing bridge to the existing authenticated command handlers. */
export function resolveNaturalCommand(text: string, store: WorkspaceStore): NaturalCommand | undefined {
  const query = text.trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  if (/^(?:show|list|tell me|what are|what's) (?:me )?(?:all )?(?:the |my )?(?:current |open |in-progress )?tasks$/i.test(query)) {
    return { command: "/tasks", args: [] };
  }
  if (/^(?:show|list|who are|what are) (?:me )?(?:the |my )?(?:active )?(?:agents|teammates)$/i.test(query)) {
    return { command: "/agents", args: [] };
  }
  if (/^(?:show|list|what are|what needs) (?:me )?(?:the |my )?(?:pending )?approvals?(?: from me)?$/i.test(query)) {
    return { command: "/approvals", args: [] };
  }
  const taskAction = query.match(/^(pause|cancel|resume|retry) (?:the )?task (?:named |called )?(.+)$/i);
  if (!taskAction) return undefined;
  const action = taskAction[1].toLowerCase();
  const reference = taskAction[2].trim();
  const tasks = store.listTasks();
  const byId = tasks.find(task => task.id.toLowerCase() === reference.toLowerCase());
  const titleMatches = tasks.filter(task => task.title.toLowerCase() === reference.toLowerCase());
  const target = byId || (titleMatches.length === 1 ? titleMatches[0] : undefined);
  if (!target) {
    return { clarification: titleMatches.length > 1
      ? `I found multiple tasks named "${reference}". Please use the task ID so I don't change the wrong one.`
      : `I couldn't find a task named "${reference}". Ask me to list tasks, then use its exact title or ID.` };
  }
  return { command: `/${action}`, args: [target.id] };
}
