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
      sourceUri: current.sourceUri,
      rawContent: updatedRawContent,
    });
    return this.compareProcesses(current, updated);
  }

  compareProcesses(current: ProcessDefinition, updated: ProcessDefinition): ProcessDiff {
    const oldSteps = current.steps;
    const newSteps = updated.steps;
    if (oldSteps.length * newSteps.length > 1_000_000) {
      throw new RangeError("Process diff exceeds the safe step-comparison limit; reduce the document size before comparing revisions.");
    }
    const lcs = Array.from({ length: oldSteps.length + 1 }, () => Array<number>(newSteps.length + 1).fill(0));
    for (let oldIndex = oldSteps.length - 1; oldIndex >= 0; oldIndex--) {
      for (let newIndex = newSteps.length - 1; newIndex >= 0; newIndex--) {
        lcs[oldIndex][newIndex] = oldSteps[oldIndex].instruction === newSteps[newIndex].instruction
          ? lcs[oldIndex + 1][newIndex + 1] + 1
          : Math.max(lcs[oldIndex + 1][newIndex], lcs[oldIndex][newIndex + 1]);
      }
    }
    const exactMatches: Array<[number, number]> = [];
    for (let oldIndex = 0, newIndex = 0; oldIndex < oldSteps.length && newIndex < newSteps.length;) {
      if (oldSteps[oldIndex].instruction === newSteps[newIndex].instruction) {
        exactMatches.push([oldIndex++, newIndex++]);
      } else if (lcs[oldIndex + 1][newIndex] >= lcs[oldIndex][newIndex + 1]) {
        oldIndex++;
      } else {
        newIndex++;
      }
    }

    const pairs: Array<{ oldIndex: number; newIndex: number; modified: boolean }> = [];
    let oldCursor = 0;
    let newCursor = 0;
    for (const [matchedOld, matchedNew] of [...exactMatches, [oldSteps.length, newSteps.length] as [number, number]]) {
      const pairedCount = Math.min(matchedOld - oldCursor, matchedNew - newCursor);
      for (let offset = 0; offset < pairedCount; offset++) {
        pairs.push({ oldIndex: oldCursor + offset, newIndex: newCursor + offset, modified: true });
      }
      if (matchedOld < oldSteps.length) pairs.push({ oldIndex: matchedOld, newIndex: matchedNew, modified: false });
      oldCursor = matchedOld + 1;
      newCursor = matchedNew + 1;
    }

    const matchedOldIndexes = new Set(pairs.map(pair => pair.oldIndex));
    const matchedNewIndexes = new Set(pairs.map(pair => pair.newIndex));
    const addedSteps = newSteps.filter((_, index) => !matchedNewIndexes.has(index));
    const deletedSteps = oldSteps.filter((_, index) => !matchedOldIndexes.has(index));
    const modifiedSteps: ProcessDiff["modifiedSteps"] = [];

    for (const pair of pairs) {
      if (!pair.modified) continue;
      const previous = oldSteps[pair.oldIndex];
      const step = newSteps[pair.newIndex];
      const changes: Record<string, unknown> = {};
      for (const key of ["sequence", "title", "instruction", "toolRequirements", "permissionsRequired", "expectedEvidence", "decisionPoint", "exceptionHandler"] as const) {
        if (JSON.stringify(previous[key] ?? null) !== JSON.stringify(step[key] ?? null)) {
          changes[key] = { previous: previous[key] ?? null, updated: step[key] ?? null };
        }
      }
      if (Object.keys(changes).length > 0) modifiedSteps.push({ stepId: step.id, changes });
    }

    const ruleKey = (rule: UnresolvedBusinessRule) => `${rule.stepId}\u0000${rule.question}\u0000${rule.severity}`;
    const previousRuleKeys = new Set(current.unresolvedRules.map(ruleKey));
    const newUnresolvedRules = updated.unresolvedRules
      .filter(rule => !previousRuleKeys.has(ruleKey(rule)))
      .map(rule => ({ ...rule, processId: current.id }));

    return {
      processId: current.id,
      previousVersion: current.version,
      newVersion: current.version + 1,
      addedSteps,
      modifiedSteps,
      deletedStepIds: deletedSteps.map(s => s.id),
      newUnresolvedRules,
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
