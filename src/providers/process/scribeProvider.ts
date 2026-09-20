/**
 * Scribe Process Knowledge Provider
 * Section 9 & 10: Scribe Reference Provider
 * Ingests and parses Scribe SOPs, Markdown, and structured step guides.
 */

import crypto from "node:crypto";
import type { ProcessKnowledgeProvider, ProcessIngestOptions } from "../../core/providers/process.js";
import type { ProcessDefinition, ProcessStep, ProcessDiff, UnresolvedBusinessRule } from "../../core/types/process.js";

export class ScribeProcessProvider implements ProcessKnowledgeProvider {
  readonly id = "scribe";
  readonly name = "Scribe Process Knowledge Provider";

  async ingest(options: ProcessIngestOptions): Promise<ProcessDefinition> {
    const raw = options.rawContent || "";
    const lines = raw.split("\n");
    const steps: ProcessStep[] = [];
    const unresolvedRules: UnresolvedBusinessRule[] = [];

    const processId = `proc-${crypto.randomUUID().slice(0, 8)}`;
    let currentTitle = "Untitled Process";
    let stepSeq = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("# ") && currentTitle === "Untitled Process") {
        currentTitle = line.slice(2).trim();
      } else if (line.match(/^(\d+\.|-|\*)\s+/)) {
        const stepText = line.replace(/^(\d+\.|-|\*)\s+/, "");
        const stepId = `step-${stepSeq}`;

        const lower = stepText.toLowerCase();
        const isDecision = lower.includes("if ") || stepText.includes("?");
        const isDangerous =
          lower.includes("delete") ||
          lower.includes("deploy") ||
          lower.includes("exfiltrate") ||
          lower.includes("send bulk") ||
          lower.includes("drop") ||
          lower.includes("truncate") ||
          lower.includes("destroy");

        const step: ProcessStep = {
          id: stepId,
          sequence: stepSeq,
          title: stepText.slice(0, 60),
          instruction: stepText,
          toolRequirements: [],
          permissionsRequired: [],
        };

        if (lower.includes("crm") || lower.includes("database")) {
          step.toolRequirements?.push("crm_client");
          step.permissionsRequired?.push("crm:write");
        }

        if (isDecision) {
          step.decisionPoint = {
            id: `dec-${stepSeq}`,
            question: stepText,
            condition: "Evaluation required",
            branches: [
              { label: "Yes", targetStepId: `step-${stepSeq + 1}` },
              { label: "No", targetStepId: `step-${stepSeq + 2}` },
            ],
            requiresHumanReview: true,
          };
        }

        if (isDecision || isDangerous) {
          unresolvedRules.push({
            id: `rule-${crypto.randomUUID().slice(0, 8)}`,
            processId,
            stepId,
            stepText,
            question: isDangerous
              ? `What explicit business authority permits destructive/external action: "${stepText}"?`
              : `What specific criteria govern: "${stepText}"?`,
            description: isDangerous
              ? "SOP describes destructive or external action without verified business authority."
              : "SOP shows action, but missing deterministic rule for autonomous agent execution.",
            severity: "blocker",
            resolved: false,
          });
        }

        steps.push(step);
        stepSeq++;
      }
    }

    if (steps.length === 0) {
      steps.push({
        id: "step-1",
        sequence: 1,
        title: "Default Action Step",
        instruction: raw || "Process step instruction",
      });
    }

    return {
      id: processId,
      title: currentTitle,
      description: `Ingested from ${options.sourceType}`,
      sourceType: options.sourceType,
      sourceUri: options.sourceUri,
      version: 1,
      steps,
      inputs: [{ name: "leadData", type: "object", required: true }],
      outputs: [{ name: "qualificationStatus", type: "string" }],
      unresolvedRules,
      rawContent: raw,
      lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async detectDiff(current: ProcessDefinition, updatedRawContent: string): Promise<ProcessDiff> {
    const updated = await this.ingest({
      sourceType: current.sourceType,
      rawContent: updatedRawContent,
    });

    const addedSteps = updated.steps.filter(
      us => !current.steps.some(cs => cs.instruction === us.instruction)
    );
    const deletedSteps = current.steps.filter(
      cs => !updated.steps.some(us => us.instruction === cs.instruction)
    );

    return {
      processId: current.id,
      previousVersion: current.version,
      newVersion: current.version + 1,
      addedSteps,
      modifiedSteps: [],
      deletedStepIds: deletedSteps.map(s => s.id),
      newUnresolvedRules: updated.unresolvedRules,
      affectedAgentIds: [],
      detectedAt: new Date().toISOString(),
    };
  }

  exportToMarkdown(process: ProcessDefinition): string {
    const lines: string[] = [];
    lines.push(`# ${process.title}`);
    lines.push("");
    lines.push(`*Source: ${process.sourceType} | Version: ${process.version}*`);
    lines.push("");
    for (const step of process.steps) {
      lines.push(`${step.sequence}. **${step.title}**: ${step.instruction}`);
      if (step.decisionPoint) {
        lines.push(`   - *Decision:* ${step.decisionPoint.question}`);
      }
    }
    return lines.join("\n");
  }
}
