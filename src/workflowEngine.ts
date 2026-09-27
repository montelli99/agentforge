import crypto from "node:crypto";
import { CompletionEngine } from "./core/completion/completionEngine.js";
import { ProcessCompiler } from "./providers/process/processCompiler.js";
import type { ProcessDefinition } from "./core/types/process.js";
import type { RequirementTraceabilityUpdate, SubstantialTaskSession } from "./core/completion/completionEngine.js";

/** Public, domain-neutral workflow facade for stages, evidence, and recovery. */
export class WorkflowEngine {
  constructor(
    private readonly compiler = new ProcessCompiler(),
    private readonly completion = new CompletionEngine(),
  ) {}

  inspect(process: ProcessDefinition) {
    const specification = this.compiler.compile(process);
    return {
      processId: process.id,
      processVersion: process.version,
      specification,
      unresolvedRules: process.unresolvedRules.filter(rule => !rule.resolved),
      canExecute: specification.suggestedExecutionContract.authority.productionWrite === false && !specification.unresolvedRules.some(rule => !rule.resolved && rule.severity === "blocker"),
    };
  }

  beginGoal(goal: string, submittedBy = "workflow-engine") {
    return this.completion.initializeSession(`workflow-${crypto.randomUUID()}`, goal, submittedBy);
  }

  getSession(taskId: string): SubstantialTaskSession | undefined { return this.completion.getSession(taskId); }
  startGoal(taskId: string): SubstantialTaskSession { return this.completion.startExecution(taskId); }
  recordTraceability(taskId: string, requirementId: string, update: RequirementTraceabilityUpdate): SubstantialTaskSession {
    return this.completion.recordRequirementTraceability(taskId, requirementId, update);
  }
}
