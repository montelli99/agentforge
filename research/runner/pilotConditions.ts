export type PilotCondition = "B0" | "B1" | "AF";
export function conditionInstruction(condition: PilotCondition): string {
  switch (condition) {
    case "B0": return "Baseline B0: use only the current task message; do not assume prior history or summaries.";
    case "B1": return "Baseline B1: use the supplied rolling-summary context as the only retained history; do not invent facts.";
    case "AF": return "AgentForge AF: use governed context, preserve evidence boundaries, and do not claim completion without evidence.";
  }
}
export function buildPilotPrompt(condition: PilotCondition, task: string): string {
  const summary = condition === "B1" ? "Bounded rolling summary (synthetic): preserve only prior constraints explicitly present; no hidden evaluator answers." : "";
  return `${conditionInstruction(condition)}\n${summary}\nSynthetic research task: ${task}\nReturn a concise answer. Do not perform external actions.`;
}
